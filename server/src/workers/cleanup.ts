import { PrismaClient } from "@prisma/client"
import { deleteFile } from "../config/r2.js"

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
    select: { id: true, inputFileKey: true, outputFileKey: true },
    take: 100,
  })

  let cleaned = 0
  for (const task of expiredTasks) {
    try {
      if (task.outputFileKey) await deleteFile(task.outputFileKey)
      if (task.inputFileKey) await deleteFile(task.inputFileKey)
      await prisma.processTask.update({
        where: { id: task.id },
        data: { status: "expired", outputFileKey: null, inputFileKey: null },
      })
      cleaned++
    } catch (err) {
      console.error(`[Cleanup] Failed to clean task ${task.id}:`, err)
    }
  }

  const failedOld = await prisma.processTask.updateMany({
    where: {
      status: "pending",
      createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
    },
    data: { status: "failed", errorMessage: "任务超时" },
  })

  console.log(`[Cleanup] Cleaned ${cleaned} expired files, timed out ${failedOld.count} stale tasks`)
}

if (process.argv[1]?.includes("cleanup")) {
  cleanExpiredFiles().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
}
