import crypto from "crypto"
import { marked } from "marked"
import { writeBufferToStorage } from "../config/storage.js"
import { tools as TOOLS, getToolBySlug } from "../shared/tools.js"
import type { StoredAttachment } from "./attachment-store.js"
import { submitProcessTask, sanitizeFileName, type ProcessInputFile } from "./process-task-service.js"

export type ToolParamValue = string | number | boolean | null

export interface ExecuteToolRequest {
  slug: string
  reason: string
  params?: Record<string, ToolParamValue>
  attachmentId?: string
}

export interface ToolHarnessContext {
  attachments: StoredAttachment[]
  userId?: number
  ipAddress?: string
}

export interface HarnessToolDefinition {
  slug: string
  name: string
  description: string
  category: string
}

export type ToolHarnessResult =
  | {
      kind: "process_task"
      slug: string
      toolName: string
      reason: string
      taskId: string
      creditsCost: number
      fileCount: number
      inputFileName: string
      message: string
    }
  | {
      kind: "redirect"
      slug: string
      toolName: string
      reason: string
      params: Record<string, ToolParamValue>
      attachmentId: string | null
      signedToken: string | null
      expiresAt: number | null
      attachmentName: string | null
      attachmentMime: string | null
      message: string
    }
  | {
      kind: "inline_result"
      slug: string
      toolName: string
      reason: string
      resultText: string
      message: string
    }
  | {
      kind: "error"
      slug: string
      toolName: string
      reason: string
      message: string
      status?: number
    }

const SERVER_TOOL_DEFINITIONS: HarnessToolDefinition[] = [
  { slug: "pdf-to-image", name: "PDF 转图片", description: "将 PDF 每页转为 PNG 或 JPG 图片", category: "pdf" },
  { slug: "image-to-pdf", name: "图片转 PDF", description: "将多张图片合并为一个 PDF 文件", category: "pdf" },
  { slug: "pdf-merge", name: "PDF 合并", description: "将多个 PDF 文件合并为一个", category: "pdf" },
  { slug: "pdf-split", name: "PDF 拆分", description: "将 PDF 按页码拆分为多个文件", category: "pdf" },
  { slug: "pdf-compress", name: "PDF 压缩", description: "减小 PDF 文件体积", category: "pdf" },
  { slug: "pdf-rotate", name: "PDF 页面旋转", description: "旋转 PDF 指定页面方向", category: "pdf" },
  { slug: "pdf-extract", name: "PDF 提取指定页", description: "从 PDF 中提取指定页码", category: "pdf" },
  { slug: "pdf-encrypt", name: "PDF 加密", description: "为 PDF 设置密码保护", category: "pdf" },
  { slug: "pdf-decrypt", name: "PDF 解密", description: "移除 PDF 密码保护", category: "pdf" },
  { slug: "pdf-page-number", name: "PDF 添加页码", description: "为 PDF 每页添加页码", category: "pdf" },
  { slug: "word-to-pdf", name: "Word 转 PDF", description: "将 Word 文档转换为 PDF 格式", category: "convert" },
  { slug: "pdf-to-word", name: "PDF 转 Word", description: "将 PDF 转换为可编辑的 Word 文档", category: "convert" },
  { slug: "excel-to-pdf", name: "Excel 转 PDF", description: "将 Excel 表格转换为 PDF 格式", category: "convert" },
  { slug: "excel-to-image", name: "Excel 转图片", description: "将 Excel 表格转换为 PNG 图片", category: "convert" },
  { slug: "ppt-to-pdf", name: "PPT 转 PDF", description: "将 PPT 演示文稿转换为 PDF", category: "convert" },
  { slug: "ppt-to-image", name: "PPT 转图片", description: "将 PPT 每页转换为 PNG 图片", category: "convert" },
  { slug: "word-to-image", name: "Word 转图片", description: "将 Word 文档转换为 PNG 图片", category: "convert" },
  { slug: "video-compress", name: "视频压缩", description: "调整质量压缩视频", category: "video" },
  { slug: "video-convert", name: "视频格式转换", description: "MP4、WebM、MOV、AVI 互转", category: "video" },
  { slug: "video-to-gif", name: "视频转 GIF", description: "视频片段转 GIF 动图", category: "video" },
  { slug: "video-extract-audio", name: "视频提取音频", description: "从视频中提取音轨", category: "video" },
  { slug: "video-clip", name: "视频截取片段", description: "截取视频指定时间段", category: "video" },
  { slug: "audio-convert", name: "音频格式转换", description: "MP3、WAV、FLAC、AAC、OGG 互转", category: "audio" },
  { slug: "audio-compress", name: "音频压缩", description: "调整比特率压缩音频", category: "audio" },
  { slug: "audio-trim", name: "音频裁剪", description: "截取音频片段", category: "audio" },
  { slug: "audio-merge", name: "音频合并", description: "多个音频拼接", category: "audio" },
  { slug: "audio-speed", name: "音频变速/变调", description: "调整音频速度或音调", category: "audio" },
  { slug: "audio-denoise", name: "音频降噪", description: "降低音频背景噪声", category: "audio" },
  { slug: "image-watermark", name: "图片加水印", description: "添加文字或图片可见水印", category: "image" },
  { slug: "image-steganography", name: "隐形水印", description: "嵌入不可见水印用于版权追踪", category: "image" },
  { slug: "image-steganography-detect", name: "隐形水印检测", description: "提取和检测图片中的隐形水印", category: "image" },
  { slug: "file-hash", name: "文件哈希校验", description: "计算文件 MD5/SHA256 哈希值", category: "security" },
  { slug: "image-metadata-clear", name: "图片元数据清除", description: "批量清除图片 EXIF 等元数据", category: "security" },
  { slug: "pdf-metadata-clear", name: "PDF 元数据清除", description: "清除 PDF 文件元数据信息", category: "security" },
  { slug: "csv-to-excel", name: "CSV 转 Excel", description: "将 CSV 文件转换为 Excel 表格", category: "convert" },
  { slug: "excel-to-csv", name: "Excel 转 CSV", description: "将 Excel 表格转换为 CSV 文件", category: "convert" },
  { slug: "batch-qrcode", name: "批量二维码生成", description: "批量生成多个二维码", category: "qrcode" },
  { slug: "signature-pdf", name: "签名插入 PDF", description: "将签名图片插入 PDF 指定位置", category: "signature" },
  { slug: "markdown-to-pdf", name: "Markdown 转 PDF", description: "将 Markdown 导出为带样式 PDF", category: "markdown" },
  { slug: "html-to-pdf", name: "HTML 转 PDF", description: "将 HTML 内容导出为 PDF", category: "markdown" },
]

