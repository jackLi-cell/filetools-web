import { Router, Request, Response } from "express"
import { PrismaClient } from "@prisma/client"
import { randomBytes } from "crypto"
import { requireAuth } from "../middleware/auth.js"
import { redis } from "../config/redis.js"

const prisma = new PrismaClient()
const router = Router()

// 发送验证邮件
router.post("/send-verification", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) { res.status(404).json({ code: 404, message: "用户不存在" }); return }
  if (user.emailVerified) { res.status(400).json({ code: 400, message: "邮箱已验证" }); return }

  const cooldownKey = `email:verify:cooldown:${userId}`
  if (await redis.get(cooldownKey)) {
    res.status(429).json({ code: 429, message: "请 60 秒后再试" })
    return
  }

  const code = randomBytes(3).toString("hex").toUpperCase()
  await redis.setex(`email:verify:${userId}`, 600, code)
  await redis.setex(cooldownKey, 60, "1")

  // 发送邮件（使用 Resend 或其他服务）
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "CatConvert <noreply@cattools.jtlcook.com>",
          to: user.email,
          subject: "CatConvert 邮箱验证码",
          html: `<p>您的验证码是：<strong>${code}</strong></p><p>有效期 10 分钟。</p><p>如非本人操作，请忽略此邮件。</p>`,
        }),
      })
    } catch (err) {
      console.error("[Email] Send failed:", err)
    }
  }

  res.json({ code: 0, message: "验证码已发送" })
})

// 验证邮箱
router.post("/verify-email", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number
  const { code } = req.body as { code: string }
  if (!code) { res.status(400).json({ code: 400, message: "请输入验证码" }); return }

  const stored = await redis.get(`email:verify:${userId}`)
  if (!stored) { res.status(400).json({ code: 400, message: "验证码已过期" }); return }
  if (stored !== code.toUpperCase()) { res.status(400).json({ code: 400, message: "验证码错误" }); return }

  await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } })
  await redis.del(`email:verify:${userId}`)

  res.json({ code: 0, message: "邮箱验证成功" })
})

// 生成邀请码
router.get("/invite-code", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number
  let inviteCode = await redis.get(`invite:code:${userId}`)
  if (!inviteCode) {
    inviteCode = `INV${userId.toString(36).toUpperCase()}${randomBytes(3).toString("hex").toUpperCase()}`
    await redis.set(`invite:code:${userId}`, inviteCode)
    await redis.set(`invite:reverse:${inviteCode}`, String(userId))
  }
  res.json({ code: 0, data: { inviteCode, link: `${process.env.CORS_ORIGIN}/register?ref=${inviteCode}` } })
})

// 处理邀请奖励（注册时调用）
export async function processInviteReward(newUserId: number, inviteCode: string | undefined) {
  if (!inviteCode) return

  const inviterIdStr = await redis.get(`invite:reverse:${inviteCode}`)
  if (!inviterIdStr) return
  const inviterId = Number(inviterIdStr)
  if (inviterId === newUserId) return

  const INVITE_BONUS = Number(process.env.INVITE_BONUS) || 30

  // 给邀请人加积分
  await prisma.$transaction([
    prisma.user.update({ where: { id: inviterId }, data: { credits: { increment: INVITE_BONUS }, totalEarned: { increment: INVITE_BONUS } } }),
    prisma.creditTransaction.create({
      data: { userId: inviterId, type: "earn", amount: INVITE_BONUS, balanceAfter: 0, source: "invite", note: `邀请用户 ${newUserId} 注册` },
    }),
  ])

  // 给被邀请人加积分
  await prisma.$transaction([
    prisma.user.update({ where: { id: newUserId }, data: { credits: { increment: INVITE_BONUS }, totalEarned: { increment: INVITE_BONUS } } }),
    prisma.creditTransaction.create({
      data: { userId: newUserId, type: "earn", amount: INVITE_BONUS, balanceAfter: 0, source: "invite", note: `通过邀请码 ${inviteCode} 注册` },
    }),
  ])
}

export default router
