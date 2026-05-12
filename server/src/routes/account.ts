import { Router, Request, Response } from "express"
import { PrismaClient } from "@prisma/client"
import { requireAuth } from "../middleware/auth.js"

const router = Router()
const prisma = new PrismaClient()

router.get("/profile", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, credits: true, totalEarned: true, totalSpent: true, consecutiveCheckin: true, createdAt: true },
  })
  res.json({ code: 0, data: user })
})

router.get("/credits", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = 20

  const [transactions, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.creditTransaction.count({ where: { userId } }),
  ])

  res.json({ code: 0, data: { transactions, total, page, totalPages: Math.ceil(total / limit) } })
})

router.get("/history", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = 20

  const [tasks, total] = await Promise.all([
    prisma.processTask.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, toolSlug: true, status: true, inputFileName: true, outputFileName: true, creditsCost: true, createdAt: true, completedAt: true },
    }),
    prisma.processTask.count({ where: { userId } }),
  ])

  res.json({ code: 0, data: { tasks, total, page, totalPages: Math.ceil(total / limit) } })
})

router.post("/checkin", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number
  const today = new Date().toISOString().slice(0, 10)

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) { res.status(404).json({ code: 404, message: "用户不存在" }); return }

  const lastCheckin = user.lastCheckinDate?.toISOString().slice(0, 10)
  if (lastCheckin === today) {
    res.status(400).json({ code: 400, message: "今日已签到" })
    return
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const isConsecutive = lastCheckin === yesterday
  const newStreak = isConsecutive ? user.consecutiveCheckin + 1 : 1

  let bonus = 5
  let note = "每日签到"
  if (newStreak === 7) {
    bonus += 20
    note = "连续签到 7 天额外奖励"
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        credits: { increment: bonus },
        totalEarned: { increment: bonus },
        lastCheckinDate: new Date(today),
        consecutiveCheckin: newStreak,
      },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        type: "earn",
        amount: bonus,
        balanceAfter: user.credits + bonus,
        source: newStreak === 7 ? "streak" : "checkin",
        note,
      },
    }),
  ])

  res.json({ code: 0, data: { bonus, streak: newStreak, credits: user.credits + bonus } })
})

export default router
