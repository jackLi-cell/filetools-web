import { Router, type Request, type Response, type NextFunction } from "express"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"
import { requireAdmin } from "../../middleware/auth.js"
import { encrypt, decrypt, maskApiKey } from "../../services/ai-encryption.js"
import { invalidateCache as invalidateUpstreamCache } from "../../services/ai-upstream-manager.js"
import {
  getSystemPrompt,
  invalidateEnabledCache,
  invalidateSystemPromptCache,
  testUpstream,
} from "../../services/ai-service.js"

const router = Router()
const prisma = new PrismaClient()

// 包装 async route，把 promise reject 接到 next(err) 让 errorHandler 处理
function ar<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// 所有 admin/ai 路由都要管理员权限
router.use(requireAdmin)

// ============================================================
// 上游 CRUD
// ============================================================

const upstreamCreateSchema = z.object({
  name: z.string().min(1).max(50),
  baseUrl: z.string().url().max(500),
  apiKey: z.string().min(1).max(500),
  model: z.string().min(1).max(100),
  visionModel: z.string().max(100).optional().nullable(),
  priority: z.number().int().min(0).max(10000).default(100),
  enabled: z.boolean().default(true),
})

const upstreamUpdateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  baseUrl: z.string().url().max(500).optional(),
  apiKey: z.string().min(1).max(500).optional(),  // 留空时不动
  model: z.string().min(1).max(100).optional(),
  visionModel: z.string().max(100).optional().nullable(),
  priority: z.number().int().min(0).max(10000).optional(),
  enabled: z.boolean().optional(),
})

function serializeUpstream(row: {
  id: number
  name: string
  baseUrl: string
  apiKeyEnc: string
  model: string
  visionModel: string | null
  priority: number
  enabled: boolean
  healthyAt: Date | null
  lastError: string | null
  failCount: number
  totalCalls: number
  totalErrors: number
  createdAt: Date
  updatedAt: Date
}) {
  let masked = ""
  try {
    masked = maskApiKey(decrypt(row.apiKeyEnc))
  } catch {
    masked = "(decrypt failed)"
  }
  return {
    id: row.id,
    name: row.name,
    baseUrl: row.baseUrl,
    apiKeyMasked: masked,
    model: row.model,
    visionModel: row.visionModel,
    priority: row.priority,
    enabled: row.enabled,
    healthyAt: row.healthyAt,
    lastError: row.lastError,
    failCount: row.failCount,
    totalCalls: row.totalCalls,
    totalErrors: row.totalErrors,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

router.get("/upstreams", ar(async (_req: Request, res: Response) => {
  const rows = await prisma.aiUpstream.findMany({ orderBy: [{ priority: "asc" }, { id: "asc" }] })
  res.json({ code: 0, data: rows.map(serializeUpstream) })
}))

router.post("/upstreams", ar(async (req: Request, res: Response) => {
  const parsed = upstreamCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ code: 400, message: parsed.error.errors[0]?.message || "参数校验失败" })
    return
  }
  const { apiKey, ...rest } = parsed.data
  const created = await prisma.aiUpstream.create({
    data: {
      ...rest,
      apiKeyEnc: encrypt(apiKey),
    },
  })
  invalidateUpstreamCache()
  res.json({ code: 0, data: serializeUpstream(created) })
}))

router.patch("/upstreams/:id", ar(async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ code: 400, message: "无效的 ID" })
    return
  }
  const parsed = upstreamUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ code: 400, message: parsed.error.errors[0]?.message || "参数校验失败" })
    return
  }
  const exists = await prisma.aiUpstream.findUnique({ where: { id } })
  if (!exists) {
    res.status(404).json({ code: 404, message: "上游不存在" })
    return
  }
  const { apiKey, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }
  if (typeof apiKey === "string" && apiKey.length > 0) {
    data.apiKeyEnc = encrypt(apiKey)
  }
  const updated = await prisma.aiUpstream.update({ where: { id }, data })
  invalidateUpstreamCache()
  res.json({ code: 0, data: serializeUpstream(updated) })
}))

router.delete("/upstreams/:id", ar(async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ code: 400, message: "无效的 ID" })
    return
  }
  const exists = await prisma.aiUpstream.findUnique({ where: { id } })
  if (!exists) {
    res.status(404).json({ code: 404, message: "上游不存在" })
    return
  }
  await prisma.aiUpstream.delete({ where: { id } })
  invalidateUpstreamCache()
  res.json({ code: 0, message: "已删除" })
}))

