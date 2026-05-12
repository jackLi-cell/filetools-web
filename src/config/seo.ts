export interface ToolSeo {
  slug: string
  title: string
  description: string
  keywords: string[]
  h1: string
  faq: { q: string; a: string }[]
}

export const toolSeoData: Record<string, ToolSeo> = {
  "image-compress": {
    slug: "image-compress",
    title: "在线图片压缩 - 免费批量压缩JPG/PNG/WebP图片大小",
    description: "免费在线图片压缩工具，支持批量压缩 JPG、PNG、WebP 图片，可自定义压缩质量和目标大小。浏览器本地处理，图片不上传服务器，保护隐私安全。",
    keywords: ["图片压缩", "在线压缩图片", "JPG压缩", "PNG压缩", "批量压缩", "图片缩小", "压缩图片大小"],
    h1: "在线图片压缩",
    faq: [
      { q: "图片压缩后质量会变差吗？", a: "可以通过调整压缩质量参数控制，80% 质量通常肉眼无明显差异，文件大小可减少 60-80%。" },
      { q: "支持哪些图片格式？", a: "支持 JPG、PNG、WebP、GIF、BMP 格式，可批量上传多张图片同时压缩。" },
      { q: "图片会上传到服务器吗？", a: "不会。本工具完全在浏览器本地处理，图片不会离开你的设备。" },
    ],
  },
  "image-convert": {
    slug: "image-convert",
    title: "在线图片格式转换 - PNG/JPG/WebP/GIF互转",
    description: "免费在线图片格式转换工具，支持 PNG、JPG、WebP、GIF、BMP 格式互转。浏览器本地处理，无需安装软件，即开即用。",
    keywords: ["图片格式转换", "PNG转JPG", "JPG转PNG", "WebP转换", "图片转格式", "在线转换"],
    h1: "图片格式转换",
    faq: [
      { q: "PNG 和 JPG 有什么区别？", a: "PNG 支持透明背景、无损压缩，适合图标和截图；JPG 有损压缩体积更小，适合照片。" },
      { q: "WebP 格式有什么优势？", a: "WebP 是 Google 开发的格式，同等质量下体积比 JPG 小 25-35%，适合网页使用。" },
    ],
  },
  "image-crop": {
    slug: "image-crop",
    title: "在线图片裁剪 - 免费自由裁剪图片尺寸",
    description: "免费在线图片裁剪工具，支持自由裁剪、固定比例裁剪。鼠标拖拽选择裁剪区域，实时预览效果，浏览器本地处理。",
    keywords: ["图片裁剪", "在线裁剪", "图片剪切", "裁剪图片", "图片截取"],
    h1: "在线图片裁剪",
    faq: [
      { q: "可以裁剪成圆形吗？", a: "支持自由选区裁剪，可以通过拖拽选择任意矩形区域进行裁剪。" },
    ],
  },
  "image-resize": {
    slug: "image-resize",
    title: "在线图片缩放 - 调整图片尺寸大小",
    description: "免费在线图片缩放工具，按像素或百分比调整图片尺寸，支持锁定宽高比。适合调整头像、缩略图、社交媒体图片尺寸。",
    keywords: ["图片缩放", "调整图片大小", "图片尺寸修改", "图片放大缩小", "修改分辨率"],
    h1: "在线图片缩放",
    faq: [
      { q: "放大图片会模糊吗？", a: "位图放大会有一定模糊，建议放大不超过 200%。缩小不会影响清晰度。" },
    ],
  },
  "pdf-to-image": {
    slug: "pdf-to-image",
    title: "PDF转图片 - 在线将PDF转换为PNG/JPG图片",
    description: "在线 PDF 转图片工具，将 PDF 文件每页转换为高清 PNG 或 JPG 图片。支持多页 PDF，适合提取 PDF 中的内容用于演示或分享。",
    keywords: ["PDF转图片", "PDF转PNG", "PDF转JPG", "PDF导出图片", "PDF提取图片"],
    h1: "PDF 转图片",
    faq: [
      { q: "可以一次转换多页吗？", a: "支持多页 PDF 转换，每页会生成一张独立的图片文件。" },
      { q: "转换后的图片清晰度如何？", a: "默认 150 DPI 输出，适合屏幕查看和普通打印。" },
    ],
  },
  "pdf-merge": {
    slug: "pdf-merge",
    title: "PDF合并 - 在线免费合并多个PDF文件",
    description: "在线 PDF 合并工具，将多个 PDF 文件合并为一个。支持拖拽排序，操作简单，适合合并扫描件、报告、合同等文档。",
    keywords: ["PDF合并", "合并PDF", "多个PDF合并", "PDF拼接", "PDF合成一个"],
    h1: "PDF 合并",
    faq: [
      { q: "合并后的 PDF 会变大吗？", a: "合并后文件大小约等于各文件大小之和，不会额外增加体积。" },
      { q: "有文件数量限制吗？", a: "建议单次合并不超过 20 个文件，总大小不超过 50MB。" },
    ],
  },
  "pdf-split": {
    slug: "pdf-split",
    title: "PDF拆分 - 在线按页码拆分PDF文件",
    description: "在线 PDF 拆分工具，按页码范围将 PDF 拆分为多个文件。适合从长文档中提取特定页面，如提取合同签名页、报告摘要等。",
    keywords: ["PDF拆分", "PDF分割", "PDF提取页面", "PDF按页拆分", "PDF截取"],
    h1: "PDF 拆分",
    faq: [
      { q: "可以提取指定页码吗？", a: "可以，输入起始页和结束页即可提取指定范围的页面。" },
    ],
  },
  "pdf-compress": {
    slug: "pdf-compress",
    title: "PDF压缩 - 在线减小PDF文件大小",
    description: "在线 PDF 压缩工具，有效减小 PDF 文件体积。适合压缩扫描件、图片型 PDF，方便邮件发送和上传。压缩后保持可读性。",
    keywords: ["PDF压缩", "压缩PDF", "PDF缩小", "PDF减小体积", "PDF文件太大"],
    h1: "PDF 压缩",
    faq: [
      { q: "压缩后内容会丢失吗？", a: "不会丢失文字内容，主要通过降低内嵌图片分辨率来减小体积。" },
      { q: "能压缩多少？", a: "图片型 PDF 通常可压缩 50-80%，纯文字 PDF 压缩效果有限。" },
    ],
  },
  "word-to-pdf": {
    slug: "word-to-pdf",
    title: "Word转PDF - 在线将Word文档转换为PDF",
    description: "在线 Word 转 PDF 工具，支持 .doc 和 .docx 格式。保持原始排版和格式，适合将 Word 文档转为 PDF 用于打印、分享或存档。",
    keywords: ["Word转PDF", "doc转pdf", "docx转pdf", "Word文档转PDF", "在线转换Word"],
    h1: "Word 转 PDF",
    faq: [
      { q: "转换后格式会变吗？", a: "使用 LibreOffice 引擎转换，大部分格式可以保持，复杂排版可能有细微差异。" },
      { q: "支持哪些 Word 格式？", a: "支持 .doc（Word 97-2003）和 .docx（Word 2007+）两种格式。" },
    ],
  },
  "json-formatter": {
    slug: "json-formatter",
    title: "JSON格式化 - 在线JSON美化/压缩/校验工具",
    description: "免费在线 JSON 格式化工具，支持 JSON 美化缩进、压缩为一行、语法校验。开发者必备工具，快速排查 JSON 格式错误。",
    keywords: ["JSON格式化", "JSON美化", "JSON压缩", "JSON校验", "JSON在线工具", "JSON验证"],
    h1: "JSON 格式化",
    faq: [
      { q: "JSON 格式错误怎么排查？", a: "粘贴 JSON 后点击校验，工具会提示具体的错误位置和原因。" },
      { q: "数据会上传吗？", a: "不会，所有处理在浏览器本地完成，数据不会发送到任何服务器。" },
    ],
  },
  "qrcode-generate": {
    slug: "qrcode-generate",
    title: "二维码生成器 - 在线免费生成二维码",
    description: "免费在线二维码生成工具，支持文本、网址、WiFi 信息生成二维码。可自定义颜色、尺寸，支持下载 PNG 图片。",
    keywords: ["二维码生成", "生成二维码", "二维码制作", "在线二维码", "免费二维码"],
    h1: "二维码生成器",
    faq: [
      { q: "生成的二维码有有效期吗？", a: "没有，二维码是静态编码，生成后永久有效，内容不会改变。" },
      { q: "可以自定义颜色吗？", a: "可以，支持自定义前景色和背景色，但建议保持足够对比度确保可扫描。" },
    ],
  },
  "video-compress": {
    slug: "video-compress",
    title: "在线视频压缩 - 免费压缩MP4视频文件大小",
    description: "在线视频压缩工具，通过调整 CRF 质量参数压缩 MP4 视频文件大小。适合压缩视频用于微信发送、邮件附件、网页上传。",
    keywords: ["视频压缩", "压缩视频", "MP4压缩", "视频缩小", "视频文件太大"],
    h1: "在线视频压缩",
    faq: [
      { q: "压缩后画质会变差吗？", a: "CRF 值越小画质越好。默认 28 适合日常使用，23 以下接近无损。" },
      { q: "支持哪些视频格式？", a: "支持 MP4、MOV、WebM、AVI 等常见格式，输出统一为 MP4。" },
    ],
  },
  "markdown-preview": {
    slug: "markdown-preview",
    title: "Markdown在线预览 - 实时渲染Markdown编辑器",
    description: "免费在线 Markdown 预览工具，分屏实时渲染，支持标题、列表、代码块、表格等语法。可导出为 HTML 文件，适合写文档和博客。",
    keywords: ["Markdown预览", "Markdown编辑器", "在线Markdown", "Markdown渲染", "MD预览"],
    h1: "Markdown 在线预览",
    faq: [
      { q: "支持哪些 Markdown 语法？", a: "支持标准 Markdown 语法：标题、列表、粗体、斜体、代码块、表格、引用、链接、图片等。" },
    ],
  },
  "timestamp-converter": {
    slug: "timestamp-converter",
    title: "Unix时间戳转换 - 在线时间戳与日期互转",
    description: "免费在线 Unix 时间戳转换工具，支持时间戳转日期、日期转时间戳双向转换。显示当前时间戳，开发者调试必备。",
    keywords: ["时间戳转换", "Unix时间戳", "时间戳转日期", "日期转时间戳", "timestamp"],
    h1: "Unix 时间戳转换",
    faq: [
      { q: "秒级和毫秒级时间戳怎么区分？", a: "10 位数字是秒级（如 1715400000），13 位是毫秒级（如 1715400000000），工具会自动识别。" },
    ],
  },
  "image-watermark": {
    slug: "image-watermark",
    title: "图片加水印 - 在线给图片添加文字水印",
    description: "在线图片加水印工具，支持添加自定义文字水印，可调整透明度、字号和位置。适合保护图片版权，防止盗用。",
    keywords: ["图片加水印", "添加水印", "文字水印", "图片版权保护", "批量加水印"],
    h1: "图片加水印",
    faq: [
      { q: "水印可以去掉吗？", a: "可见水印嵌入到图片像素中，无法无损去除。建议同时使用隐形水印追踪来源。" },
    ],
  },
  "color-converter": {
    slug: "color-converter",
    title: "颜色转换器 - HEX/RGB/HSL颜色格式在线互转",
    description: "免费在线颜色转换工具，支持 HEX、RGB、HSL 三种颜色格式互转。带取色器和颜色预览，设计师和前端开发者必备。",
    keywords: ["颜色转换", "HEX转RGB", "RGB转HEX", "HSL转换", "颜色代码", "取色器"],
    h1: "颜色转换器",
    faq: [
      { q: "HEX 和 RGB 有什么区别？", a: "HEX 是十六进制表示（如 #FF0000），RGB 是十进制（如 rgb(255,0,0)），表示同一颜色。" },
    ],
  },
  "signature-create": {
    slug: "signature-create",
    title: "电子签名生成 - 在线手写签名制作工具",
    description: "免费在线电子签名生成工具，手写板绘制签名，支持导出 PNG（透明背景）和 SVG 格式。适合制作个人签名图片。",
    keywords: ["电子签名", "手写签名", "签名生成", "在线签名", "签名图片"],
    h1: "电子签名生成",
    faq: [
      { q: "生成的签名有法律效力吗？", a: "本工具生成的签名图片仅供参考，不具备法律效力。如需法律效力请使用经认证的电子签名平台。" },
    ],
  },
}

export function getToolSeo(slug: string): ToolSeo | undefined {
  return toolSeoData[slug]
}
