import { Router, Request, Response } from "express"
import { PrismaClient } from "@prisma/client"
import { requireAdmin } from "../middleware/auth.js"
import { redis } from "../config/redis.js"
import { processQueue } from "../config/queue.js"
import { ensureCategoryPaymentSettings } from "../services/category-payment.js"

const router = Router()
const prisma = new PrismaClient()

router.use(requireAdmin)

router.get("/stats/overview", async (_req: Request, res: Response) => {
  const today = new Date().toISOString().slice(0, 10)

  const [userCount, todayTasks, todayUsers, queueWaiting, queueActive] = await Promise.all([
    prisma.user.count(),
    prisma.processTask.count({ where: { createdAt: { gte: new Date(today) } } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(today) } } }),
    processQueue.getWaitingCount(),
    processQueue.getActiveCount(),
  ])

  res.json({
    code: 0,
    data: { userCount, todayTasks, todayUsers, queue: { waiting: queueWaiting, active: queueActive } },
  })
})

router.get("/stats/traffic", async (req: Request, res: Response) => {
  const days = Math.min(90, Number(req.query.days) || 30)
  const since = new Date(Date.now() - days * 86400000)

  const stats = await prisma.dailyStat.findMany({
    where: { date: { gte: since } },
    orderBy: { date: "asc" },
  })

  res.json({ code: 0, data: stats })
})

router.get("/stats/tools", async (req: Request, res: Response) => {
  const days = Math.min(90, Number(req.query.days) || 7)
  const since = new Date(Date.now() - days * 86400000)

  const stats = await prisma.toolDailyStat.findMany({
    where: { date: { gte: since } },
    orderBy: [{ date: "desc" }, { useCount: "desc" }],
  })

  res.json({ code: 0, data: stats })
})

router.get("/users", async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = 20
  const search = (req.query.search as string) || ""

  const where = search ? { email: { contains: search } } : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, email: true, name: true, role: true, credits: true, status: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ])

  res.json({ code: 0, data: { users, total, page, totalPages: Math.ceil(total / limit) } })
})

router.get("/users/:id", async (req: Request, res: Response) => {
  const userId = Number(req.params.id)
  if (!Number.isFinite(userId)) {
    res.status(400).json({ code: 400, message: "无效的用户 ID" })
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      name: true,
      role: true,
      credits: true,
      totalEarned: true,
      totalSpent: true,
      lastCheckinDate: true,
      consecutiveCheckin: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    res.status(404).json({ code: 404, message: "用户不存在" })
    return
  }

  const now = new Date()
  const [sessionCount, lastSession, taskSummary, recentTasks, recentCredits, orders] = await Promise.all([
    prisma.session.count({ where: { userId, expiresAt: { gt: now } } }),
    prisma.session.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
    }),
    prisma.processTask.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.processTask.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        toolSlug: true,
        status: true,
        inputFileName: true,
        outputFileName: true,
        creditsCost: true,
        errorMessage: true,
        createdAt: true,
        completedAt: true,
      },
    }),
    prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        source: true,
        toolSlug: true,
        note: true,
        createdAt: true,
      },
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        orderNo: true,
        packageName: true,
        creditsAmount: true,
        priceCents: true,
        paymentMethod: true,
        paymentChannel: true,
        paymentStatus: true,
        paidAt: true,
        createdAt: true,
      },
    }),
  ])

  res.json({
    code: 0,
    data: {
      user,
      sessions: { activeCount: sessionCount, last: lastSession },
      taskSummary: taskSummary.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = row._count._all
        return acc
      }, {}),
      recentTasks,
      recentCredits,
      orders,
    },
  })
})

router.put("/users/:id/credits", async (req: Request, res: Response) => {
  const userId = Number(req.params.id)
  const { amount, reason } = req.body as { amount: number; reason: string }

  if (!amount || !reason) {
    res.status(400).json({ code: 400, message: "请填写积分数量和原因" })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) { res.status(404).json({ code: 404, message: "用户不存在" }); return }

  const newBalance = user.credits + amount
  if (newBalance < 0) {
    res.status(400).json({ code: 400, message: "调整后余额不能为负数" })
    return
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        credits: newBalance,
        totalEarned: amount > 0 ? { increment: amount } : undefined,
        totalSpent: amount < 0 ? { increment: Math.abs(amount) } : undefined,
      },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        type: "admin",
        amount,
        balanceAfter: newBalance,
        source: "admin",
        note: reason,
      },
    }),
  ])

  res.json({ code: 0, data: { userId, newBalance } })
})