/**
 * POST /upstreams/:id/test
 * 调用该上游做一次连通测试
 */
router.post("/upstreams/:id/test", ar(async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ code: 400, message: "无效的 ID" })
    return
  }
  const row = await prisma.aiUpstream.findUnique({ where: { id } })
  if (!row) {
    res.status(404).json({ code: 404, message: "上游不存在" })
    return
  }
  let apiKey = ""
  try {
    apiKey = decrypt(row.apiKeyEnc)
  } catch (e) {
    res.status(500).json({
      code: 500,
      message: `API Key 解密失败：${e instanceof Error ? e.message : String(e)}`,
    })
    return
  }
  const systemPrompt = await getSystemPrompt()
  const result = await testUpstream({
    baseUrl: row.baseUrl,
    apiKey,
    model: row.model,
    systemPrompt,
    prompt: "这是管理后台上游测试。请用一句中文回复：灵猫助手上游测试成功。",
  })
  res.json({ code: 0, data: result })
}))

// ============================================================
// 设置（key/value）
// ============================================================

router.get("/settings", ar(async (_req: Request, res: Response) => {
  const rows = await prisma.aiSetting.findMany({ orderBy: { key: "asc" } })
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value
  res.json({ code: 0, data: map })
}))

const settingsPatchSchema = z.record(z.string(), z.string())

router.patch("/settings", ar(async (req: Request, res: Response) => {
  const parsed = settingsPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ code: 400, message: "参数必须为 string → string 映射" })
    return
  }
  const entries = Object.entries(parsed.data)
  if (entries.length === 0) {
    res.status(400).json({ code: 400, message: "至少需要一项设置" })
    return
  }
  for (const [key, value] of entries) {
    if (key.length === 0 || key.length > 50) {
      res.status(400).json({ code: 400, message: `非法 key: ${key}` })
      return
    }
    await prisma.aiSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  }
  invalidateEnabledCache()
  invalidateSystemPromptCache()
  res.json({ code: 0, message: "已更新" })
}))

// ============================================================
// 用量统计
// ============================================================

router.get("/usage", ar(async (req: Request, res: Response) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 7))
  // 取 UTC 今天 0 点
  const today = new Date()
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const since = new Date(todayUtc.getTime() - (days - 1) * 86400000)

  const rows = await prisma.aiUsageDaily.findMany({
    where: { date: { gte: since } },
    orderBy: [{ date: "desc" }, { upstreamId: "asc" }],
  })

  const upstreams = await prisma.aiUpstream.findMany({ select: { id: true, name: true } })
  const upstreamNameById = new Map(upstreams.map((u) => [u.id, u.name]))

  // BigInt → string，方便前端处理
  const serialized = rows.map((r) => ({
    id: r.id,
    date: r.date.toISOString().slice(0, 10),
    upstreamId: r.upstreamId,
    upstreamName: r.upstreamId == null ? null : upstreamNameById.get(r.upstreamId) ?? null,
    totalCalls: r.totalCalls,
    totalErrors: r.totalErrors,
    anonCalls: r.anonCalls,
    authCalls: r.authCalls,
    totalDurMs: r.totalDurMs.toString(),
    inputTokens: r.inputTokens.toString(),
    outputTokens: r.outputTokens.toString(),
  }))

  // 聚合今日 summary
  const todayStr = todayUtc.toISOString().slice(0, 10)
  const todayRows = serialized.filter((r) => r.date === todayStr)
  const todayTotal = todayRows.reduce((s, r) => s + r.totalCalls, 0)
  const todayAnonymous = todayRows.reduce((s, r) => s + r.anonCalls, 0)
  const todayLoggedIn = todayRows.reduce((s, r) => s + r.authCalls, 0)
  const todayErrors = todayRows.reduce((s, r) => s + r.totalErrors, 0)
  const todayDurMs = todayRows.reduce((s, r) => s + Number(r.totalDurMs || 0), 0)
  const avgLatencyMs = todayTotal > 0 ? Math.round(todayDurMs / todayTotal) : 0
  const errorRate = todayTotal > 0 ? todayErrors / todayTotal : 0

  res.json({
    code: 0,
    data: {
      rows: serialized,
      summary: {
        todayTotal,
        todayAnonymous,
        todayLoggedIn,
        todayErrors,
        avgLatencyMs,
        errorRate,
      },
    },
  })
}))

export default router
