import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const categoryPaymentSeeds = [
  { category: "image", name: "图片处理" },
  { category: "pdf", name: "PDF 工具" },
  { category: "convert", name: "文档转换" },
  { category: "video", name: "视频处理" },
  { category: "audio", name: "音频处理" },
  { category: "markdown", name: "Markdown" },
  { category: "dev", name: "开发者工具" },
  { category: "qrcode", name: "二维码工具" },
  { category: "text", name: "文本工具" },
  { category: "security", name: "文件安全" },
  { category: "signature", name: "电子签名" },
]

const creditPackageSeeds = [
  {
    id: 1,
    name: "轻量包",
    creditsAmount: 100,
    priceCents: 990,
    sortOrder: 10,
    description: "适合偶尔处理文件，约 10 积分/元",
  },
  {
    id: 2,
    name: "常用包",
    creditsAmount: 220,
    priceCents: 1990,
    sortOrder: 20,
    description: "适合每周处理文件，含 20 赠送积分",
  },
  {
    id: 3,
    name: "高频包",
    creditsAmount: 600,
    priceCents: 4990,
    sortOrder: 30,
    description: "适合批量处理文件，含 100 赠送积分",
  },
  {
    id: 4,
    name: "专业包",
    creditsAmount: 1300,
    priceCents: 9990,
    sortOrder: 40,
    description: "适合长期高频使用，含 300 赠送积分",
  },
]

