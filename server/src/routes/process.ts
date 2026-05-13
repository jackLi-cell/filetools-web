import { Router, Request, Response } from "express"
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "crypto"
import { z } from "zod"
import { getUploadUrl, getDownloadUrl } from "../config/r2.js"
import { processQueue } from "../config/queue.js"
import { redis } from "../config/redis.js"
import { uploadLimiter } from "../middleware/rate-limit.js"

const router = Router()
const prisma = new PrismaClient()

const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().positive().max(100 * 1024 * 1024),
  toolSlug: z.string().min(1),
})

router.post("/upload", uploadLimiter, async (req: Request, res: Response) => {
  const parsed = uploadSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ code: 400, message: "参数错误", errors: parsed.error.flatten() })
    return
  }

  const { fileName, contentType, fileSize, toolSlug } = parsed.data

  const tool = await prisma.toolConfig.findUnique({ where: { toolSlug } })
  if (!tool || !tool.enabled) {
    res.status(404).json({ code: 404, message: "工具不存在" })
    return
  }

  const maxSize = tool.maxFileSizeMb * 1024 * 1024
  if (fileSize > maxSize) {
    res.status(400).json({ code: 400, message: `文件大小超过限制（最大 ${tool.maxFileSizeMb}MB）` })
    return
  }

  const key = `uploads/${toolSlug}/${randomUUID()}/${fileName}`
  const uploadUrl = await getUploadUrl(key, contentType)

  res.json({ code: 0, data: { uploadUrl, fileKey: key } })
})

const processSchema = z.object({
  fileKey: z.string().min(1),
  fileName: z.string().min(1),
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
      inputFileName: parsed.data.fileName,
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
    inputFileName: parsed.data.fileName,
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

  const downloadUrl = await getDownloadUrl(task.outputFileKey)
  res.json({ code: 0, data: { downloadUrl, fileName: task.outputFileName } })
})

export default router
