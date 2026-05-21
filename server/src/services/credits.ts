import { PrismaClient } from "@prisma/client"

type CreditPrisma = Pick<PrismaClient, "processTask" | "creditTransaction" | "user">

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
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    })
    if (!user) throw new Error("用户不存在")
    if (user.credits < amount) throw new Error("积分不足")

    const nextBalance = user.credits - amount
    await tx.user.update({
      where: { id: userId },
      data: {
        credits: nextBalance,
        totalSpent: { increment: amount },
      },
    })
    await tx.creditTransaction.create({
      data: {
        userId,
        type: "spend",
        amount: -amount,
        balanceAfter: nextBalance,
        source: "tool_use",
        toolSlug,
        taskId,
        note: `使用 ${toolSlug} 扣除积分`,
      },
    })
  })
}

export async function refundTaskCredits(
  prisma: CreditPrisma,
  taskId: string,
  note = "任务处理失败，自动退还积分",
) {
  const task = await prisma.processTask.findUnique({
    where: { id: taskId },
    select: { id: true, userId: true, toolSlug: true, creditsCost: true },
  })
  if (!task?.userId || task.creditsCost <= 0) return false

  const existingSpend = await prisma.creditTransaction.findFirst({
    where: { taskId, source: "tool_use", type: "spend" },
    select: { id: true },
  })
  if (!existingSpend) return false

  const existingRefund = await prisma.creditTransaction.findFirst({
    where: { taskId, source: "refund" },
    select: { id: true },
  })
  if (existingRefund) return false

  const user = await prisma.user.findUnique({
    where: { id: task.userId },
    select: { credits: true },
  })
  if (!user) return false

  const nextBalance = user.credits + task.creditsCost
  await prisma.user.update({
    where: { id: task.userId },
    data: {
      credits: nextBalance,
      totalSpent: { decrement: task.creditsCost },
    },
  })
  await prisma.creditTransaction.create({
    data: {
      userId: task.userId,
      type: "refund",
      amount: task.creditsCost,
      balanceAfter: nextBalance,
      source: "refund",
      toolSlug: task.toolSlug,
      taskId,
      note,
    },
  })
  return true
}