const toolSeeds = [
  // 图片处理
  { toolSlug: "image-compress", name: "图片压缩", category: "image", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 30, priority: 100, description: "调整质量和大小，支持批量压缩" },
  { toolSlug: "image-convert", name: "图片格式转换", category: "image", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 30, priority: 99, description: "PNG、JPG、WebP、GIF、BMP 互转" },
  { toolSlug: "image-crop", name: "图片裁剪", category: "image", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 30, priority: 98, description: "自由裁剪、固定比例、圆形裁剪" },
  { toolSlug: "image-resize", name: "图片缩放", category: "image", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 30, priority: 97, description: "按像素或百分比调整尺寸" },
  { toolSlug: "image-base64", name: "图片 Base64 互转", category: "image", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 10, priority: 90, description: "图片转 Base64 编码或反向转换" },
  { toolSlug: "image-watermark", name: "图片加水印", category: "image", isFree: false, creditsCost: 2, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 30, priority: 85, description: "添加文字或图片可见水印" },
  { toolSlug: "image-steganography", name: "隐形水印", category: "image", isFree: false, creditsCost: 3, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 30, priority: 84, description: "嵌入不可见水印用于版权追踪" },
  { toolSlug: "image-steganography-detect", name: "隐形水印检测", category: "image", isFree: false, creditsCost: 3, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 30, priority: 83, description: "提取和检测图片中的隐形水印" },
  { toolSlug: "image-remove-bg", name: "图片去背景", category: "image", isFree: false, creditsCost: 5, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 30, priority: 80, description: "AI 智能抠图去除背景" },
  { toolSlug: "image-id-photo", name: "证件照换底色", category: "image", isFree: false, creditsCost: 3, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 10, priority: 79, description: "一键更换证件照背景颜色" },
  { toolSlug: "image-ocr", name: "图片文字识别", category: "image", isFree: false, creditsCost: 3, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 20, priority: 78, description: "OCR 提取图片中的文字内容" },
  { toolSlug: "image-exif", name: "EXIF 信息查看/清除", category: "image", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 30, priority: 70, description: "查看或清除图片元数据信息" },
  { toolSlug: "image-svg-convert", name: "SVG 转 PNG/JPG", category: "image", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 10, priority: 69, description: "将 SVG 矢量图转为位图格式" },
  { toolSlug: "image-collage", name: "图片拼接", category: "image", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 30, priority: 68, description: "多张图片拼接为一张长图" },
  // PDF 工具
  { toolSlug: "pdf-to-image", name: "PDF 转图片", category: "pdf", isFree: false, creditsCost: 1, dailyFreeAnonymous: 3, dailyFreeRegistered: 5, maxFileSizeMb: 30, priority: 100, description: "将 PDF 每页转为 PNG 或 JPG 图片" },
  { toolSlug: "image-to-pdf", name: "图片转 PDF", category: "pdf", isFree: false, creditsCost: 1, dailyFreeAnonymous: 3, dailyFreeRegistered: 5, maxFileSizeMb: 30, priority: 99, description: "将多张图片合并为一个 PDF 文件" },
  { toolSlug: "pdf-merge", name: "PDF 合并", category: "pdf", isFree: false, creditsCost: 1, dailyFreeAnonymous: 3, dailyFreeRegistered: 5, maxFileSizeMb: 50, priority: 98, description: "将多个 PDF 文件合并为一个" },
  { toolSlug: "pdf-split", name: "PDF 拆分", category: "pdf", isFree: false, creditsCost: 1, dailyFreeAnonymous: 3, dailyFreeRegistered: 5, maxFileSizeMb: 50, priority: 97, description: "将 PDF 按页码拆分为多个文件" },
  { toolSlug: "pdf-compress", name: "PDF 压缩", category: "pdf", isFree: false, creditsCost: 2, dailyFreeAnonymous: 0, dailyFreeRegistered: 2, maxFileSizeMb: 50, priority: 96, description: "减小 PDF 文件体积" },
  { toolSlug: "pdf-rotate", name: "PDF 页面旋转", category: "pdf", isFree: false, creditsCost: 1, dailyFreeAnonymous: 3, dailyFreeRegistered: 5, maxFileSizeMb: 50, priority: 90, description: "旋转 PDF 指定页面方向" },
  { toolSlug: "pdf-extract", name: "PDF 提取指定页", category: "pdf", isFree: false, creditsCost: 1, dailyFreeAnonymous: 3, dailyFreeRegistered: 5, maxFileSizeMb: 50, priority: 89, description: "从 PDF 中提取指定页码" },
  { toolSlug: "pdf-page-number", name: "PDF 添加页码", category: "pdf", isFree: false, creditsCost: 2, dailyFreeAnonymous: 0, dailyFreeRegistered: 2, maxFileSizeMb: 50, priority: 85, description: "为 PDF 每页添加页码" },
  { toolSlug: "pdf-encrypt", name: "PDF 加密", category: "pdf", isFree: false, creditsCost: 2, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 50, priority: 80, description: "为 PDF 设置密码保护" },
  { toolSlug: "pdf-decrypt", name: "PDF 解密", category: "pdf", isFree: false, creditsCost: 2, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 50, priority: 79, description: "移除 PDF 密码保护" },
  { toolSlug: "pdf-ocr", name: "PDF OCR 文字识别", category: "pdf", isFree: false, creditsCost: 5, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 30, priority: 75, description: "识别扫描版 PDF 中的文字" },
  // 开发者工具
  { toolSlug: "json-formatter", name: "JSON 格式化", category: "dev", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 1, priority: 100, description: "格式化、压缩、校验 JSON 数据" },
  { toolSlug: "regex-tester", name: "正则表达式测试", category: "dev", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 1, priority: 99, description: "实时匹配测试和分组高亮" },
  { toolSlug: "timestamp-converter", name: "时间戳转换", category: "dev", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 1, priority: 98, description: "Unix 时间戳与日期时间互转" },
  { toolSlug: "url-codec", name: "URL 编码/解码", category: "dev", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 1, priority: 97, description: "URL 编码和解码转换" },
  { toolSlug: "hash-generator", name: "哈希计算", category: "dev", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 100, priority: 96, description: "MD5、SHA1、SHA256、SHA512 哈希" },
  { toolSlug: "uuid-generator", name: "UUID/密码生成", category: "dev", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 1, priority: 95, description: "生成 UUID 和随机安全密码" },
  { toolSlug: "jwt-decoder", name: "JWT 解码", category: "dev", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 1, priority: 94, description: "解码 JWT Token 查看内容" },
  { toolSlug: "xml-formatter", name: "XML/YAML 格式化", category: "dev", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 1, priority: 93, description: "格式化 XML 和 YAML 数据" },
  // 二维码
  { toolSlug: "qrcode-generate", name: "二维码生成", category: "qrcode", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 1, priority: 100, description: "生成二维码，支持 Logo 和自定义颜色" },
  { toolSlug: "qrcode-decode", name: "二维码识别", category: "qrcode", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 10, priority: 99, description: "上传图片识别二维码内容" },
  { toolSlug: "barcode-generate", name: "条形码生成", category: "qrcode", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 1, priority: 98, description: "生成 EAN、UPC、Code128 条形码" },
  { toolSlug: "batch-qrcode", name: "批量二维码生成", category: "qrcode", isFree: false, creditsCost: 2, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 1, priority: 90, description: "批量生成多个二维码" },
  // Markdown
  { toolSlug: "markdown-preview", name: "Markdown 预览", category: "markdown", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 5, priority: 100, description: "实时预览 Markdown 渲染效果" },
  { toolSlug: "markdown-to-html", name: "Markdown 转 HTML", category: "markdown", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 5, priority: 99, description: "将 Markdown 导出为完整 HTML 文件" },
  { toolSlug: "markdown-to-pdf", name: "Markdown 转 PDF", category: "markdown", isFree: false, creditsCost: 2, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 5, priority: 98, description: "将 Markdown 导出为带样式 PDF" },
  { toolSlug: "html-to-markdown", name: "HTML 转 Markdown", category: "markdown", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 5, priority: 90, description: "将 HTML 转换为 Markdown 格式" },
  // 文本工具
  { toolSlug: "word-counter", name: "字数统计", category: "text", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 1, priority: 100, description: "统计字数、字符、行数、段落数" },
  { toolSlug: "text-dedup", name: "文本去重", category: "text", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 1, priority: 99, description: "按行去重并统计重复次数" },
  { toolSlug: "case-converter", name: "大小写转换", category: "text", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 1, priority: 98, description: "全大写、全小写、首字母、驼峰、下划线" },
  { toolSlug: "color-converter", name: "颜色转换器", category: "text", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 1, priority: 97, description: "HEX、RGB、HSL 颜色格式互转" },
  // 文件安全
  { toolSlug: "file-hash", name: "文件哈希校验", category: "security", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 100, priority: 100, description: "计算文件 MD5/SHA256 哈希值" },
  { toolSlug: "image-metadata-clear", name: "图片元数据清除", category: "security", isFree: false, creditsCost: 2, dailyFreeAnonymous: 0, dailyFreeRegistered: 2, maxFileSizeMb: 30, priority: 90, description: "批量清除图片 EXIF 等元数据" },
  { toolSlug: "pdf-metadata-clear", name: "PDF 元数据清除", category: "security", isFree: false, creditsCost: 2, dailyFreeAnonymous: 0, dailyFreeRegistered: 2, maxFileSizeMb: 50, priority: 89, description: "清除 PDF 文件元数据信息" },
  // 电子签名
  { toolSlug: "signature-create", name: "电子签名生成", category: "signature", isFree: true, creditsCost: 0, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 1, priority: 100, description: "手写板生成签名图片" },
  { toolSlug: "signature-pdf", name: "签名插入 PDF", category: "signature", isFree: false, creditsCost: 3, dailyFreeAnonymous: 0, dailyFreeRegistered: 0, maxFileSizeMb: 30, priority: 90, description: "将签名图片插入 PDF 指定位置" },
]

