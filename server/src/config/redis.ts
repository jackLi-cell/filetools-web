import Redis from "ioredis"
import { env } from "./env.js"

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

redis.on("error", (err) => {
  console.error("[Redis] Connection error:", err.message)
})

redis.on("connect", () => {
  console.log("[Redis] Connected")
})