const serverToolBySlug = new Map(SERVER_TOOL_DEFINITIONS.map((tool) => [tool.slug, tool]))
export const SERVER_EXECUTABLE_FILE_TOOLS = new Set(SERVER_TOOL_DEFINITIONS.map((tool) => tool.slug))
export const HARNESS_TOOL_SLUGS = Array.from(new Set([...TOOLS.map((tool) => tool.slug), ...SERVER_TOOL_DEFINITIONS.map((tool) => tool.slug)]))
export const HARNESS_TOOL_DEFINITIONS: HarnessToolDefinition[] = HARNESS_TOOL_SLUGS.map((slug) => {
  const tool = getToolBySlug(slug)
  if (tool) {
    return {
      slug: tool.slug,
      name: tool.name,
      description: tool.description,
      category: tool.category,
    }
  }
  return serverToolBySlug.get(slug)!
})

const INLINE_TEXT_TOOLS = new Set([
  "word-counter",
  "text-dedup",
  "case-converter",
  "text-cleaner",
  "url-codec",
  "json-formatter",
  "jwt-decoder",
  "uuid-generator",
  "hash-generator",
  "timestamp-converter",
  "color-converter",
  "data-mask",
  "markdown-to-html",
  "html-to-markdown",
])

const toolBySlug = new Map(TOOLS.map((tool) => [tool.slug, tool]))
const USE_ALL_MATCHING_ATTACHMENTS_TOOLS = new Set(["pdf-merge", "image-to-pdf"])

const TOOL_ALIASES = new Map<string, string>([
  ["image-exif", "image-metadata-clear"],
])

function normalizeToolSlug(slug: string): string {
  return TOOL_ALIASES.get(slug) ?? slug
}

function getCatalogTool(slug: string) {
  const normalized = normalizeToolSlug(slug)
  return getToolBySlug(slug) ?? getToolBySlug(normalized) ?? serverToolBySlug.get(normalized)
}

function getToolName(slug: string): string {
  return getCatalogTool(slug)?.name ?? slug
}

function normalizeParams(params: Record<string, ToolParamValue> | undefined): Record<string, ToolParamValue> {
  const out: Record<string, ToolParamValue> = {}
  for (const [key, value] of Object.entries(params || {})) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      out[key] = value
    }
  }
  return out
}

function attachmentMatchesTool(slug: string, attachment: StoredAttachment): boolean {
  const mime = attachment.mime.toLowerCase()
  const name = attachment.name.toLowerCase()

  if (slug.startsWith("pdf-") || slug === "pdf-to-word" || slug === "pdf-metadata-clear" || slug === "signature-pdf") {
    return mime === "application/pdf" || name.endsWith(".pdf")
  }
  if (slug === "image-to-pdf" || slug.startsWith("image-")) {
    return mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name)
  }
  if (slug.startsWith("video-")) {
    return mime.startsWith("video/") || /\.(mp4|webm|mov|avi)$/i.test(name)
  }
  if (slug.startsWith("audio-")) {
    return mime.startsWith("audio/") || /\.(mp3|wav|ogg|flac|aac)$/i.test(name)
  }
  if (slug === "word-to-pdf" || slug === "word-to-image") {
    return /word|msword/i.test(mime) || /\.(docx?|rtf)$/i.test(name)
  }
  if (slug === "excel-to-pdf" || slug === "excel-to-image") {
    return /spreadsheet|excel/i.test(mime) || /\.xlsx?$/i.test(name)
  }
  if (slug === "ppt-to-pdf" || slug === "ppt-to-image") {
    return /presentation|powerpoint/i.test(mime) || /\.pptx?$/i.test(name)
  }
  if (slug === "markdown-to-pdf") {
    return mime.includes("markdown") || mime.startsWith("text/") || /\.(md|markdown|txt)$/i.test(name)
  }
  if (slug === "html-to-pdf") {
    return mime.includes("html") || /\.html?$/i.test(name)
  }
  if (slug === "csv-to-excel" || slug === "batch-qrcode") {
    return mime === "text/csv" || mime.startsWith("text/") || /\.(csv|txt)$/i.test(name)
  }
  if (slug === "excel-to-csv") {
    return /spreadsheet|excel/i.test(mime) || /\.xlsx?$/i.test(name)
  }
  if (slug === "image-metadata-clear") {
    return mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(name)
  }
  if (slug === "file-hash") {
    return true
  }
  return true
}

type AttachmentKind =
  | "pdf"
  | "word"
  | "excel"
  | "ppt"
  | "image"
  | "video"
  | "audio"
  | "markdown"
  | "html"
  | "csv"
  | null

