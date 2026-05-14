import type { Request, Response, NextFunction } from "express"
import { redis } from "../config/redis.js"
import { env } from "../config/env.js"

/**
 * AI 限流中间件
 *
 * 三个维度：
 * 1. 每分钟（按 IP 或 userId）：匿名 10/min，登录 20/min
 * 2. 每天（按 IP 或 userId）：匿名 20/day，登录 100/day
 * 3. 单 IP 并发流式 1：用 SET NX EX 5min 锁，请求结束 DEL
 *
 * 软鉴权：在该中间件之前应已读取 session（不强制）。
 * (req as any).userId 存在 = 登录用户。
 */

function getMinuteKey(): string {
  // 当前分钟桶（UTC）
  const d = new Date()
  return d.toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM
}

function getDayKey(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

function getClientIp(req: Request): string {
  return (req.ip || req.socket.remoteAddress || "unknown") as string
}

/**
 * 主限流中间件：检查每分钟 + 每日上限。
 * 通过后再加并发锁（在 chat 路由里另外用 acquireFlowLock）。
 */
export async function aiRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as { userId?: number }).userId
    const ip = getClientIp(req)
    const isAuth = typeof userId === "number"

    const minuteLimit = isAuth ? env.ai.rateLimitAuthPerMinute : env.ai.rateLimitAnonPerMinute
    const dayLimit = isAuth ? env.ai.authDailyFree : env.ai.anonDailyFree

    const minuteKey = isAuth
      ? `ai:user:${userId}:m:${getMinuteKey()}`
      : `ai:anon:${ip}:m:${getMinuteKey()}`
    const dayKey = isAuth
      ? `ai:user:${userId}:d:${getDayKey()}`
      : `ai:anon:${ip}:d:${getDayKey()}`

    const [minuteCount, dayCount] = await Promise.all([
      redis.incr(minuteKey),
      redis.incr(dayKey),
    ])

    // 首次设置 TTL
    if (minuteCount === 1) {
      await redis.expire(minuteKey, 70) // 略大于 60s
    }
    if (dayCount === 1) {
      await redis.expire(dayKey, 86400 + 60)
    }

    res.setHeader("X-RateLimit-Limit-Minute", minuteLimit)
    res.setHeader("X-RateLimit-Remaining-Minute", Math.max(0, minuteLimit - minuteCount))
    res.setHeader("X-RateLimit-Limit-Day", dayLimit)
    res.setHeader("X-RateLimit-Remaining-Day", Math.max(0, dayLimit - dayCount))

    if (minuteCount > minuteLimit) {
      res.status(429).json({
        code: 429,
        message: "请求过于频繁，请稍后再试（每分钟限制）",
      })
      return
    }

    if (dayCount > dayLimit) {
      res.status(429).json({
        code: 429,
        message: isAuth
          ? `今日额度已用完（${dayLimit} 次/天），请明天再试`
          : `匿名额度已用完（${dayLimit} 次/天），登录可获得更多额度`,
      })
      return
    }

    next()
  } catch (err) {
    console.warn("[ai-rate-limit] redis error, skipping limit:", err)
    next()
  }
}

/**
 * 单 IP 并发流式锁：同一 IP 同时只能跑 1 个流。
 * 抢占失败返回 429，路由层调用，请求结束需手动 release。
 */
export async function acquireFlowLock(req: Request): Promise<{ acquired: boolean; release: () => Promise<void> }> {
  const ip = getClientIp(req)
  const key = `ai:flow:${ip}`
  // SET NX EX 300，最多 5 分钟保护
  const ok = await redis.set(key, "1", "EX", 300, "NX")
  if (ok !== "OK") {
    return { acquired: false, release: async () => { /* noop */ } }
  }
  return {
    acquired: true,
    release: async () => {
      try {
        await redis.del(key)
      } catch (e) {
        console.warn("[ai-rate-limit] release flow lock failed:", e)
      }
    },
  }
}

/**
 * 附件上传限流：比 /chat 宽松，每分钟 30 次（按 IP/userId）。
 * 不消耗每日 chat 额度，独立计数。
 */
export async function aiAttachRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as { userId?: number }).userId
    const ip = getClientIp(req)
    const isAuth = typeof userId === "number"
    const limit = 30

    const key = isAuth
      ? `ai:att:user:${userId}:m:${getMinuteKey()}`
      : `ai:att:anon:${ip}:m:${getMinuteKey()}`

    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, 70)
    }

    res.setHeader("X-RateLimit-Limit-Minute", limit)
    res.setHeader("X-RateLimit-Remaining-Minute", Math.max(0, limit - count))

    if (count > limit) {
      res.status(429).json({ code: 429, message: "附件上传过于频繁，请稍后再试" })
      return
    }
    next()
  } catch (err) {
    console.warn("[ai-attach-rate-limit] redis error, skipping limit:", err)
    next()
  }
}
