import { Router, Request, Response } from "express"
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "crypto"
import { z } from "zod"
import { createStorageReadStream, ensureStorageRoot, getDownloadUrl, getUploadUrl, getFileSize, writeBufferToStorage } from "../config/storage.js"
import { redis } from "../config/redis.js"
import { uploadLimiter } from "../middleware/rate-limit.js"
import { validateFileParams } from "../middleware/upload-validate.js"
import {
  ProcessTaskError,
  sanitizeFileName,
  submitProcessTask,
} from "../services/process-task-service.js"

const router = Router()
const prisma = new PrismaClient()

const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().positive().max(100 * 1024 * 1024),
  toolSlug: z.string().min(1),
})

function asciiFallbackFileName(fileName: string): string {
  const clean = sanitizeFileName(fileName).replace(/["\r\n]/g, "_")
  const ascii = clean
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/[\\/%?*:|<>]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120)
  return ascii || "download"
}

function contentDisposition(fileName: string): string {
  const safeName = sanitizeFileName(fileName || "download")
  const fallback = asciiFallbackFileName(safeName)
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(safeName)}`
}

function absoluteUrl(req: Request, value: string): string {
  if (/^https?:\/\//i.test(value)) return value
  return `${req.protocol}://${req.get("host")}${value}`
}

async function getSessionUserId(req: Request): Promise<number | undefined> {
  const token = req.cookies?.session_token
  if (!token) return undefined

  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: { select: { id: true, status: true } } },
  })
  if (!session || session.expiresAt < new Date() || session.user.status === "banned") {
    if (session && session.expiresAt < new Date()) await prisma.session.delete({ where: { id: token } })
    return undefined
  }
  return session.user.id
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
  files: z.array(z.object({
    fileKey: z.string().min(1),
    fileName: z.string().min(1).max(255),
    fileSize: z.number().positive(),
  })).max(20).optional(),
  params: z.record(z.unknown()).optional(),
})

router.post("/:toolSlug", async (req: Request, res: Response) => {
  const toolSlug = req.params.toolSlug as string
  const parsed = processSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ code: 400, message: "参数错误" })
    return
  }

  const rawFiles = parsed.data.files?.length ? parsed.data.files : [{
    fileKey: parsed.data.fileKey,
    fileName: parsed.data.fileName,
    fileSize: parsed.data.fileSize,
  }]
  const files = rawFiles.map((file) => ({
    ...file,
    contentType: "application/octet-stream",
  }))

  const ip = (req.ip || "unknown") as string
  try {
    const userId = await getSessionUserId(req)
    const task = await submitProcessTask({
      toolSlug,
      files,
      params: parsed.data.params || {},
      userId,
      ipAddress: ip,
    })
    res.json({ code: 0, data: { taskId: task.taskId } })
  } catch (error) {
    if (error instanceof ProcessTaskError) {
      res.status(error.status).json({ code: error.code, message: error.message })
      return
    }
    const message = error instanceof Error ? error.message : "任务提交失败"
    res.status(500).json({ code: 500, message })
    return
  }
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

  res.json({
    code: 0,
    data: {
      ...task,
      outputFileSize: task.outputFileSize == null ? null : Number(task.outputFileSize),
    },
  })
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
    const fileName = task.outputFileName || "download"
    res.setHeader("Content-Disposition", contentDisposition(fileName))
    res.setHeader("Content-Length", String(await getFileSize(key)))
    createStorageReadStream(key).pipe(res)
  } catch (error) {
    const message = error instanceof Error ? error.message : "下载失败"
    res.status(404).json({ code: 404, message })
  }
})

export default router