function getAttachmentKind(attachment: StoredAttachment | undefined): AttachmentKind {
  if (!attachment) return null
  const mime = attachment.mime.toLowerCase()
  const name = attachment.name.toLowerCase()

  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf"
  if (/word|msword/i.test(mime) || /\.(docx?|rtf)$/i.test(name)) return "word"
  if (/spreadsheet|excel/i.test(mime) || /\.xlsx?$/i.test(name)) return "excel"
  if (/presentation|powerpoint/i.test(mime) || /\.pptx?$/i.test(name)) return "ppt"
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name)) return "image"
  if (mime.startsWith("video/") || /\.(mp4|webm|mov|avi)$/i.test(name)) return "video"
  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|flac|aac)$/i.test(name)) return "audio"
  if (mime.includes("markdown") || /\.(md|markdown)$/i.test(name)) return "markdown"
  if (mime.includes("html") || /\.html?$/i.test(name)) return "html"
  if (mime === "text/csv" || /\.(csv|tsv)$/i.test(name)) return "csv"

  return null
}

function inferToolFromAttachmentIntent(text: string, kind: AttachmentKind): { slug: string; reason: string; params?: Record<string, ToolParamValue> } | null {
  if (!kind) return null
  const lower = text.toLowerCase()
  const hasConversionVerb = /(转|转换|导出|输出|生成|做成|换成|变成|保存为|另存为|convert|export)/i.test(lower)
  const wantsPdfOutput = hasConversionVerb && /pdf/i.test(lower)
  const wantsImageOutput = hasConversionVerb && /(图片|图像|照片|png|jpe?g|jpg|webp)/i.test(lower)
  const wantsWordOutput = hasConversionVerb && /(word|docx?|可编辑文档)/i.test(lower)
  const wantsExcelOutput = hasConversionVerb && /(excel|xlsx?)/i.test(lower)
  const wantsCsvOutput = hasConversionVerb && /\bcsv\b/i.test(lower)
  const wantsGifOutput = hasConversionVerb && /(gif|动图)/i.test(lower)
  const wantsAudioOutput = hasConversionVerb && /(音频|提取音频|mp3|wav|flac|aac|ogg)/i.test(lower)
  const wantsCompression = /(压缩|缩小|减小|压到|变小|体积|compress)/i.test(lower)
  const wantsMerge = /(合并|拼接|组合|merge)/i.test(lower)
  const wantsSplit = /(拆分|分割|拆页|拆开|split)/i.test(lower)
  const wantsEncrypt = /(加密|密码保护|encrypt)/i.test(lower)
  const wantsDecrypt = /(解密|去密码|decrypt)/i.test(lower)
  const wantsPageNumber = /(页码|页脚编号)/i.test(lower)
  const wantsRotate = /(旋转|转正|rotate)/i.test(lower)
  const wantsExtractPage = /(提取|导出).{0,8}页|页.{0,8}(提取|导出)/i.test(lower)
  const wantsWatermark = /水印/i.test(lower)
  const wantsMetadataClear = /(元数据|metadata|exif).{0,8}(清除|删除|去除|移除)|(清除|删除|去除|移除).{0,8}(元数据|metadata|exif)/i.test(lower)
  const wantsHash = /(哈希|hash|md5|sha)/i.test(lower)

  if (wantsPdfOutput) {
    if (kind === "word") return { slug: "word-to-pdf", reason: "根据 Word 附件和转 PDF 意图自动调用 Word 转 PDF" }
    if (kind === "excel") return { slug: "excel-to-pdf", reason: "根据 Excel 附件和转 PDF 意图自动调用 Excel 转 PDF" }
    if (kind === "ppt") return { slug: "ppt-to-pdf", reason: "根据 PPT 附件和转 PDF 意图自动调用 PPT 转 PDF" }
    if (kind === "image") return { slug: "image-to-pdf", reason: "根据图片附件和转 PDF 意图自动调用图片转 PDF" }
    if (kind === "markdown") return { slug: "markdown-to-pdf", reason: "根据 Markdown 附件和转 PDF 意图自动调用 Markdown 转 PDF" }
    if (kind === "html") return { slug: "html-to-pdf", reason: "根据 HTML 附件和转 PDF 意图自动调用 HTML 转 PDF" }
  }

  if (wantsImageOutput) {
    if (kind === "pdf") return { slug: "pdf-to-image", reason: "根据 PDF 附件和转图片意图自动调用 PDF 转图片" }
    if (kind === "word") return { slug: "word-to-image", reason: "根据 Word 附件和转图片意图自动调用 Word 转图片" }
    if (kind === "excel") return { slug: "excel-to-image", reason: "根据 Excel 附件和转图片意图自动调用 Excel 转图片" }
    if (kind === "ppt") return { slug: "ppt-to-image", reason: "根据 PPT 附件和转图片意图自动调用 PPT 转图片" }
  }

  if (wantsWordOutput && kind === "pdf") return { slug: "pdf-to-word", reason: "根据 PDF 附件和转 Word 意图自动调用 PDF 转 Word" }
  if (wantsCsvOutput && kind === "excel") return { slug: "excel-to-csv", reason: "根据 Excel 附件和转 CSV 意图自动调用 Excel 转 CSV" }
  if (wantsExcelOutput && kind === "csv") return { slug: "csv-to-excel", reason: "根据 CSV 附件和转 Excel 意图自动调用 CSV 转 Excel" }
  if (wantsGifOutput && kind === "video") return { slug: "video-to-gif", reason: "根据视频附件和转 GIF 意图自动调用视频转 GIF" }
  if (wantsAudioOutput && kind === "video") return { slug: "video-extract-audio", reason: "根据视频附件和提取音频意图自动调用视频提取音频" }

  if (wantsCompression) {
    if (kind === "pdf") return { slug: "pdf-compress", reason: "根据 PDF 附件和压缩意图自动调用 PDF 压缩" }
    if (kind === "video") return { slug: "video-compress", reason: "根据视频附件和压缩意图自动调用视频压缩" }
    if (kind === "audio") return { slug: "audio-compress", reason: "根据音频附件和压缩意图自动调用音频压缩" }
    if (kind === "image") return { slug: "image-compress", reason: "根据图片附件和压缩意图打开图片压缩工具" }
  }

  if (kind === "pdf") {
    if (wantsMerge) return { slug: "pdf-merge", reason: "根据 PDF 附件和合并意图自动调用 PDF 合并" }
    if (wantsSplit) return { slug: "pdf-split", reason: "根据 PDF 附件和拆分意图自动调用 PDF 拆分" }
    if (wantsEncrypt) return { slug: "pdf-encrypt", reason: "根据 PDF 附件和加密意图自动调用 PDF 加密" }
    if (wantsDecrypt) return { slug: "pdf-decrypt", reason: "根据 PDF 附件和解密意图自动调用 PDF 解密" }
    if (wantsPageNumber) return { slug: "pdf-page-number", reason: "根据 PDF 附件和页码意图自动调用 PDF 添加页码" }
    if (wantsRotate) return { slug: "pdf-rotate", reason: "根据 PDF 附件和旋转意图自动调用 PDF 旋转" }
    if (wantsExtractPage) return { slug: "pdf-extract", reason: "根据 PDF 附件和提取页码意图自动调用 PDF 提取指定页" }
  }

  if (wantsWatermark && kind === "image") {
    return {
      slug: "image-watermark",
      reason: "根据图片附件和加水印意图自动调用图片加水印",
      params: { text: text.match(/水印[:：]?\s*(.+)$/)?.[1] || "CatConvert" },
    }
  }

  if (wantsMetadataClear) {
    if (kind === "image") return { slug: "image-metadata-clear", reason: "根据图片附件和清除元数据意图自动调用图片元数据清除" }
    if (kind === "pdf") return { slug: "pdf-metadata-clear", reason: "根据 PDF 附件和清除元数据意图自动调用 PDF 元数据清除" }
  }

  if (wantsHash) {
    return { slug: "file-hash", reason: "根据附件和哈希校验意图自动调用文件哈希校验" }
  }

  return null
}

