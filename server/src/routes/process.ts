import { Router, Request, Response } from "express"
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "crypto"
import { z } from "zod"
import { createStorageReadStream, ensureStorageRoot, getDownloadUrl, getUploadUrl, getFileSize, writeBufferToStorage } from "../config/storage.js"
import { processQueue } from "../config/queue.js"
import { redis } from "../config/redis.js"
import { uploadLimiter } from "../middleware/rate-limit.js"
import { validateFileParams } from "../middleware/upload-validate.js"

const router = Router()
const prisma = new PrismaClient()

const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().positive().max(100 * 1024 * 1024),
  toolSlug: z.string().min(1),
})

function sanitizeFileName(fileName: string): string {
  const normalized = fileName
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\\/]+/g, "_")
    .replace(/\.\.+/g, ".")
    .trim()
  const base = normalized.split(/[\\/]/).pop() || "upload"
  const safe = base.replace(/[^\p{L}\p{N}._ -]/gu, "_").replace(/^\.+/, "").slice(0, 120)
  return safe || "upload"
}

function fileKeyBelongsToTool(fileKey: string, toolSlug: string): boolean {
  return fileKey.startsWith(`uploads/${toolSlug}/`) && !fileKey.includes("..")
}

function safeHeaderFileName(fileName: string): string {
  return sanitizeFileName(fileName).replace(/["\r\n]/g, "_")
}

function absoluteUrl(req: Request, value: string): string {
  if (/^https?:\/\//i.test(value)) return value
  return `${req.protocol}://${req.get("host")}${value}`
}

router.post("/upload", uploadLimiter, async (req: Request, res: Response) => {
  const parsed = uploadSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ code: 400, message: "参数错误", errors: parsed.error.flatten() })
    return
  }

  const { contentType, fileSize, toolSlug } = parsed.data
  const fileName = sanitizeFileName(parsed.data.fileName)

  const tool = await prisma.toolConfig.findUnique({ where: { toolSlug } })
  if (!tool || !tool.enabled) {
    res.status(404).json({ code: 404, message: "工具不存在" })
    return
  }

  const validationError = validateFileParams(fileName, contentType, fileSize, tool.maxFileSizeMb)
  if (validationError) {
    res.status(400).json({ code: 400, message: validationError })
    return
  }

  const key = `uploads/${toolSlug}/${randomUUID()}/${fileName}`
  const token = randomUUID()
  await redis.setex(`storage:upload:${key}`, 15 * 60, token)
  const uploadUrl = absoluteUrl(req, await getUploadUrl(key, token))

  res.json({ code: 0, data: { uploadUrl, fileKey: key } })
})

router.put("/upload-file/:encodedKey", uploadLimiter, async (req: Request, res: Response) => {
  const encodedKey = Array.isArray(req.params.encodedKey) ? req.params.encodedKey[0] : req.params.encodedKey
  const key = decodeURIComponent(encodedKey || "")
  const token = typeof req.query.token === "string" ? req.query.token : ""
  if (!key.startsWith("uploads/") || key.includes("..")) {
    res.status(400).json({ code: 400, message: "上传路径无效" })
    return
  }
  const tokenKey = `storage:upload:${key}`
  const expectedToken = await redis.get(tokenKey)
  if (!expectedToken || expectedToken !== token) {
    res.status(403).json({ code: 403, message: "上传凭证无效或已过期" })
    return
  }

  const chunks: Buffer[] = []
  let total = 0
  const maxBytes = 100 * 1024 * 1024

  req.on("data", (chunk: Buffer) => {
    total += chunk.length
    if (total > maxBytes) {
      req.destroy(new Error("文件超过 100MB 限制"))
      return
    }
    chunks.push(chunk)
  })

  req.on("end", async () => {
    try {
      await ensureStorageRoot()
      await writeBufferToStorage(key, Buffer.concat(chunks))
      await redis.del(tokenKey)
      res.json({ code: 0, data: { fileKey: key, fileSize: total } })
    } catch (error) {
      const message = error instanceof Error ? error.message : "上传失败"
      res.status(500).json({ code: 500, message })
    }
  })

  req.on("error", (error) => {
    const message = error instanceof Error ? error.message : "上传失败"
    if (!res.headersSent) res.status(400).json({ code: 400, message })
  })
})

const processSchema = z.object({
  fileKey: z.string().min(1),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().positive(),
  params: z.record(z.unknown()).optional(),
})