async function seed() {
  console.log("Seeding category_payment_settings...")

  for (const category of categoryPaymentSeeds) {
    await prisma.categoryPaymentSetting.upsert({
      where: { category: category.category },
      update: { name: category.name },
      create: { ...category, paidEnabled: false },
    })
  }

  console.log("Seeding tool_configs...")

  for (const tool of toolSeeds) {
    await prisma.toolConfig.upsert({
      where: { toolSlug: tool.toolSlug },
      update: { ...tool, maxFileSizePaidMb: tool.maxFileSizeMb * 3, maxPages: 100, maxDurationSec: 300 },
      create: { ...tool, enabled: true, maxFileSizePaidMb: tool.maxFileSizeMb * 3, maxPages: 100, maxDurationSec: 300 },
    })
  }

  console.log("Seeding credit_packages...")

  for (const pkg of creditPackageSeeds) {
    await prisma.creditPackage.upsert({
      where: { id: pkg.id },
      update: { ...pkg, enabled: true },
      create: { ...pkg, enabled: true },
    })
  }

  console.log(`Seeded ${toolSeeds.length} tools.`)
  console.log(`Seeded ${categoryPaymentSeeds.length} category payment settings.`)
  console.log(`Seeded ${creditPackageSeeds.length} credit packages.`)
  await prisma.$disconnect()
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