function selectAttachments(slug: string, context: ToolHarnessContext, attachmentId?: string): StoredAttachment[] {
  if (attachmentId) {
    const selected = context.attachments.find((attachment) => attachment.id === attachmentId)
    return selected ? [selected] : []
  }
  return context.attachments.filter((attachment) => attachmentMatchesTool(slug, attachment))
}

function keySafeFileName(name: string): string {
  return sanitizeFileName(name).replace(/[^\x20-\x7E]/g, "_") || "upload"
}

async function copyAttachmentsToToolUploads(slug: string, attachments: StoredAttachment[]): Promise<ProcessInputFile[]> {
  const batchId = crypto.randomUUID()
  const files: ProcessInputFile[] = []
  for (let i = 0; i < attachments.length; i++) {
    const attachment = attachments[i]!
    const fileName = keySafeFileName(attachment.name)
    const key = `uploads/${slug}/${batchId}/${String(i + 1).padStart(2, "0")}_${fileName}`
    const size = await writeBufferToStorage(key, attachment.buffer)
    files.push({ fileKey: key, fileName: attachment.name, fileSize: size, contentType: attachment.mime })
  }
  return files
}

function getAttachmentText(attachments: StoredAttachment[]): string {
  return attachments
    .map((attachment) => attachment.extractedText || attachment.buffer.toString("utf8"))
    .filter((text) => text.trim().length > 0)
    .join("\n")
}

function countCjk(text: string): number {
  return (text.match(/[\u3400-\u9fff]/g) || []).length
}

function countWords(text: string): number {
  return (text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) || []).length
}

function countLines(text: string): number {
  if (!text) return 0
  return text.split(/\r?\n/).length
}

function getSingleAttachmentOrText(text: string, attachments: StoredAttachment[]): string {
  return text.trim() || getAttachmentText(attachments)
}

function formatTimestamp(value: number): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "无效时间"
  return [
    `ISO: ${date.toISOString()}`,
    `本地: ${date.toLocaleString("zh-CN", { hour12: false })}`,
    `UTC: ${date.toUTCString()}`,
    `Unix 秒: ${Math.floor(date.getTime() / 1000)}`,
    `Unix 毫秒: ${date.getTime()}`,
  ].join("\n")
}

