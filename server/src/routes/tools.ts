import { Router, Request, Response } from "express"
import { PrismaClient } from "@prisma/client"
import type { CategoryPaymentSetting, ToolConfig } from "@prisma/client"
import { redis } from "../config/redis.js"
import { ensureCategoryPaymentSettings } from "../services/category-payment.js"

const router = Router()
const prisma = new PrismaClient()

function withEffectivePricing(
  tool: ToolConfig,
  setting?: Pick<CategoryPaymentSetting, "paidEnabled"> | null
) {
  const categoryPaidEnabled = setting?.paidEnabled === true
  const effectiveCreditsCost = categoryPaidEnabled && !tool.isFree ? tool.creditsCost : 0

  return {
    ...tool,
    categoryPaidEnabled,
    effectiveIsFree: effectiveCreditsCost <= 0,
    effectiveCreditsCost,
  }
}

router.get("/category-payment-settings", async (_req: Request, res: Response) => {
  const cacheKey = "tools:category-payment-settings"
  const cached = await redis.get(cacheKey)
  if (cached) {
    res.json({ code: 0, data: JSON.parse(cached) })
    return
  }

  await ensureCategoryPaymentSettings(prisma)

  const settings = await prisma.categoryPaymentSetting.findMany({
    orderBy: { category: "asc" },
  })

  await redis.setex(cacheKey, 60, JSON.stringify(settings))
  res.json({ code: 0, data: settings })
})

router.get("/", async (_req: Request, res: Response) => {
  const cacheKey = "tools:list"
  const cached = await redis.get(cacheKey)
  if (cached) {
    res.json({ code: 0, data: JSON.parse(cached) })
    return
  }

  await ensureCategoryPaymentSettings(prisma)

  const [tools, settings] = await Promise.all([
    prisma.toolConfig.findMany({
      where: { enabled: true },
      orderBy: [{ category: "asc" }, { priority: "desc" }],
    }),
    prisma.categoryPaymentSetting.findMany(),
  ])

  const settingByCategory = new Map(settings.map((setting) => [setting.category, setting]))
  const payload = tools.map((tool) => withEffectivePricing(tool, settingByCategory.get(tool.category)))

  await redis.setex(cacheKey, 60, JSON.stringify(payload))
  res.json({ code: 0, data: payload })
})

router.get("/:slug", async (req: Request, res: Response) => {
  const slug = req.params.slug as string
  const cacheKey = `tools:${slug}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    res.json({ code: 0, data: JSON.parse(cached) })
    return
  }

  const tool = await prisma.toolConfig.findUnique({ where: { toolSlug: slug } })
  if (!tool || !tool.enabled) {
    res.status(404).json({ code: 404, message: "工具不存在或已下线" })
    return
  }

  await ensureCategoryPaymentSettings(prisma)
  const setting = await prisma.categoryPaymentSetting.findUnique({ where: { category: tool.category } })
  const payload = withEffectivePricing(tool, setting)

  await redis.setex(cacheKey, 60, JSON.stringify(payload))
  res.json({ code: 0, data: payload })
})

export default router
