import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function recordToolUsage(toolSlug: string, success: boolean, processTimeMs: number, creditsCost: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    const existing = await prisma.toolDailyStat.findFirst({
      where: { date: today, toolSlug },
    })

    if (existing) {
      const newUseCount = existing.useCount + 1
      const newSuccessCount = existing.successCount + (success ? 1 : 0)
      const newFailCount = existing.failCount + (success ? 0 : 1)
      const newCredits = existing.creditsConsumed + creditsCost
      const newAvgMs = Math.round(
        (existing.avgProcessMs * existing.useCount + processTimeMs) / newUseCount
      )

      await prisma.toolDailyStat.update({
        where: { id: existing.id },
        data: {
          useCount: newUseCount,
          successCount: newSuccessCount,
          failCount: newFailCount,
          creditsConsumed: newCredits,
          avgProcessMs: newAvgMs,
        },
      })
    } else {
      await prisma.toolDailyStat.create({
        data: {
          date: today,
          toolSlug,
          useCount: 1,
          successCount: success ? 1 : 0,
          failCount: success ? 0 : 1,
          creditsConsumed: creditsCost,
          avgProcessMs: processTimeMs,
        },
      })
    }

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
