import { Router, Request, Response } from "express"
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "crypto"
import { z } from "zod"
import { requireAuth } from "../middleware/auth.js"
import { redis } from "../config/redis.js"

const prisma = new PrismaClient()
const router = Router()

// ============================================================
// 支付渠道配置（从环境变量读取，支持多渠道动态切换）
// ============================================================

interface PaymentChannelConfig {
  enabled: boolean
  name: string
  provider: string // xorpay | alipay_direct | wechat_direct | custom
  apiUrl: string
  merchantId: string
  apiKey: string
  callbackUrl: string
  returnUrl: string
  extra?: Record<string, string>
}

function getPaymentChannels(): Record<string, PaymentChannelConfig> {
  const channels: Record<string, PaymentChannelConfig> = {}

  // XorPay（支付宝 + 微信聚合）
  if (process.env.XORPAY_ENABLED === "true") {
    channels.xorpay_alipay = {
      enabled: true,
      name: "支付宝",
      provider: "xorpay",
      apiUrl: process.env.XORPAY_API_URL || "https://xorpay.com/api/cashier",
      merchantId: process.env.XORPAY_AID || "",
      apiKey: process.env.XORPAY_API_KEY || "",
      callbackUrl: process.env.XORPAY_CALLBACK_URL || "",
      returnUrl: process.env.XORPAY_RETURN_URL || "",
      extra: { channel: "alipay" },
    }
    channels.xorpay_wechat = {
      enabled: true,
      name: "微信支付",
      provider: "xorpay",
      apiUrl: process.env.XORPAY_API_URL || "https://xorpay.com/api/cashier",
      merchantId: process.env.XORPAY_AID || "",
      apiKey: process.env.XORPAY_API_KEY || "",
      callbackUrl: process.env.XORPAY_CALLBACK_URL || "",
      returnUrl: process.env.XORPAY_RETURN_URL || "",
      extra: { channel: "wechat" },
    }
  }

  // 官方支付宝当面付（有营业执照后切换）
  if (process.env.ALIPAY_ENABLED === "true") {
    channels.alipay_direct = {
      enabled: true,
      name: "支付宝（官方）",
      provider: "alipay_direct",
      apiUrl: "https://openapi.alipay.com/gateway.do",
      merchantId: process.env.ALIPAY_APP_ID || "",
      apiKey: process.env.ALIPAY_PRIVATE_KEY || "",
      callbackUrl: process.env.ALIPAY_CALLBACK_URL || "",
      returnUrl: process.env.ALIPAY_RETURN_URL || "",
      extra: { alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || "" },
    }
  }

  // 官方微信支付（有营业执照后切换）
  if (process.env.WECHAT_PAY_ENABLED === "true") {
    channels.wechat_direct = {
      enabled: true,
      name: "微信支付（官方）",
      provider: "wechat_direct",
      apiUrl: "https://api.mch.weixin.qq.com/v3/pay/transactions/native",
      merchantId: process.env.WECHAT_MCH_ID || "",
      apiKey: process.env.WECHAT_API_V3_KEY || "",
      callbackUrl: process.env.WECHAT_CALLBACK_URL || "",
      returnUrl: process.env.WECHAT_RETURN_URL || "",
      extra: {
        appId: process.env.WECHAT_APP_ID || "",
        certSerialNo: process.env.WECHAT_CERT_SERIAL_NO || "",
        privateKeyPath: process.env.WECHAT_PRIVATE_KEY_PATH || "",
      },
    }
  }

  return channels
}

// ============================================================
// 签名工具
// ============================================================

async function signXorPay(params: Record<string, string>, apiKey: string): Promise<string> {
  const crypto = await import("crypto")
  const sorted = Object.keys(params).sort()
  const signStr = sorted.map(k => `${k}=${params[k]}`).join("&")
  return crypto.createHmac("sha256", apiKey).update(signStr).digest("hex")
}

function verifyXorPaySign(params: Record<string, string>, apiKey: string): boolean {
  const crypto = require("crypto")
  const { sign, ...rest } = params
  const sorted = Object.keys(rest).sort()
  const signStr = sorted.map(k => `${k}=${rest[k]}`).join("&")
  const expected = crypto.createHmac("sha256", apiKey).update(signStr).digest("hex")
  try {
    return crypto.timingSafeEqual(Buffer.from(sign || ""), Buffer.from(expected))
  } catch {
    return false
  }
}

