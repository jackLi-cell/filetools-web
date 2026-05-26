import { PrismaClient } from "@prisma/client"

const categoryNames: Record<string, string> = {
  image: "图片处理",
  pdf: "PDF 工具",
  convert: "文档转换",
  video: "视频处理",
  audio: "音频处理",
  markdown: "Markdown",
  dev: "开发者工具",
  qrcode: "二维码工具",
  text: "文本工具",
  security: "文件安全",
  signature: "电子签名",
}

const defaultPaidCategories = new Set(["image", "pdf", "convert", "video", "audio", "markdown", "qrcode", "security", "signature"])

export async function ensureCategoryPaymentSettings(prisma: PrismaClient) {
  const [tools, settings] = await Promise.all([
    prisma.toolConfig.findMany({ select: { category: true }, distinct: ["category"] }),
    prisma.categoryPaymentSetting.findMany({ select: { category: true } }),
  ])

  const existing = new Set(settings.map((setting) => setting.category))
  const missingCategories = tools
    .map((tool) => tool.category)
    .filter((category) => !existing.has(category))

  if (missingCategories.length > 0) {
    await prisma.categoryPaymentSetting.createMany({
      data: missingCategories.map((category) => ({
        category,
        name: categoryNames[category] || category,
        paidEnabled: defaultPaidCategories.has(category),
      })),
      skipDuplicates: true,
    })
  }
}
