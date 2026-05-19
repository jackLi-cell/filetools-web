import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function recordToolUsage(toolSlug: string, success: boolean, processTimeMs: number, creditsCost: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    await prisma.$transaction(async (tx) => {
      await tx.toolDailyStat.upsert({
        where: { date_toolSlug: { date: today, toolSlug } },
        update: {
          useCount: { increment: 1 },
          successCount: { increment: success ? 1 : 0 },
          failCount: { increment: success ? 0 : 1 },
          creditsConsumed: { increment: creditsCost },
        },
        create: {
          date: today,
          toolSlug,
          useCount: 1,
          successCount: success ? 1 : 0,
          failCount: success ? 0 : 1,
          creditsConsumed: creditsCost,
          avgProcessMs: processTimeMs,
        },
      })

      const current = await tx.toolDailyStat.findUnique({
        where: { date_toolSlug: { date: today, toolSlug } },
        select: { id: true, useCount: true, avgProcessMs: true },
      })
      if (current) {
        const previousUseCount = Math.max(current.useCount - 1, 0)
        const avgProcessMs = Math.round(
          (current.avgProcessMs * previousUseCount + processTimeMs) / current.useCount,
        )
        await tx.toolDailyStat.update({
          where: { id: current.id },
          data: { avgProcessMs },
        })
      }
    })

    await prisma.dailyStat.upsert({
      where: { date: today },
      update: {
        totalTasks: { increment: 1 },
        successTasks: { increment: success ? 1 : 0 },
        creditsSpent: { increment: creditsCost },
      },
      create: {
        date: today,
        totalTasks: 1,
        successTasks: success ? 1 : 0,
        creditsSpent: creditsCost,
      },
    })
  } catch (err) {
    console.error("[Stats] Failed to record usage:", err)
  }
}