// ============================================================
// API 接口
// ============================================================

// 获取可用支付方式
router.get("/methods", requireAuth, async (_req: Request, res: Response) => {
  const channels = getPaymentChannels()
  const methods = Object.entries(channels)
    .filter(([_, c]) => c.enabled)
    .map(([key, c]) => ({ key, name: c.name, provider: c.provider }))

  res.json({ code: 0, data: methods })
})

// 获取积分套餐列表
router.get("/packages", async (_req: Request, res: Response) => {
  const packages = await prisma.creditPackage.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: "asc" },
  })
  res.json({ code: 0, data: packages })
})

// 创建支付订单
const createOrderSchema = z.object({
  packageId: z.number().positive(),
  paymentMethod: z.string().min(1),
})

router.post("/create", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number
  const parsed = createOrderSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ code: 400, message: "参数错误" })
    return
  }

  const { packageId, paymentMethod } = parsed.data

  // 频率限制：每用户每分钟最多 3 个订单
  const orderLimitKey = `order:limit:${userId}`
  const orderCount = await redis.incr(orderLimitKey)
  if (orderCount === 1) await redis.expire(orderLimitKey, 60)
  if (orderCount > 3) {
    res.status(429).json({ code: 429, message: "创建订单过于频繁" })
    return
  }

  // 查找套餐
  const pkg = await prisma.creditPackage.findFirst({ where: { id: packageId, enabled: true } })
  if (!pkg) {
    res.status(404).json({ code: 404, message: "套餐不存在或已下架" })
    return
  }

  // 查找支付渠道
  const channels = getPaymentChannels()
  const channel = channels[paymentMethod]
  if (!channel || !channel.enabled) {
    res.status(400).json({ code: 400, message: "不支持的支付方式" })
    return
  }

  // 生成订单号
  const orderNo = `FT${Date.now()}-${randomUUID().slice(0, 8)}`
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

  // 写入数据库
  await prisma.order.create({
    data: {
      userId,
      orderNo,
      packageName: pkg.name,
      creditsAmount: pkg.creditsAmount,
      priceCents: pkg.priceCents,
      paymentMethod,
      paymentChannel: channel.provider,
      paymentStatus: "pending",
      expiresAt,
    },
  })

  // 调用支付渠道创建支付单
  let paymentUrl = ""
  let qrUrl = ""

  if (channel.provider === "xorpay") {
    const params: Record<string, string> = {
      name: `CatConvert 积分充值 - ${pkg.name}`,
      pay_type: channel.extra?.channel === "wechat" ? "native" : "alipay",
      price: String(pkg.priceCents),
      order_id: orderNo,
      notify_url: channel.callbackUrl,
      return_url: channel.returnUrl,
    }
    params.sign = await signXorPay(params, channel.apiKey)

    try {
      const xorRes = await fetch(channel.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, aoid: channel.merchantId }),
      })
      const xorData = await xorRes.json() as any
      if (xorData.code === 200 || xorData.status === "success") {
        paymentUrl = xorData.info?.url || xorData.data?.url || ""
        qrUrl = xorData.info?.qr || xorData.data?.qr || paymentUrl
      } else {
        await prisma.order.update({ where: { orderNo }, data: { paymentStatus: "failed", errorMessage: JSON.stringify(xorData) } })
        res.status(500).json({ code: 500, message: "创建支付单失败" })
        return
      }
    } catch (err: unknown) {
      await prisma.order.update({ where: { orderNo }, data: { paymentStatus: "failed", errorMessage: String(err) } })
      res.status(500).json({ code: 500, message: "支付渠道请求失败" })
      return
    }
  }

  // 其他渠道预留
  if (channel.provider === "alipay_direct") {
    // TODO: 官方支付宝 SDK 调用
    paymentUrl = "#alipay-direct-not-implemented"
  }

  if (channel.provider === "wechat_direct") {
    // TODO: 官方微信支付 APIv3 调用
    paymentUrl = "#wechat-direct-not-implemented"
  }

  res.json({
    code: 0,
    data: {
      orderNo,
      paymentUrl,
      qrUrl: qrUrl || paymentUrl,
      expiresAt: expiresAt.toISOString(),
      priceCents: pkg.priceCents,
      creditsAmount: pkg.creditsAmount,
    },
  })
})

