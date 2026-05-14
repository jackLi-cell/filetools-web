/**
 * 工具目录数据
 *
 * !!! 重要 !!!
 * 本文件是 site/src/config/tools.ts 的**副本**，由 Phase 4 工具路由需要在后端做 zod 校验
 * 后端只读，**不要直接修改**这个文件——应改 site/src/config/tools.ts 然后同步过来。
 *
 * 同步规则：
 * - tools 数组：slug / name / description / category / isFree / creditsCost / isLocal / version 必须保持一致
 * - categories 数组：slug / name / description / icon / toolCount 必须保持一致
 * - 加新工具时：先改前端，再同步后端
 *
 * 同步检查（可在 CI 加 diff 检查）：
 *   diff site/src/config/tools.ts site/server/src/shared/tools.ts
 *
 * 上次同步时间: 2026-05-14
 */

export interface Tool {
  slug: string
  name: string
  description: string
  category: string
  isFree: boolean
  creditsCost: number
  isLocal: boolean
  version: string
}

export interface ToolCategory {
  slug: string
  name: string
  description: string
  icon: string
  toolCount: number
}

export const categories: ToolCategory[] = [
  { slug: "image", name: "图片处理", description: "压缩、格式转换、裁剪、缩放", icon: "🖼️", toolCount: 15 },
  { slug: "pdf", name: "PDF 工具", description: "转换、合并、拆分、压缩、加密", icon: "📄", toolCount: 11 },
  { slug: "convert", name: "文档转换", description: "Word、Excel、PPT 格式互转", icon: "🔄", toolCount: 14 },
  { slug: "video", name: "视频处理", description: "压缩、格式转换、截取、转 GIF", icon: "🎬", toolCount: 5 },
  { slug: "audio", name: "音频处理", description: "格式转换、压缩、裁剪、合并", icon: "🎵", toolCount: 6 },
  { slug: "markdown", name: "Markdown", description: "预览、转 HTML、转 PDF", icon: "📝", toolCount: 4 },
  { slug: "dev", name: "开发者工具", description: "JSON、正则、时间戳、编码", icon: "⚡", toolCount: 9 },
  { slug: "qrcode", name: "二维码工具", description: "生成、识别、条形码", icon: "📱", toolCount: 4 },
  { slug: "text", name: "文本工具", description: "字数统计、去重、大小写转换", icon: "✏️", toolCount: 8 },
  { slug: "security", name: "文件安全", description: "哈希校验、元数据清除", icon: "🔒", toolCount: 3 },
  { slug: "signature", name: "电子签名", description: "手写签名、插入 PDF", icon: "✍️", toolCount: 2 },
]

