import { Request, Response, NextFunction } from "express"
import { redis } from "../config/redis.js"

export function rateLimiter(options: { windowMs: number; max: number; keyPrefix?: string }) {
  const { windowMs, max, keyPrefix = "rl" } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown"
    const key = `${keyPrefix}:${ip}`

    const current = await redis.incr(key)
    if (current === 1) {
      await redis.pexpire(key, windowMs)
    }

    res.setHeader("X-RateLimit-Limit", max)
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - current))

    if (current > max) {
      res.status(429).json({
        code: 429,
        message: "请求过于频繁，请稍后再试",
      })
      return
    }

    next()
  }
}

export const globalLimiter = rateLimiter({ windowMs: 60000, max: 60, keyPrefix: "rl:global" })
export const uploadLimiter = rateLimiter({ windowMs: 60000, max: 10, keyPrefix: "rl:upload" })
export const authLimiter = rateLimiter({ windowMs: 300000, max: 5, keyPrefix: "rl:auth" })
