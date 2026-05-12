import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function expireCredits() {
  const EXPIRE_DAYS = Number(process.env.CREDIT_EXPIRE_DAYS) || 90
  const cutoff = new Date(Date.now() - EXPIRE_DAYS * 86400000)

  console.log(`[CreditExpire] Checking credits earned before ${cutoff.toISOString()}`)

  // 找到过期的赠送积分流水（source 不是 recharge 的）
  const expiredTransactions = await prisma.creditTransaction.findMany({
    where: {
      type: "earn",
      source: { notIn: ["recharge"] },
      createdAt: { lt: cutoff },
    },
    select: { userId: true, amount: true },
  })

  // 按用户汇总过期积分
  const userExpired = new Map<number, number>()
  expiredTransactions.forEach(t => {
    userExpired.set(t.userId, (userExpired.get(t.userId) || 0) + t.amount)
  })

  let totalExpired = 0
  for (const [userId, expiredAmount] of userExpired) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.credits <= 0) continue

    // 只扣除实际余额中的过期部分（不能扣成负数）
    const actualDeduct = Math.min(expiredAmount, user.credits)
    if (actualDeduct <= 0) continue

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: actualDeduct } },
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          type: "spend",
          amount: -actualDeduct,
          balanceAfter: user.credits - actualDeduct,
          source: "expire",
          note: `赠送积分过期（${EXPIRE_DAYS} 天）`,
        },
      }),
    ])
    totalExpired += actualDeduct
  }

  console.log(`[CreditExpire] Expired ${totalExpired} credits from ${userExpired.size} users`)
}

if (process.argv[1]?.includes("credit-expire")) {
  expireCredits().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
}
