import { PrismaClient } from "@prisma/client"
import { deleteFile, listFiles } from "../config/storage.js"
import { refundTaskCredits } from "../services/credits.js"

const prisma = new PrismaClient()

export async function cleanExpiredFiles() {
  const now = new Date()
  console.log(`[Cleanup] Starting expired file cleanup at ${now.toISOString()}`)

  const expiredTasks = await prisma.processTask.findMany({
    where: {
      expiresAt: { lt: now },
      status: "completed",
      outputFileKey: { not: null },
    },
    select: { id: true, inputFileKey: true, outputFileKey: true, params: true },
    take: 100,
  })

  let cleaned = 0
  for (const task of expiredTasks) {
    try {
      if (task.outputFileKey) await deleteFile(task.outputFileKey)
      const extraInputKeys = Array.isArray((task.params as any)?.__inputFiles)
        ? ((task.params as any).__inputFiles as Array<{ fileKey?: string }>).map((file) => file.fileKey).filter(Boolean)
        : []
      const inputKeys = Array.from(new Set([task.inputFileKey, ...extraInputKeys].filter(Boolean) as string[]))
      for (const key of inputKeys) await deleteFile(key)
      await prisma.processTask.update({
        where: { id: task.id },
        data: { status: "expired", outputFileKey: null, inputFileKey: null },
      })
      cleaned++
    } catch (err) {
      console.error(`[Cleanup] Failed to clean task ${task.id}:`, err)
    }
  }

  const staleTasks = await prisma.processTask.findMany({
    where: {
      status: { in: ["pending", "failed"] },
      createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
    },
    select: { id: true, status: true, inputFileKey: true, params: true },
    take: 100,
  })

  let staleCleaned = 0
  for (const task of staleTasks) {
    try {
      const extraInputKeys = Array.isArray((task.params as any)?.__inputFiles)
        ? ((task.params as any).__inputFiles as Array<{ fileKey?: string }>).map((file) => file.fileKey).filter(Boolean)
        : []
      const inputKeys = Array.from(new Set([task.inputFileKey, ...extraInputKeys].filter(Boolean) as string[]))
      for (const key of inputKeys) await deleteFile(key)
      await prisma.processTask.update({
        where: { id: task.id },
        data: {
          status: "failed",
          ...(task.status === "failed" ? {} : { errorMessage: "任务超时" }),
          inputFileKey: null,
        },
      })
      await refundTaskCredits(prisma, task.id, "任务超时，自动退还积分")
      staleCleaned++
    } catch (err) {
      console.error(`[Cleanup] Failed to clean stale task ${task.id}:`, err)
    }
  }

  const activeInputKeys = new Set<string>()
  const activeTasks = await prisma.processTask.findMany({
    where: {
      inputFileKey: { not: null },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { inputFileKey: true, params: true },
    take: 1000,
  })
  for (const task of activeTasks) {
    if (task.inputFileKey) activeInputKeys.add(task.inputFileKey)
    if (Array.isArray((task.params as any)?.__inputFiles)) {
      for (const file of (task.params as any).__inputFiles as Array<{ fileKey?: string }>) {
        if (file.fileKey) activeInputKeys.add(file.fileKey)
      }
    }
  }

  const uploadedFiles = await listFiles("uploads")
  const staleUploadCutoff = Date.now() - 2 * 60 * 60 * 1000
  let staleUploads = 0
  for (const file of uploadedFiles) {
    if (file.mtimeMs >= staleUploadCutoff || activeInputKeys.has(file.key)) continue
    try {
      await deleteFile(file.key)
      staleUploads++
    } catch (err) {
      console.error(`[Cleanup] Failed to clean stale upload ${file.key}:`, err)
    }
  }

  console.log(`[Cleanup] Cleaned ${cleaned} expired files, ${staleCleaned} stale task uploads, ${staleUploads} unsubmitted uploads`)
}

if (process.argv[1]?.includes("cleanup")) {
  cleanExpiredFiles().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
}
