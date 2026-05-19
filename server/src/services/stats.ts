import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function recordToolUsage(toolSlug: string, success: boolean, processTimeMs: number, creditsCost: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const filter = { date: today, toolSlug }
  const uniqueWhere = { date_toolSlug: { date: today, toolSlug } }

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.toolDailyStat.updateMany({
        where: filter,
        data: {
          useCount: { increment: 1 },
          successCount: { increment: success ? 1 : 0 },
          failCount: { increment: success ? 0 : 1 },
          creditsConsumed: { increment: creditsCost },
        },
      })

      if (updated.count === 0) {
        try {
          await tx.toolDailyStat.create({
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
        } catch (error: unknown) {
          const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : ""
          if (code === "P2002") {
          await tx.toolDailyStat.updateMany({
              where: filter,
              data: {
                useCount: { increment: 1 },
                successCount: { increment: success ? 1 : 0 },
                failCount: { increment: success ? 0 : 1 },
                creditsConsumed: { increment: creditsCost },
              },
            })
          } else {
            throw error
          }
        }
      }

      const current = await tx.toolDailyStat.findUnique({
        where: uniqueWhere,
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

    const dailyUpdated = await prisma.dailyStat.updateMany({
      where: { date: today },
      data: {
        totalTasks: { increment: 1 },
        successTasks: { increment: success ? 1 : 0 },
        creditsSpent: { increment: creditsCost },
      },
    })
    if (dailyUpdated.count === 0) {
      try {
        await prisma.dailyStat.create({
          data: {
            date: today,
            totalTasks: 1,
            successTasks: success ? 1 : 0,
            creditsSpent: creditsCost,
          },
        })
      } catch (error: unknown) {
        const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : ""
        if (code === "P2002") {
          await prisma.dailyStat.updateMany({
            where: { date: today },
            data: {
              totalTasks: { increment: 1 },
              successTasks: { increment: success ? 1 : 0 },
              creditsSpent: { increment: creditsCost },
            },
          })
        } else {
          throw error
        }
      }
    }
  } catch (err) {
    console.error("[Stats] Failed to record usage:", err)
  }
}
