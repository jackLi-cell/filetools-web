import { Router, Request, Response } from "express"
import { PrismaClient } from "@prisma/client"
import { randomBytes } from "crypto"
import { z } from "zod"
import { redis } from "../config/redis.js"
import { env } from "../config/env.js"
import { authLimiter } from "../middleware/rate-limit.js"

let argon2: typeof import("argon2")

async function getArgon2() {
  if (!argon2) argon2 = await import("argon2")
  return argon2
}

const router = Router()
const prisma = new PrismaClient()

const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(8, "密码至少 8 位").regex(/[a-zA-Z]/, "密码必须包含字母").regex(/[0-9]/, "密码必须包含数字"),
  name: z.string().min(1).max(50).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

function generateSessionToken(): string {
  return randomBytes(32).toString("hex")
}

router.post("/register", authLimiter, async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ code: 400, message: parsed.error.errors[0].message })
    return
  }

  const { email, password, name } = parsed.data
  const ip = (req.ip || "unknown") as string

  const ipKey = `register:ip:${ip}`
  const ipCount = await redis.incr(ipKey)
  if (ipCount === 1) await redis.expire(ipKey, 3600)
  if (ipCount > 3) {
    res.status(429).json({ code: 429, message: "注册过于频繁，请稍后再试" })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ code: 409, message: "该邮箱已注册" })
    return
  }

  const { hash } = await getArgon2()
  const passwordHash = await hash(password)

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: name || email.split("@")[0],
      credits: 100,
      totalEarned: 100,
    },
  })

  await prisma.creditTransaction.create({
    data: {
      userId: user.id,
      type: "earn",
      amount: 100,
      balanceAfter: 100,
      source: "register_bonus",
      note: "注册赠送积分",
    },
  })

  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.session.create({
    data: {
      id: token,
      userId: user.id,
      ipAddress: ip,
      userAgent: (req.headers["user-agent"] || "") as string,
      expiresAt,
    },
  })

  res.cookie("session_token", token, {
    httpOnly: true,
    secure: env.sessionCookieSecure,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  })

  res.json({
    code: 0,
    data: { id: user.id, email: user.email, name: user.name, credits: user.credits },
  })
})

router.post("/login", authLimiter, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ code: 400, message: "请输入邮箱和密码" })
    return
  }

  const { email, password } = parsed.data
  const ip = (req.ip || "unknown") as string

  const failKey = `login:fail:${ip}`
  const failCount = Number(await redis.get(failKey)) || 0
  if (failCount >= 5) {
    res.status(429).json({ code: 429, message: "登录失败次数过多，请 15 分钟后再试" })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    await redis.setex(failKey, 900, String(failCount + 1))
    res.status(401).json({ code: 401, message: "邮箱或密码错误" })
    return
  }

  if (user.status === "banned") {
    res.status(403).json({ code: 403, message: "账号已被封禁" })
    return
  }

  const { verify } = await getArgon2()
  const valid = await verify(user.passwordHash, password)
  if (!valid) {
    await redis.setex(failKey, 900, String(failCount + 1))
    res.status(401).json({ code: 401, message: "邮箱或密码错误" })
    return
  }

  await redis.del(failKey)

  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.session.create({
    data: {
      id: token,
      userId: user.id,
      ipAddress: ip,
      userAgent: (req.headers["user-agent"] || "") as string,
      expiresAt,
    },
  })

  res.cookie("session_token", token, {
    httpOnly: true,
    secure: env.sessionCookieSecure,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  })

  res.json({
    code: 0,
    data: { id: user.id, email: user.email, name: user.name, credits: user.credits },
  })
})

router.post("/logout", async (req: Request, res: Response) => {
  const token = req.cookies?.session_token
  if (token) {
    await prisma.session.deleteMany({ where: { id: token } })
  }
  res.clearCookie("session_token", { path: "/" })
  res.json({ code: 0, message: "已退出登录" })
})

router.get("/session", async (req: Request, res: Response) => {
  const token = req.cookies?.session_token
  if (!token) {
    res.json({ code: 0, data: null })
    return
  }

  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: { select: { id: true, email: true, name: true, credits: true, role: true } } },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: token } })
    res.clearCookie("session_token", { path: "/" })
    res.json({ code: 0, data: null })
    return
  }

  const remaining = session.expiresAt.getTime() - Date.now()
  if (remaining < 3 * 24 * 60 * 60 * 1000) {
    await prisma.session.update({
      where: { id: token },
      data: { expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    })
  }

  res.json({ code: 0, data: session.user })
})

export default router