// 查询订单状态
router.get("/status/:orderNo", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as number
  const orderNo = req.params.orderNo as string

  const order = await prisma.order.findFirst({
    where: { orderNo, userId },
    select: { orderNo: true, paymentStatus: true, creditsAmount: true, paidAt: true, packageName: true },
  })

  if (!order) {
    res.status(404).json({ code: 404, message: "订单不存在" })
    return
  }

  res.json({ code: 0, data: order })
})

// 支付回调（XorPay）
router.post("/callback/xorpay", async (req: Request, res: Response) => {
  const params = req.body as Record<string, string>
  const channels = getPaymentChannels()

  // 找到 XorPay 渠道获取 apiKey
  const xorpayChannel = Object.values(channels).find(c => c.provider === "xorpay")
  if (!xorpayChannel) {
    res.status(400).send("fail")
    return
  }

  // 验证签名
  if (!verifyXorPaySign(params, xorpayChannel.apiKey)) {
    console.error("[Payment] XorPay signature verification failed")
    res.status(400).send("fail")
    return
  }

  const orderNo = params.order_id
  const payPrice = Number(params.pay_price)
  const tradeNo = params.aoid || params.trade_no || ""

  // 防重放：检查是否已处理
  const replayKey = `payment:processed:${orderNo}`
  const alreadyProcessed = await redis.get(replayKey)
  if (alreadyProcessed) {
    res.send("success")
    return
  }

  // 查找订单
  const order = await prisma.order.findUnique({ where: { orderNo } })
  if (!order) {
    res.send("success") // 订单不存在也返回 success 防止重试
    return
  }

  // 幂等：已支付直接返回
  if (order.paymentStatus === "paid") {
    res.send("success")
    return
  }

  // 金额校验
  if (payPrice !== order.priceCents) {
    console.error(`[Payment] Amount mismatch: expected ${order.priceCents}, got ${payPrice}`)
    await prisma.order.update({ where: { orderNo }, data: { paymentStatus: "failed", errorMessage: `金额不一致: ${payPrice} vs ${order.priceCents}` } })
    res.status(400).send("fail")
    return
  }

  // 超时检查
  if (order.expiresAt && order.expiresAt < new Date()) {
    await prisma.order.update({ where: { orderNo }, data: { paymentStatus: "failed", errorMessage: "订单已过期" } })
    res.send("success")
    return
  }

  // 事务：更新订单 + 发放积分 + 记录流水
  try {
    await prisma.$transaction([
      prisma.order.update({
        where: { orderNo, paymentStatus: "pending" },
        data: { paymentStatus: "paid", tradeNo, paidAt: new Date() },
      }),
      prisma.user.update({
        where: { id: order.userId },
        data: {
          credits: { increment: order.creditsAmount },
          totalEarned: { increment: order.creditsAmount },
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: order.userId,
          type: "recharge",
          amount: order.creditsAmount,
          balanceAfter: 0, // 会在应用层修正
          source: "recharge",
          note: `充值 ${order.packageName}（订单 ${orderNo}）`,
        },
      }),
    ])

    // 修正 balanceAfter
    const user = await prisma.user.findUnique({ where: { id: order.userId } })
    if (user) {
      await prisma.creditTransaction.updateMany({
        where: { userId: order.userId, source: "recharge", balanceAfter: 0 },
        data: { balanceAfter: user.credits },
      })
    }

    // 标记已处理（防重放，24 小时 TTL）
    await redis.setex(replayKey, 86400, "1")

    console.log(`[Payment] Order ${orderNo} paid: +${order.creditsAmount} credits to user ${order.userId}`)
  } catch (err) {
    console.error(`[Payment] Transaction failed for ${orderNo}:`, err)
    res.status(500).send("fail")
    return
  }

  res.send("success")
})

export default router