function parseColor(input: string): { r: number; g: number; b: number } | null {
  const value = input.trim()
  if (/^#?[0-9a-f]{3}$/i.test(value)) {
    const hex = value.replace(/^#/, "")
    const r = parseInt(hex[0]! + hex[0]!, 16)
    const g = parseInt(hex[1]! + hex[1]!, 16)
    const b = parseInt(hex[2]! + hex[2]!, 16)
    return { r, g, b }
  }
  if (/^#?[0-9a-f]{6}$/i.test(value)) {
    const hex = value.replace(/^#/, "")
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    }
  }
  const rgb = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  if (rgb) {
    return {
      r: Math.min(255, Number(rgb[1])),
      g: Math.min(255, Number(rgb[2])),
      b: Math.min(255, Number(rgb[3])),
    }
  }
  return null
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase()}`
}

function runInlineTool(slug: string, params: Record<string, ToolParamValue>, attachments: StoredAttachment[]): string | null {
  const text = getSingleAttachmentOrText(String(params.text || params.input || ""), attachments)
  if (!text.trim() && slug !== "uuid-generator") return null

  switch (slug) {
    case "word-counter": {
      const chars = text.length
      const charsNoSpace = text.replace(/\s/g, "").length
      const cjk = countCjk(text)
      const words = countWords(text)
      const lines = countLines(text)
      const paragraphs = text.split(/\n\s*\n/).filter((item) => item.trim()).length
      return [
        "字数统计结果：",
        `- 字符数：${chars}`,
        `- 不含空白字符：${charsNoSpace}`,
        `- 中文字符：${cjk}`,
        `- 英文/数字词：${words}`,
        `- 行数：${lines}`,
        `- 段落数：${paragraphs}`,
      ].join("\n")
    }
    case "text-dedup": {
      const seen = new Set<string>()
      const lines = text.split(/\r?\n/)
      const kept: string[] = []
      let removed = 0
      for (const line of lines) {
        const ignoreCase = Boolean(params.ignoreCase)
        const key = ignoreCase ? line.trim().toLowerCase() : line.trim()
        if (!key) {
          kept.push(line)
          continue
        }
        if (seen.has(key)) {
          removed++
          continue
        }
        seen.add(key)
        kept.push(line)
      }
      return `去重完成：移除 ${removed} 行重复内容。\n\n${kept.join("\n")}`
    }
    case "case-converter": {
      const mode = String(params.mode || params.format || "lower")
      if (mode === "upper") return text.toUpperCase()
      if (mode === "title") return text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
      if (mode === "camel") {
        return text
          .toLowerCase()
          .replace(/[^A-Za-z0-9]+(.)/g, (_match, char: string) => char.toUpperCase())
          .replace(/^[A-Z]/, (char) => char.toLowerCase())
      }
      return text.toLowerCase()
    }
    case "text-cleaner": {
      let output = text.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "")
      output = output.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
      output = output.replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).replace(/　/g, " ")
      output = output.replace(/[ \t]+/g, " ")
      output = output.split("\n").map((line) => line.trim()).join("\n")
      output = output.replace(/\n{3,}/g, "\n\n")
      return output
    }
    case "url-codec": {
      const mode = String(params.mode || "decode")
      return mode === "encode" ? encodeURIComponent(text) : decodeURIComponent(text)
    }
    case "json-formatter": {
      const parsed = JSON.parse(text)
      const mode = String(params.mode || "format")
      return mode === "minify" ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2)
    }
    case "jwt-decoder": {
      const parts = text.trim().split(".")
      if (parts.length < 2) throw new Error("不是有效的 JWT")
      const decode = (value: string) => JSON.parse(Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"))
      return JSON.stringify({ header: decode(parts[0]!), payload: decode(parts[1]!) }, null, 2)
    }
    case "uuid-generator": {
      const count = Math.min(100, Math.max(1, Number(params.count) || 1))
      return Array.from({ length: count }, () => crypto.randomUUID()).join("\n")
    }
    case "hash-generator": {
      const data = attachments[0]?.buffer ?? Buffer.from(text, "utf8")
      return [
        `SHA-1: ${crypto.createHash("sha1").update(data).digest("hex")}`,
        `SHA-256: ${crypto.createHash("sha256").update(data).digest("hex")}`,
        `SHA-384: ${crypto.createHash("sha384").update(data).digest("hex")}`,
        `SHA-512: ${crypto.createHash("sha512").update(data).digest("hex")}`,
      ].join("\n")
    }
    case "timestamp-converter": {
      const raw = String(params.value || text || Date.now())
      const value = Number(raw)
      if (Number.isFinite(value)) {
        return formatTimestamp(value < 1e12 ? value * 1000 : value)
      }
      const parsed = Date.parse(raw)
      return formatTimestamp(parsed)
    }
    case "color-converter": {
      const color = parseColor(String(params.color || text))
      if (!color) return "无法识别颜色值"
      const hex = rgbToHex(color.r, color.g, color.b)
      return [
        `HEX: ${hex}`,
        `RGB: rgb(${color.r}, ${color.g}, ${color.b})`,
      ].join("\n")
    }
    case "data-mask": {
      const masked = text
        .replace(/(\b1[3-9]\d{9}\b)/g, (_, value: string) => `${value.slice(0, 3)}****${value.slice(7)}`)
        .replace(/(\b\d{17}[\dXx]\b)/g, (_, value: string) => `${value.slice(0, 6)}********${value.slice(-4)}`)
        .replace(/([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/gi, (_match, left: string, right: string) => `${left.slice(0, 2)}***@${right}`)
      return masked
    }
    case "markdown-to-html": {
      return String(marked.parse(text))
    }
    case "html-to-markdown": {
      let markdown = text
      markdown = markdown.replace(/<script[\s\S]*?<\/script>/gi, "")
      markdown = markdown.replace(/<style[\s\S]*?<\/style>/gi, "")
      markdown = markdown.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
      markdown = markdown.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
      markdown = markdown.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
      markdown = markdown.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
      markdown = markdown.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
      markdown = markdown.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "_$1_")
      markdown = markdown.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "_$1_")
      markdown = markdown.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
      markdown = markdown.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
      markdown = markdown.replace(/<br\s*\/?>/gi, "\n")
      markdown = markdown.replace(/<\/p>/gi, "\n\n")
      markdown = markdown.replace(/<[^>]+>/g, "")
      markdown = markdown
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
      return markdown
    }
    default:
      return null
  }
}

export function inferToolRequestFromText(
  text: string,
  attachments: StoredAttachment[],
): ExecuteToolRequest & { direct?: boolean } | null {
  const source = text.trim()
  if (!source) return null
  const lower = source.toLowerCase()
  const attachment = attachments[0]
  const attachmentId = attachment?.id
  const firstFileName = attachment?.name?.toLowerCase() || ""

  const pick = (slug: string, reason: string, params?: Record<string, ToolParamValue>, direct = true) => {
    if (USE_ALL_MATCHING_ATTACHMENTS_TOOLS.has(slug)) {
      return {
        slug,
        reason,
        params,
        attachmentId: undefined,
        direct,
      }
    }
    const selectedAttachment = attachments.find((item) => attachmentMatchesTool(slug, item)) ?? attachment
    return {
      slug,
      reason,
      params,
      attachmentId: selectedAttachment?.id ?? attachmentId,
      direct,
    }
  }

  if (/\b(json\b|json格式化|json 格式化|格式化json|压缩json)/i.test(source)) {
    return pick("json-formatter", "用户请求格式化或压缩 JSON 文本", { mode: /压缩/.test(source) ? "minify" : "format", text: source })
  }
  if (/\b(jwt\b|jwt解码|解码jwt)/i.test(source)) {
    return pick("jwt-decoder", "用户请求解码 JWT", { text: source })
  }
  if (/\b(字数|统计字数|字符数|行数|段落数)\b/.test(source)) {
    return pick("word-counter", "用户请求统计文本字数", { text: source })
  }
  if (/\b(去重|文本去重)\b/.test(source)) {
    return pick("text-dedup", "用户请求文本去重", { text: source })
  }
  if (/\b(清理|文本清理|格式清理)\b/.test(source)) {
    return pick("text-cleaner", "用户请求清理文本", { text: source })
  }
  if (/\b(表格|table|csv|excel|xlsx)\b.*\b(markdown|md|html)\b/i.test(source)) {
    return pick("table-converter", "用户请求表格格式转换", { text: source })
  }
  if (/\b(大小写|case|驼峰|下划线)\b/.test(source)) {
    return pick("case-converter", "用户请求大小写转换", { text: source, mode: source.includes("大写") ? "upper" : source.includes("标题") ? "title" : "lower" })
  }
  if (/\b(url|链接)\b.*\b(编码|解码)\b|\b(编码|解码)\b.*\b(url|链接)\b/i.test(source)) {
    return pick("url-codec", "用户请求 URL 编码或解码", { text: source, mode: /编码/.test(source) ? "encode" : "decode" })
  }
  if (/\b(时间戳|timestamp)\b/.test(source)) {
    return pick("timestamp-converter", "用户请求时间戳转换", { value: source.match(/\d{10,13}/)?.[0] || source })
  }
  if (/\b(颜色|color|hex|rgb|hsl)\b/.test(source)) {
    return pick("color-converter", "用户请求颜色转换", { color: source })
  }
  if (/\b(数据脱敏|脱敏|手机号|身份证|邮箱)\b/.test(source)) {
    return pick("data-mask", "用户请求数据脱敏", { text: source })
  }
  if (/\b(exif|元数据|metadata)\b.*\b(清除|删除|去除|移除)\b|\b(清除|删除|去除|移除)\b.*\b(exif|元数据|metadata)\b/i.test(source)) {
    return pick(
      attachment && (attachment.mime.toLowerCase().startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(firstFileName))
        ? "image-metadata-clear"
        : "pdf-metadata-clear",
      "用户请求清除文件元数据",
    )
  }
  if (/\b(哈希|hash|md5|sha)\b/.test(source) && attachments.length > 0) {
    return pick("file-hash", "用户请求文件哈希校验", undefined)
  }
  if (/\b(uuid|uuid生成|随机密码)\b/.test(source)) {
    return pick("uuid-generator", "用户请求生成 UUID 或随机密码", { count: 1 })
  }

  if (/\b(word|doc|docx|word文档)\b.*\b(pdf|转pdf|导出pdf)\b|\b(转pdf|转成pdf|导出pdf)\b.*\b(word|doc|docx)\b/i.test(lower)) {
    return pick("word-to-pdf", "用户请求 Word 转 PDF")
  }
  if (/(word|doc|docx|word文档|文档|office).*(转图片|转成图片|导出图片|图片)/i.test(source)) {
    return pick("word-to-image", "用户请求 Word 转图片")
  }
  if (/\b(pdf)\b.*\b(word|doc|docx|可编辑)\b|\b(pdf转word|pdf 转 word)\b/i.test(lower)) {
    return pick("pdf-to-word", "用户请求 PDF 转 Word")
  }
  if (/\b(excel|xls|xlsx|表格)\b.*\b(pdf|转pdf)\b/i.test(lower)) {
    return pick("excel-to-pdf", "用户请求 Excel 转 PDF")
  }
  if (/\b(excel|xls|xlsx|表格)\b.*\b(图片|png|jpg|jpeg)\b/i.test(lower)) {
    return pick("excel-to-image", "用户请求 Excel 转图片")
  }
  if (/\b(ppt|pptx|演示文稿)\b.*\b(pdf|转pdf)\b/i.test(lower)) {
    return pick("ppt-to-pdf", "用户请求 PPT 转 PDF")
  }
  if (/\b(ppt|pptx|演示文稿)\b.*\b(图片|png|jpg|jpeg)\b/i.test(lower)) {
    return pick("ppt-to-image", "用户请求 PPT 转图片")
  }
  if (/\b(word|doc|docx|word文档)\b.*\b(图片|png|jpg|jpeg)\b/i.test(lower)) {
    return pick("word-to-image", "用户请求 Word 转图片")
  }
  if (/(pdf|文档).*(转图片|转成图片|导出图片|图片)/i.test(source)) {
    return pick("pdf-to-image", "用户请求 PDF 转图片")
  }
  if (/\b(pdf)\b.*\b(图片|png|jpg|jpeg)\b/i.test(lower)) {
    return pick("pdf-to-image", "用户请求 PDF 转图片")
  }
  if (/\b(图片|image|png|jpg|jpeg|webp|照片)\b.*\b(pdf|转pdf|导出pdf|生成pdf)\b/i.test(lower)) {
    return pick("image-to-pdf", "用户请求图片转 PDF")
  }
  if (/\b(pdf)\b.*\b(合并|拼接|组合)\b/i.test(lower)) {
    return pick("pdf-merge", "用户请求 PDF 合并")
  }
  if (/\b(pdf)\b.*\b(拆分|分割|拆页|拆开)\b/i.test(lower)) {
    return pick("pdf-split", "用户请求 PDF 拆分")
  }
  if (/\b(pdf)\b.*\b(压缩|减小|缩小体积|压到)\b/i.test(lower)) {
    return pick("pdf-compress", "用户请求 PDF 压缩")
  }
  if (/\b(pdf)\b.*\b(旋转)\b/i.test(lower)) {
    return pick("pdf-rotate", "用户请求 PDF 旋转")
  }
  if (/\b(pdf)\b.*\b(提取|页)\b/i.test(lower) && /页/.test(lower)) {
    return pick("pdf-extract", "用户请求 PDF 提取指定页")
  }
  if (/\b(pdf)\b.*\b(加密|密码保护)\b/i.test(lower)) {
    return pick("pdf-encrypt", "用户请求 PDF 加密")
  }
  if (/\b(pdf)\b.*\b(解密|去密码)\b/i.test(lower)) {
    return pick("pdf-decrypt", "用户请求 PDF 解密")
  }
  if (/\b(pdf)\b.*\b(页码)\b/i.test(lower)) {
    return pick("pdf-page-number", "用户请求 PDF 添加页码")
  }

  const attachmentIntent = inferToolFromAttachmentIntent(source, getAttachmentKind(attachment))
  if (attachmentIntent) {
    return pick(attachmentIntent.slug, attachmentIntent.reason, attachmentIntent.params)
  }

  if (/\b(图片|image|照片)\b.*\b(水印)\b/i.test(lower)) {
    return pick("image-watermark", "用户请求图片加水印", {
      text: source.match(/水印[:：]?\s*(.+)$/)?.[1] || "CatConvert",
    })
  }
  if (/\b(隐形水印|水印检测|提取水印|元数据清除|exif清除)\b/i.test(lower)) {
    return pick(/检测|提取/.test(lower) ? "image-steganography-detect" : "image-steganography", "用户请求隐形水印相关操作")
  }
  if (/\b(视频|短视频)\b.*\b(压缩|缩小|减小体积)\b/i.test(lower)) return pick("video-compress", "用户请求视频压缩")
  if (/\b(视频)\b.*\b(格式|转换|转码)\b/i.test(lower)) return pick("video-convert", "用户请求视频格式转换")
  if (/\b(视频|片段)\b.*\b(gif|动图|转gif)\b/i.test(lower)) return pick("video-to-gif", "用户请求视频转 GIF")
  if (/\b(视频)\b.*\b(音频|提取音频)\b/i.test(lower)) return pick("video-extract-audio", "用户请求视频提取音频")
  if (/\b(音频|音乐|歌曲)\b.*\b(格式|转换|转码)\b/i.test(lower)) return pick("audio-convert", "用户请求音频格式转换")
  if (/\b(音频|音乐|歌曲)\b.*\b(压缩|缩小体积)\b/i.test(lower)) return pick("audio-compress", "用户请求音频压缩")
  if (/\b(音频|音乐|歌曲)\b.*\b(裁剪|截取|剪掉)\b/i.test(lower)) return pick("audio-trim", "用户请求音频裁剪")
  if (/\b(音频|音乐|歌曲)\b.*\b(合并|拼接)\b/i.test(lower)) return pick("audio-merge", "用户请求音频合并")
  if (/\b(音频|音乐|歌曲)\b.*\b(变速|变调)\b/i.test(lower)) return pick("audio-speed", "用户请求音频变速")
  if (/\b(音频|音乐|歌曲)\b.*\b(降噪|去噪)\b/i.test(lower)) return pick("audio-denoise", "用户请求音频降噪")
  if (/\b(markdown|md|markdown 文件|md文件)\b.*\b(pdf|转pdf|导出pdf)\b/i.test(lower)) return pick("markdown-to-pdf", "用户请求 Markdown 转 PDF")
  if (/\b(markdown|md|markdown 文件|md文件)\b.*\b(html|网页|网页内容)\b/i.test(lower)) return pick("markdown-to-html", "用户请求 Markdown 转 HTML")
  if (/\b(html|网页)\b.*\b(markdown|md)\b/i.test(lower)) return pick("html-to-markdown", "用户请求 HTML 转 Markdown")
  if (/\b(html|网页|网页内容)\b.*\b(pdf|转pdf|导出pdf)\b/i.test(lower)) return pick("html-to-pdf", "用户请求 HTML 转 PDF")
  if (/\b(csv|excel|表格)\b.*\b(excel|xlsx)\b/i.test(lower)) return pick("csv-to-excel", "用户请求 CSV 转 Excel")
  if (/\b(excel|xlsx)\b.*\b(csv)\b/i.test(lower)) return pick("excel-to-csv", "用户请求 Excel 转 CSV")
  if (/\b(qr|二维码)\b.*\b(批量|多个|一批)\b/i.test(lower)) return pick("batch-qrcode", "用户请求批量二维码生成")
  if (/\b(签名)\b.*\b(pdf)\b/i.test(lower)) return pick("signature-pdf", "用户请求签名插入 PDF")

  if (attachments.length > 0 && /pdf|word|excel|ppt|图片|视频|音频|文件|转换|压缩|合并|拆分|加密|解密|水印|元数据|exif/i.test(source)) {
    const attachmentMime = attachment?.mime.toLowerCase() || ""
    const attachmentName = attachment?.name.toLowerCase() || ""
    if (attachmentMime === "application/pdf" || attachmentName.endsWith(".pdf")) {
      return pick("pdf-to-image", "根据附件和用户意图推断为 PDF 处理")
    }
    if (attachmentMime.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(attachmentName)) {
      return pick("image-watermark", "根据附件和用户意图推断为图片处理", {
        text: "CatConvert",
      })
    }
  }

  return null
}

function buildRedirectResult(
  request: ExecuteToolRequest,
  context: ToolHarnessContext,
  message: string,
): ToolHarnessResult {
  const selected = request.attachmentId
    ? context.attachments.find((attachment) => attachment.id === request.attachmentId)
    : context.attachments.find((attachment) => attachmentMatchesTool(request.slug, attachment))
  return {
    kind: "redirect",
    slug: request.slug,
    toolName: getToolName(request.slug),
    reason: request.reason,
    params: normalizeParams(request.params),
    attachmentId: selected?.id ?? null,
    signedToken: selected?.signedToken ?? null,
    expiresAt: selected?.expiresAt ?? null,
    attachmentName: selected?.name ?? null,
    attachmentMime: selected?.mime ?? null,
    message,
  }
}

export async function executeToolThroughHarness(
  request: ExecuteToolRequest,
  context: ToolHarnessContext,
): Promise<ToolHarnessResult> {
  const originalSlug = request.slug
  const slug = normalizeToolSlug(request.slug)
  const tool = getCatalogTool(slug) ?? getCatalogTool(originalSlug)
  const normalizedRequest: ExecuteToolRequest = { ...request, slug }
  const params = normalizeParams(request.params)
  const toolName = getToolName(slug)
  if (!tool) {
    return {
      kind: "error",
      slug,
      toolName,
      reason: request.reason,
      message: "工具不存在",
      status: 404,
    }
  }

  const selectedAttachments = selectAttachments(slug, context, request.attachmentId)
  if (SERVER_EXECUTABLE_FILE_TOOLS.has(slug) && selectedAttachments.length > 0) {
    try {
      const files = await copyAttachmentsToToolUploads(slug, selectedAttachments)
      const task = await submitProcessTask({
        toolSlug: slug,
        files,
        params,
        userId: context.userId,
        ipAddress: context.ipAddress,
      })
      return {
        kind: "process_task",
        slug,
        toolName,
        reason: request.reason,
        taskId: task.taskId,
        creditsCost: task.creditsCost,
        fileCount: task.fileCount,
        inputFileName: task.inputFileName,
        message: `${toolName} 任务已提交，处理完成后会显示下载入口。`,
      }
    } catch (error) {
      return {
        kind: "error",
        slug,
        toolName,
        reason: request.reason,
        message: error instanceof Error ? error.message : "工具执行失败",
        status: typeof (error as { status?: unknown }).status === "number" ? (error as { status: number }).status : 500,
      }
    }
  }

  if (INLINE_TEXT_TOOLS.has(slug)) {
    try {
      const resultText = runInlineTool(slug, params, selectedAttachments)
      if (resultText) {
        return {
          kind: "inline_result",
          slug,
          toolName,
          reason: request.reason,
          resultText,
          message: `${toolName} 已执行。`,
        }
      }
    } catch (error) {
      return {
        kind: "error",
        slug,
        toolName,
        reason: request.reason,
        message: error instanceof Error ? error.message : "工具执行失败",
        status: 400,
      }
    }
  }

  if (slug === "markdown-to-html") {
    const text = String(params.text || params.input || getAttachmentText(selectedAttachments) || "")
    if (text.trim()) {
      const html = await marked(text)
      return {
        kind: "inline_result",
        slug,
        toolName,
        reason: request.reason,
        resultText: String(html),
        message: `${toolName} 已执行。`,
      }
    }
  }

  return buildRedirectResult(normalizedRequest, context, "该工具需要前端交互，已准备打开工具页并预填。")
}

export function buildHarnessInstruction(): string {
  return [
    "",
    "工具调用规则：",
    "- 用户明确要求使用本站已有工具处理文件或文本时，优先调用 execute_tool。",
    "- 对 Word/PDF/Excel/PPT、图片水印、视频、音频等后端工具，execute_tool 会在服务端创建任务、扣除对应积分并入队处理。",
    "- 对需要拖拽、裁剪、预览、手写签名、取色、二维码摄像头识别等强前端交互的工具，execute_tool 会返回打开工具页的预填卡片。",
    "- 如果工具返回 402 或余额不足，立即停止继续调用其他同类工具，直接告诉用户余额不足并引导充值。",
    "- 不要自己假装完成文件转换、压缩、合并、加水印等操作。",
  ].join("\n")
}