export const tools: Tool[] = [
  // 图片处理
  { slug: "image-compress", name: "图片压缩", description: "调整质量和大小，支持批量压缩", category: "image", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "image-convert", name: "图片格式转换", description: "PNG、JPG、WebP、GIF、BMP 互转", category: "image", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "image-crop", name: "图片裁剪", description: "自由裁剪、固定比例、圆形裁剪", category: "image", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "image-resize", name: "图片缩放", description: "按像素或百分比调整尺寸", category: "image", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "image-base64", name: "图片 Base64 互转", description: "图片转 Base64 编码或反向转换", category: "image", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "image-watermark", name: "图片加水印", description: "添加文字或图片可见水印", category: "image", isFree: false, creditsCost: 2, isLocal: false, version: "v0.1" },
  { slug: "image-steganography", name: "隐形水印", description: "嵌入不可见水印用于版权追踪", category: "image", isFree: false, creditsCost: 3, isLocal: false, version: "v0.1" },
  { slug: "image-steganography-detect", name: "隐形水印检测", description: "提取和检测图片中的隐形水印", category: "image", isFree: false, creditsCost: 3, isLocal: false, version: "v0.1" },
  { slug: "image-remove-bg", name: "图片去背景", description: "AI 智能抠图去除背景", category: "image", isFree: false, creditsCost: 5, isLocal: false, version: "v0.3" },
  { slug: "image-id-photo", name: "证件照换底色", description: "一键更换证件照背景颜色", category: "image", isFree: false, creditsCost: 3, isLocal: false, version: "v0.3" },
  { slug: "image-ocr", name: "图片文字识别", description: "OCR 提取图片中的文字内容", category: "image", isFree: false, creditsCost: 3, isLocal: false, version: "v0.3" },
  { slug: "image-exif", name: "EXIF 信息查看/清除", description: "查看或清除图片元数据信息", category: "image", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "image-svg-convert", name: "SVG 转 PNG/JPG", description: "将 SVG 矢量图转为位图格式", category: "image", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "image-collage", name: "图片拼接", description: "多张图片拼接为一张长图或拼图", category: "image", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  // PDF 工具
  { slug: "pdf-to-image", name: "PDF 转图片", description: "将 PDF 每页转为 PNG 或 JPG 图片", category: "pdf", isFree: false, creditsCost: 1, isLocal: false, version: "v0.1" },
  { slug: "image-to-pdf", name: "图片转 PDF", description: "将多张图片合并为一个 PDF 文件", category: "pdf", isFree: false, creditsCost: 1, isLocal: false, version: "v0.1" },
  { slug: "pdf-merge", name: "PDF 合并", description: "将多个 PDF 文件合并为一个", category: "pdf", isFree: false, creditsCost: 1, isLocal: false, version: "v0.1" },
  { slug: "pdf-split", name: "PDF 拆分", description: "将 PDF 按页码拆分为多个文件", category: "pdf", isFree: false, creditsCost: 1, isLocal: false, version: "v0.1" },
  { slug: "pdf-compress", name: "PDF 压缩", description: "减小 PDF 文件体积", category: "pdf", isFree: false, creditsCost: 2, isLocal: false, version: "v0.1" },
  // 开发者工具
  { slug: "json-formatter", name: "JSON 格式化", description: "格式化、压缩、校验 JSON 数据", category: "dev", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "regex-tester", name: "正则表达式测试", description: "实时匹配测试和分组高亮", category: "dev", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "timestamp-converter", name: "时间戳转换", description: "Unix 时间戳与日期时间互转", category: "dev", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "url-codec", name: "URL 编码/解码", description: "URL 编码和解码转换", category: "dev", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "hash-generator", name: "哈希计算", description: "MD5、SHA1、SHA256、SHA512 哈希", category: "dev", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "uuid-generator", name: "UUID/密码生成", description: "生成 UUID 和随机安全密码", category: "dev", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "jwt-decoder", name: "JWT 解码", description: "解码 JWT Token 查看 Header 和 Payload", category: "dev", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "xml-formatter", name: "XML/YAML 格式化", description: "格式化 XML 和 YAML 数据", category: "dev", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  // 二维码
  { slug: "qrcode-generate", name: "二维码生成", description: "生成二维码，支持 Logo 和自定义颜色", category: "qrcode", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "qrcode-decode", name: "二维码识别", description: "上传图片识别二维码内容", category: "qrcode", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "barcode-generate", name: "条形码生成", description: "生成 EAN、UPC、Code128 条形码", category: "qrcode", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  // Markdown
  { slug: "markdown-preview", name: "Markdown 预览", description: "实时预览 Markdown 渲染效果", category: "markdown", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "markdown-to-html", name: "Markdown 转 HTML", description: "将 Markdown 导出为完整 HTML 文件", category: "markdown", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  // 文本工具
  { slug: "word-counter", name: "字数统计", description: "统计字数、字符、行数、段落数", category: "text", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "text-dedup", name: "文本去重", description: "按行去重并统计重复次数", category: "text", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "case-converter", name: "大小写转换", description: "全大写、全小写、首字母、驼峰、下划线", category: "text", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "color-converter", name: "颜色转换器", description: "HEX、RGB、HSL 颜色格式互转", category: "text", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  // 视频处理（后端）
  { slug: "video-compress", name: "视频压缩", description: "调整 CRF 质量压缩视频", category: "video", isFree: false, creditsCost: 5, isLocal: false, version: "v0.1" },
  { slug: "video-convert", name: "视频格式转换", description: "MP4、WebM、MOV、AVI 互转", category: "video", isFree: false, creditsCost: 5, isLocal: false, version: "v0.1" },
  { slug: "video-to-gif", name: "视频转 GIF", description: "视频片段转 GIF 动图", category: "video", isFree: false, creditsCost: 3, isLocal: false, version: "v0.1" },
  { slug: "video-extract-audio", name: "视频提取音频", description: "从视频中提取音轨为 MP3", category: "video", isFree: false, creditsCost: 2, isLocal: false, version: "v0.1" },
  // 音频处理（后端）
  { slug: "audio-convert", name: "音频格式转换", description: "MP3、WAV、FLAC、AAC、OGG 互转", category: "audio", isFree: false, creditsCost: 3, isLocal: false, version: "v0.1" },
  { slug: "audio-compress", name: "音频压缩", description: "调整比特率压缩音频", category: "audio", isFree: false, creditsCost: 2, isLocal: false, version: "v0.1" },
  { slug: "audio-trim", name: "音频裁剪", description: "截取音频片段", category: "audio", isFree: false, creditsCost: 2, isLocal: false, version: "v0.1" },
  { slug: "audio-merge", name: "音频合并", description: "多个音频拼接", category: "audio", isFree: false, creditsCost: 2, isLocal: false, version: "v0.1" },
  // 其他
  { slug: "html-to-markdown", name: "HTML 转 Markdown", description: "将 HTML 转为 Markdown 格式", category: "markdown", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "signature-create", name: "电子签名生成", description: "手写板生成签名图片", category: "signature", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  // 新增工具（Phase 7 扩展）
  { slug: "favicon-generator", name: "Favicon 生成器", description: "生成全尺寸网站图标和 App Icon", category: "dev", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "table-converter", name: "表格转 Markdown/HTML", description: "将表格数据转为 Markdown 或 HTML 格式", category: "text", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "text-replace", name: "文本批量替换", description: "批量查找替换和文本差异对比", category: "text", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "data-mask", name: "数据脱敏", description: "自动识别并脱敏手机号、身份证、邮箱等", category: "text", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  { slug: "text-cleaner", name: "文本清理", description: "去除多余空格、空行、乱码和格式问题", category: "text", isFree: true, creditsCost: 0, isLocal: true, version: "v0.1" },
  // 文档转换（LibreOffice）
  { slug: "word-to-pdf", name: "Word 转 PDF", description: "将 Word 文档转换为 PDF 格式", category: "convert", isFree: false, creditsCost: 3, isLocal: false, version: "v0.1" },
  { slug: "pdf-to-word", name: "PDF 转 Word", description: "将 PDF 转换为可编辑的 Word 文档", category: "convert", isFree: false, creditsCost: 5, isLocal: false, version: "v0.1" },
  { slug: "excel-to-pdf", name: "Excel 转 PDF", description: "将 Excel 表格转换为 PDF 格式", category: "convert", isFree: false, creditsCost: 3, isLocal: false, version: "v0.1" },
  { slug: "excel-to-image", name: "Excel 转图片", description: "将 Excel 表格转换为 PNG 图片", category: "convert", isFree: false, creditsCost: 4, isLocal: false, version: "v0.1" },
  { slug: "ppt-to-pdf", name: "PPT 转 PDF", description: "将 PPT 演示文稿转换为 PDF", category: "convert", isFree: false, creditsCost: 3, isLocal: false, version: "v0.1" },
  { slug: "ppt-to-image", name: "PPT 转图片", description: "将 PPT 每页转换为 PNG 图片", category: "convert", isFree: false, creditsCost: 5, isLocal: false, version: "v0.1" },
  { slug: "word-to-image", name: "Word 转图片", description: "将 Word 文档转换为 PNG 图片", category: "convert", isFree: false, creditsCost: 4, isLocal: false, version: "v0.1" },
]

export function getToolsByCategory(categorySlug: string): Tool[] {
  return tools.filter(t => t.category === categorySlug && t.version === "v0.1")
}

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find(t => t.slug === slug)
}

export function getCategoryBySlug(slug: string): ToolCategory | undefined {
  return categories.find(c => c.slug === slug)
}