router.put("/users/:id/status", async (req: Request, res: Response) => {
  const userId = Number(req.params.id)
  const { status } = req.body as { status: "active" | "banned" }

  if (!["active", "banned"].includes(status)) {
    res.status(400).json({ code: 400, message: "无效的状态" })
    return
  }

  await prisma.user.update({ where: { id: userId }, data: { status } })

  if (status === "banned") {
    await prisma.session.deleteMany({ where: { userId } })
  }

  res.json({ code: 0, message: status === "banned" ? "已封禁" : "已解封" })
})

router.get("/tools-config", async (_req: Request, res: Response) => {
  const tools = await prisma.toolConfig.findMany({ orderBy: [{ category: "asc" }, { priority: "desc" }] })
  res.json({ code: 0, data: tools })
})

router.get("/category-payment-settings", async (_req: Request, res: Response) => {
  await ensureCategoryPaymentSettings(prisma)
  const settings = await prisma.categoryPaymentSetting.findMany({ orderBy: { category: "asc" } })
  res.json({ code: 0, data: settings })
})

router.put("/category-payment-settings/:category", async (req: Request, res: Response) => {
  const category = req.params.category as string
  const { paidEnabled } = req.body as { paidEnabled?: boolean }

  if (typeof paidEnabled !== "boolean") {
    res.status(400).json({ code: 400, message: "paidEnabled must be boolean" })
    return
  }

  const setting = await prisma.categoryPaymentSetting.findUnique({ where: { category } })
  if (!setting) {
    res.status(404).json({ code: 404, message: "Category payment setting not found" })
    return
  }

  await prisma.categoryPaymentSetting.update({
    where: { category },
    data: { paidEnabled, updatedBy: (req as any).userId },
  })

  const categoryTools = await prisma.toolConfig.findMany({
    where: { category },
    select: { toolSlug: true },
  })

  await redis.del("tools:category-payment-settings")
  await redis.del("tools:list")
  if (categoryTools.length > 0) {
    await redis.del(...categoryTools.map((tool) => `tools:${tool.toolSlug}`))
  }

  res.json({ code: 0, message: "模块付费开关已更新" })
})

router.put("/tools-config/:slug", async (req: Request, res: Response) => {
  const slug = req.params.slug as string
  const { enabled, creditsCost, dailyFreeAnonymous, dailyFreeRegistered, maxFileSizeMb } = req.body

  const tool = await prisma.toolConfig.findUnique({ where: { toolSlug: slug } })
  if (!tool) { res.status(404).json({ code: 404, message: "工具不存在" }); return }

  await prisma.toolConfig.update({
    where: { toolSlug: slug },
    data: {
      ...(enabled !== undefined && { enabled }),
      ...(creditsCost !== undefined && { creditsCost }),
      ...(dailyFreeAnonymous !== undefined && { dailyFreeAnonymous }),
      ...(dailyFreeRegistered !== undefined && { dailyFreeRegistered }),
      ...(maxFileSizeMb !== undefined && { maxFileSizeMb }),
      updatedBy: (req as any).userId,
    },
  })

  await redis.del("tools:list")
  await redis.del(`tools:${slug}`)

  res.json({ code: 0, message: "配置已更新" })
})

router.get("/system", async (_req: Request, res: Response) => {
  const [waiting, active, completed, failed] = await Promise.all([
    processQueue.getWaitingCount(),
    processQueue.getActiveCount(),
    processQueue.getCompletedCount(),
    processQueue.getFailedCount(),
  ])

  const memUsage = process.memoryUsage()

  res.json({
    code: 0,
    data: {
      queue: { waiting, active, completed, failed },
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      },
      uptime: Math.round(process.uptime()),
    },
  })
})

export default router
