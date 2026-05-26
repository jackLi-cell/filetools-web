import { randomUUID } from "crypto"
import { PrismaClient } from "@prisma/client"
import { processQueue } from "../config/queue.js"
import { validateFileParams } from "../middleware/upload-validate.js"
import { deductTaskCredits, refundTaskCredits } from "./credits.js"

const prisma = new PrismaClient()

export interface ProcessInputFile {
  fileKey: string
  fileName: string
  fileSize: number
  contentType?: string
}

export interface SubmitProcessTaskParams {
  toolSlug: string
  files: ProcessInputFile[]
  params?: Record<string, unknown>
  userId?: number
  ipAddress?: string
}

export interface SubmitProcessTaskResult {
  taskId: string
  toolSlug: string
  creditsCost: number
  inputFileName: string
  fileCount: number
  expiresAt: Date
}

export class ProcessTaskError extends Error {
  public status: number
  public code: number

  constructor(status: number, message: string, code = status) {
    super(message)
    this.name = "ProcessTaskError"
    this.status = status
    this.code = code
  }
}

export const MULTI_FILE_TOOLS = new Set(["pdf-merge", "image-to-pdf"])

export function sanitizeFileName(fileName: string): string {
  const normalized = fileName
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\\/]+/g, "_")
    .replace(/\.\.+/g, ".")
    .trim()
  const base = normalized.split(/[\\/]/).pop() || "upload"
  const safe = base.replace(/[^\p{L}\p{N}._ -]/gu, "_").replace(/^\.+/, "").slice(0, 120)
  return safe || "upload"
}

export function fileKeyBelongsToTool(fileKey: string, toolSlug: string): boolean {
  return fileKey.startsWith(`uploads/${toolSlug}/`) && !fileKey.includes("..")
}

function buildInsufficientBalanceMessage(required: number, current: number): string {
  return `余额不足，请先充值后再试（需要 ${required} 积分，当前 ${current}）`
}

export async function submitProcessTask({
  toolSlug,
  files,
  params,
  userId,
  ipAddress,
}: SubmitProcessTaskParams): Promise<SubmitProcessTaskResult> {
  if (files.length === 0) {
    throw new ProcessTaskError(400, "缺少待处理文件")
  }

  const tool = await prisma.toolConfig.findUnique({ where: { toolSlug } })
  if (!tool || !tool.enabled) {
    throw new ProcessTaskError(404, "工具不存在")
  }

  if (files.length > 1 && !MULTI_FILE_TOOLS.has(toolSlug)) {
    throw new ProcessTaskError(400, "该工具暂不支持多文件上传")
  }
  if (toolSlug === "pdf-merge" && files.length < 2) {
    throw new ProcessTaskError(400, "PDF 合并至少需要 2 个 PDF 文件")
  }

  const inputFiles = files.map((file) => ({
    fileKey: file.fileKey,
    fileName: sanitizeFileName(file.fileName),
    fileSize: file.fileSize,
    contentType: file.contentType,
  }))

  let totalSize = 0
  for (const inputFile of inputFiles) {
    if (!fileKeyBelongsToTool(inputFile.fileKey, toolSlug)) {
      throw new ProcessTaskError(400, "文件上传凭证与工具不匹配")
    }
    const fileValidationError = validateFileParams(
      inputFile.fileName,
      inputFile.contentType || "application/octet-stream",
      inputFile.fileSize,
      tool.maxFileSizeMb,
    )
    if (fileValidationError) {
      throw new ProcessTaskError(400, fileValidationError)
    }
    totalSize += inputFile.fileSize
  }

  const categoryPaymentSetting = await prisma.categoryPaymentSetting.findUnique({
    where: { category: tool.category },
  })
  const paidEnabled = categoryPaymentSetting?.paidEnabled === true
  const effectiveCreditsCost = paidEnabled && !tool.isFree ? tool.creditsCost : 0

  let currentUser: { id: number; credits: number } | null = null
  if (typeof userId === "number") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, credits: true, status: true },
    })
    if (user && user.status !== "banned") {
      currentUser = { id: user.id, credits: user.credits }
    }
  }

  if (effectiveCreditsCost > 0 && !currentUser) {
    throw new ProcessTaskError(401, "该工具需要登录后使用")
  }

  if (effectiveCreditsCost > 0 && currentUser && currentUser.credits < effectiveCreditsCost) {
    throw new ProcessTaskError(402, buildInsufficientBalanceMessage(effectiveCreditsCost, currentUser.credits))
  }

  const taskId = randomUUID()
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const inputFileName = inputFiles.length === 1 ? inputFiles[0]!.fileName : `${inputFiles.length} files`
  const taskParams = {
    ...((params as Record<string, unknown> | undefined) || {}),
    __inputFiles: inputFiles.map((file) => ({ fileKey: file.fileKey, fileName: file.fileName })),
  }

  await prisma.processTask.create({
    data: {
      id: taskId,
      toolSlug,
      status: "pending",
      inputFileKey: inputFiles[0]!.fileKey,
      inputFileName,
      inputFileSize: BigInt(totalSize),
      params: taskParams as any,
      userId: currentUser?.id,
      creditsCost: effectiveCreditsCost,
      ipAddress: ipAddress || "unknown",
      expiresAt,
    },
  })

  if (currentUser && effectiveCreditsCost > 0) {
    try {
      await deductTaskCredits(prisma, {
        userId: currentUser.id,
        toolSlug,
        taskId,
        amount: effectiveCreditsCost,
      })
    } catch (error) {
      await prisma.processTask.update({
        where: { id: taskId },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "积分扣除失败",
          completedAt: new Date(),
        },
      })
      const message =
        error instanceof Error && /积分不足|余额不足/.test(error.message)
          ? buildInsufficientBalanceMessage(effectiveCreditsCost, currentUser?.credits ?? 0)
          : error instanceof Error
            ? error.message
            : "积分扣除失败"
      throw new ProcessTaskError(402, message)
    }
  }

  try {
    await processQueue.add(toolSlug, {
      taskId,
      toolSlug,
      inputFileKey: inputFiles[0]!.fileKey,
      inputFileName,
      inputFiles: inputFiles.map((file) => ({ fileKey: file.fileKey, fileName: file.fileName })),
      params: params || {},
    })
  } catch (error) {
    await prisma.$transaction(async (tx) => {
      await tx.processTask.update({
        where: { id: taskId },
        data: {
          status: "failed",
          errorMessage: "任务入队失败，请稍后重试",
          completedAt: new Date(),
        },
      })
      await refundTaskCredits(tx, taskId)
    })
    throw new ProcessTaskError(500, error instanceof Error ? error.message : "任务提交失败")
  }

  return {
    taskId,
    toolSlug,
    creditsCost: effectiveCreditsCost,
    inputFileName,
    fileCount: inputFiles.length,
    expiresAt,
  }
}