router.post("/:toolSlug", async (req: Request, res: Response) => {
  const toolSlug = req.params.toolSlug as string
  const parsed = processSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ code: 400, message: "参数错误" })
    return
  }

  const tool = await prisma.toolConfig.findUnique({ where: { toolSlug } })
  if (!tool || !tool.enabled) {
    res.status(404).json({ code: 404, message: "工具不存在" })
    return
  }
  const inputFileName = sanitizeFileName(parsed.data.fileName)
  if (!fileKeyBelongsToTool(parsed.data.fileKey, toolSlug)) {
    res.status(400).json({ code: 400, message: "文件上传凭证与工具不匹配" })
    return
  }
  const fileValidationError = validateFileParams(
    inputFileName,
    "application/octet-stream",
    parsed.data.fileSize,
    tool.maxFileSizeMb,
  )
  if (fileValidationError && !fileValidationError.startsWith("不支持的文件格式")) {
    res.status(400).json({ code: 400, message: fileValidationError })
    return
  }

  const ip = (req.ip || "unknown") as string
  const categoryPaymentSetting = await prisma.categoryPaymentSetting.findUnique({
    where: { category: tool.category },
  })
  const paidEnabled = categoryPaymentSetting?.paidEnabled === true
  const effectiveCreditsCost = paidEnabled && !tool.isFree ? tool.creditsCost : 0
  const effectiveDailyFreeAnonymous = paidEnabled ? tool.dailyFreeAnonymous : 0

  if (effectiveCreditsCost > 0 && effectiveDailyFreeAnonymous > 0) {
    const usageKey = `usage:anon:${ip}:${toolSlug}:${new Date().toISOString().slice(0, 10)}`
    const used = await redis.incr(usageKey)
    if (used === 1) await redis.expire(usageKey, 86400)
    if (used > effectiveDailyFreeAnonymous) {
      res.status(403).json({ code: 403, message: `今日免费次数已用完（${effectiveDailyFreeAnonymous} 次/天），请注册登录获取更多次数` })
      return
    }
  }

  const taskId = randomUUID()
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)

  await prisma.processTask.create({
    data: {
      id: taskId,
      toolSlug,
      status: "pending",
      inputFileKey: parsed.data.fileKey,
      inputFileName,
      inputFileSize: BigInt(parsed.data.fileSize),
      params: parsed.data.params as any || undefined,
      creditsCost: effectiveCreditsCost,
      ipAddress: ip,
      expiresAt,
    },
  })

  await processQueue.add(toolSlug, {
    taskId,
    toolSlug,
    inputFileKey: parsed.data.fileKey,
    inputFileName,
    params: parsed.data.params || {},
  })

  res.json({ code: 0, data: { taskId } })
})

router.get("/status/:taskId", async (req: Request, res: Response) => {
  const taskId = req.params.taskId as string
  const task = await prisma.processTask.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, outputFileName: true, outputFileSize: true, errorMessage: true, completedAt: true, createdAt: true },
  })

  if (!task) {
    res.status(404).json({ code: 404, message: "任务不存在" })
    return
  }

  res.json({ code: 0, data: task })
})

router.get("/download/:taskId", async (req: Request, res: Response) => {
  const taskId = req.params.taskId as string
  const task = await prisma.processTask.findUnique({ where: { id: taskId } })

  if (!task || task.status !== "completed" || !task.outputFileKey) {
    res.status(404).json({ code: 404, message: "文件不存在或未处理完成" })
    return
  }

  if (task.expiresAt && task.expiresAt < new Date()) {
    res.status(410).json({ code: 410, message: "文件已过期，请重新处理" })
    return
  }

  const downloadUrl = absoluteUrl(req, await getDownloadUrl(task.outputFileKey))
  res.json({ code: 0, data: { downloadUrl, fileName: task.outputFileName } })
})

router.get("/download-file/:encodedKey", async (req: Request, res: Response) => {
  const encodedKey = Array.isArray(req.params.encodedKey) ? req.params.encodedKey[0] : req.params.encodedKey
  const key = decodeURIComponent(encodedKey || "")
  const task = await prisma.processTask.findFirst({
    where: {
      outputFileKey: key,
      status: "completed",
    },
    select: {
      outputFileName: true,
      expiresAt: true,
    },
  })

  if (!task) {
    res.status(404).json({ code: 404, message: "文件不存在或未处理完成" })
    return
  }

  if (task.expiresAt && task.expiresAt < new Date()) {
    res.status(410).json({ code: 410, message: "文件已过期，请重新处理" })
    return
  }

  try {
    const fileName = safeHeaderFileName(task.outputFileName || "download")
    const encodedName = encodeURIComponent(fileName)
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"; filename*=UTF-8''${encodedName}`)
    res.setHeader("Content-Length", String(await getFileSize(key)))
    createStorageReadStream(key).pipe(res)
  } catch (error) {
    const message = error instanceof Error ? error.message : "下载失败"
    res.status(404).json({ code: 404, message })
  }
})

export default router
