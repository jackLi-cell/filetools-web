import { PrismaClient } from "@prisma/client"
import { env } from "../config/env.js"
import { decrypt } from "./ai-encryption.js"

/**
 * AI 上游管理器（Phase 2 版本：从 DB 读）
 *
 * 数据源：prisma.aiUpstream（按 priority asc 排序）
 * 故障切换：
 * - 跳过 failCount >= env.ai.upstreamFailThreshold && (now - healthyAt) < env.ai.upstreamCooldownMs
 * - 调用失败：failCount++、记 lastError、totalErrors++
 * - 调用成功：failCount=0、healthyAt=now、totalCalls++
 *
 * 缓存：60 秒（Map + ts，进程内）
 * Fallback：DB 为空但环境变量配置了 AI_API_KEY 时，仍可用 legacy 上游（便于本地开发）
 */

export interface Upstream {
  id: string  // "db:{numericId}" 或 "legacy"
  dbId: number | null
  name: string
  baseUrl: string
  apiKey: string  // 解密后的明文
  model: string
  visionModel: string | null
  priority: number
  enabled: boolean
  failCount: number
  healthyAt: Date | null
  lastError: string | null
}

const prisma = new PrismaClient()

const CACHE_TTL_MS = 60_000
let cache: { data: Upstream[]; ts: number } | null = null

// legacy stub 失败计数（仅当 DB 为空时使用）
const legacyState: { failCount: number; healthyAt: Date | null; lastError: string | null } = {
  failCount: 0,
  healthyAt: null,
  lastError: null,
}

export async function getUpstreams(): Promise<Upstream[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.data
  }

  let list: Upstream[] = []
  try {
    const rows = await prisma.aiUpstream.findMany({
      where: { enabled: true },
      orderBy: { priority: "asc" },
    })

    list = rows.map((r) => {
      let apiKey = ""
      try {
        apiKey = decrypt(r.apiKeyEnc)
      } catch (e) {
        console.warn(`[ai-upstream-manager] decrypt failed for upstream id=${r.id}:`, e instanceof Error ? e.message : e)
      }
      return {
        id: `db:${r.id}`,
        dbId: r.id,
        name: r.name,
        baseUrl: r.baseUrl,
        apiKey,
        model: r.model,
        visionModel: r.visionModel,
        priority: r.priority,
        enabled: r.enabled,
        failCount: r.failCount,
        healthyAt: r.healthyAt,
        lastError: r.lastError,
      }
    })
  } catch (e) {
    // DB 不可用：降级到 legacy 环境变量
    console.warn("[ai-upstream-manager] DB query failed, falling back to env legacy:", e instanceof Error ? e.message : e)
  }

  // 如果 DB 没有可用上游，且环境变量配置了 legacy，则补一条
  if (list.length === 0 && env.ai.legacyApiKey && env.ai.legacyBaseUrl) {
    list.push({
      id: "legacy",
      dbId: null,
      name: "legacy-env",
      baseUrl: env.ai.legacyBaseUrl,
      apiKey: env.ai.legacyApiKey,
      model: env.ai.legacyModel,
      visionModel: null,
      priority: 999,
      enabled: true,
      failCount: legacyState.failCount,
      healthyAt: legacyState.healthyAt,
      lastError: legacyState.lastError,
    })
  }

  cache = { data: list, ts: Date.now() }
  return list
}

export function isInCooldown(u: Upstream): boolean {
  if (u.failCount < env.ai.upstreamFailThreshold) return false
  if (!u.healthyAt) return true
  return Date.now() - u.healthyAt.getTime() < env.ai.upstreamCooldownMs
}

export async function markFail(id: string, error: unknown): Promise<void> {
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 500)
  if (id === "legacy") {
    legacyState.failCount += 1
    legacyState.lastError = message
    cache = null
    return
  }
  const dbId = parseDbId(id)
  if (dbId == null) return
  try {
    await prisma.aiUpstream.update({
      where: { id: dbId },
      data: {
        failCount: { increment: 1 },
        totalErrors: { increment: 1 },
        lastError: message,
      },
    })
  } catch (e) {
    console.warn("[ai-upstream-manager] markFail failed:", e instanceof Error ? e.message : e)
  } finally {
    cache = null
  }
}

export async function markSuccess(id: string): Promise<void> {
  if (id === "legacy") {
    legacyState.failCount = 0
    legacyState.healthyAt = new Date()
    legacyState.lastError = null
    cache = null
    return
  }
  const dbId = parseDbId(id)
  if (dbId == null) return
  try {
    await prisma.aiUpstream.update({
      where: { id: dbId },
      data: {
        failCount: 0,
        healthyAt: new Date(),
        totalCalls: { increment: 1 },
        lastError: null,
      },
    })
  } catch (e) {
    console.warn("[ai-upstream-manager] markSuccess failed:", e instanceof Error ? e.message : e)
  } finally {
    cache = null
  }
}

export async function getUpstreamSnapshot(): Promise<Array<{ name: string; healthy: boolean; failCount: number }>> {
  const list = await getUpstreams()
  return list.map((u) => ({
    name: u.name,
    healthy: u.enabled && !isInCooldown(u),
    failCount: u.failCount,
  }))
}

export function invalidateCache(): void {
  cache = null
}

function parseDbId(id: string): number | null {
  if (!id.startsWith("db:")) return null
  const n = Number(id.slice(3))
  return Number.isFinite(n) ? n : null
}
