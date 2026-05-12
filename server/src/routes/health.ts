import { Router, Request, Response } from "express"
import { PrismaClient } from "@prisma/client"
import { redis } from "../config/redis.js"
import { processQueue } from "../config/queue.js"

const router = Router()
const prisma = new PrismaClient()

router.get("/health", async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {}

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.mysql = "ok"
  } catch {
    checks.mysql = "error"
  }

  try {
    await redis.ping()
    checks.redis = "ok"
  } catch {
    checks.redis = "error"
  }

  try {
    const waiting = await processQueue.getWaitingCount()
    const active = await processQueue.getActiveCount()
    checks.queue = `waiting:${waiting},active:${active}`
  } catch {
    checks.queue = "error"
  }

  const allOk = checks.mysql === "ok" && checks.redis === "ok"
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
  })
})

export default router
