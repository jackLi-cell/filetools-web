import { Prisma, PrismaClient } from "@prisma/client"

type RefundPrisma = PrismaClient | Prisma.TransactionClient

export async function deductTaskCredits(
  prisma: PrismaClient,
  params: {
    userId: number
    toolSlug: string
    taskId: string
    amount: number
  },
) {
  const { userId, toolSlug, taskId, amount } = params
  if (amount <= 0) return

  await prisma.$transaction(async (tx) => {
    const existingSpend = await tx.creditTransaction.findFirst({
      where: { taskId, source: "tool_use", type: "spend" },
      select: { id: true },
    })
    if (existingSpend) return

    const deduction = await tx.user.updateMany({
      where: {
        id: userId,
        credits: { gte: amount },
      },
      data: {
        credits: { decrement: amount },
        totalSpent: { increment: amount },
      },
    })
    if (deduction.count === 0) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      })
      if (!user) throw new Error("用户不存在")
      throw new Error(`余额不足（需要 ${amount} 积分，当前 ${user.credits}）`)
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    })
    if (!user) throw new Error("用户不存在")

    await tx.creditTransaction.create({
      data: {
        userId,
        type: "spend",
        amount: -amount,
        balanceAfter: user.credits,
        source: "tool_use",
        toolSlug,
        taskId,
        note: `使用 ${toolSlug} 扣除积分`,
      },
    })
  })
}

export async function refundTaskCredits(
  prisma: RefundPrisma,
  taskId: string,
  note = "任务处理失败，自动退还积分",
) {
  const run = async (tx: Prisma.TransactionClient) => {
    const task = await tx.processTask.findUnique({
      where: { id: taskId },
      select: { id: true, userId: true, toolSlug: true, creditsCost: true },
    })
    if (!task?.userId || task.creditsCost <= 0) return false

    const existingSpend = await tx.creditTransaction.findFirst({
      where: { taskId, source: "tool_use", type: "spend" },
      select: { id: true },
    })
    if (!existingSpend) return false

    const existingRefund = await tx.creditTransaction.findFirst({
      where: { taskId, source: "refund" },
      select: { id: true },
    })
    if (existingRefund) return false

    const refundResult = await tx.user.updateMany({
      where: { id: task.userId },
      data: {
        credits: { increment: task.creditsCost },
        totalSpent: { decrement: task.creditsCost },
      },
    })
    if (refundResult.count === 0) return false

    const user = await tx.user.findUnique({
      where: { id: task.userId },
      select: { credits: true },
    })
    if (!user) return false

    await tx.creditTransaction.create({
      data: {
        userId: task.userId,
        type: "refund",
        amount: task.creditsCost,
        balanceAfter: user.credits,
        source: "refund",
        toolSlug: task.toolSlug,
        taskId,
        note,
      },
    })
    return true
  }

  if ("$transaction" in prisma) {
    return prisma.$transaction((tx) => run(tx))
  }

  return run(prisma)
}
