import { Document, Packer, Paragraph, TextRun } from "docx"
import PptxGenJS from "pptxgenjs"

type ChatMessageLike = {
  role?: unknown
  content?: unknown
}

export type AiGeneratedFileFormat = "docx" | "pptx" | "md" | "txt" | "html" | "json" | "csv"

export interface AiOutputFileRequest {
  format: AiGeneratedFileFormat
  name: string
  mimeType: string
  label: string
}

export interface AiGeneratedFile {
  name: string
  mimeType: string
  base64: string
}

const FORMAT_META: Record<AiGeneratedFileFormat, { ext: string; mimeType: string; label: string }> = {
  docx: {
    ext: "docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    label: "Word 文档",
  },
  pptx: {
    ext: "pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    label: "PPT 演示文稿",
  },
  md: { ext: "md", mimeType: "text/markdown", label: "Markdown 文件" },
  txt: { ext: "txt", mimeType: "text/plain", label: "文本文件" },
  html: { ext: "html", mimeType: "text/html", label: "HTML 文件" },
  json: { ext: "json", mimeType: "application/json", label: "JSON 文件" },
  csv: { ext: "csv", mimeType: "text/csv", label: "CSV 文件" },
}

function messageContentToText(content: unknown): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text
          return typeof text === "string" ? text : ""
        }
        return ""
      })
      .filter(Boolean)
      .join("\n")
  }
  return ""
}

function getLastUserText(messages: ChatMessageLike[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg?.role === "user") {
      return messageContentToText(msg.content)
    }
  }
  return ""
}

function includesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

function isFileHowToQuestion(text: string): boolean {
  return /(怎么|如何|怎样|教程|步骤|方法|为什么|区别|能不能|可以吗|是否|是什么|介绍一下|说明一下)/i.test(text)
}

function hasExplicitDownloadIntent(text: string): boolean {
  return /(返回|生成|导出|输出|保存|做成|制作|整理成|写成).{0,18}(可下载|下载|文件|附件|\.docx?|\.pptx?|\.md|\.txt|\.html?|\.json|\.csv|\bdocx?\b|\bpptx?\b|\bword\b|\bpowerpoint\b|\bmarkdown\b|\bhtml\b|\bjson\b|\bcsv\b|\btxt\b)/i.test(text) ||
    /(可下载|下载|文件|附件|\.docx?|\.pptx?|\.md|\.txt|\.html?|\.json|\.csv|\bdocx?\b|\bpptx?\b|\bword\b|\bpowerpoint\b|\bmarkdown\b|\bhtml\b|\bjson\b|\bcsv\b|\btxt\b).{0,18}(返回|生成|导出|输出|保存|做成|制作|整理成|写成)/i.test(text)
}

function detectFormat(text: string): AiGeneratedFileFormat | null {
  if (!hasExplicitDownloadIntent(text)) return null
  if (isFileHowToQuestion(text) && !/(返回|导出|输出|下载|保存).{0,18}(文件|附件|\.docx?|\.pptx?|\.md|\.txt|\.html?|\.json|\.csv|\bdocx?\b|\bpptx?\b|\bword\b|\bpowerpoint\b|\bmarkdown\b|\bhtml\b|\bjson\b|\bcsv\b|\btxt\b)/i.test(text)) {
    return null
  }

  if (includesAny(text, [/\.docx?\b/i, /\bdocx?\b/i, /\bword\b/i, /Word\s*文档/i])) return "docx"
  if (includesAny(text, [/\.pptx?\b/i, /\bpptx?\b/i, /\bpowerpoint\b/i, /PPT/i, /幻灯片/i, /演示文稿/i])) return "pptx"
  if (includesAny(text, [/\.md\b/i, /\bmarkdown\b/i, /Markdown/i])) return "md"
  if (includesAny(text, [/\.txt\b/i, /文本文件/i, /txt\s*文件/i])) return "txt"
  if (includesAny(text, [/\.html?\b/i, /\bhtml\b/i, /网页文件/i])) return "html"
  if (includesAny(text, [/\.json\b/i, /\bjson\b/i])) return "json"
  if (includesAny(text, [/\.csv\b/i, /\bcsv\b/i, /表格\s*csv/i])) return "csv"
  return null
}

export function detectAiOutputFileRequest(messages: ChatMessageLike[]): AiOutputFileRequest | null {
  const text = getLastUserText(messages)
  const format = detectFormat(text)
  if (!format) return null
  const meta = FORMAT_META[format]
  return {
    format,
    name: `灵猫生成文件.${meta.ext}`,
    mimeType: meta.mimeType,
    label: meta.label,
  }
}

export function buildOutputFileInstruction(request: AiOutputFileRequest | null): string {
  if (!request) return ""
  return [
    "",
    "用户明确要求生成可下载文件。",
    `目标格式：${request.label}（.${FORMAT_META[request.format].ext}）。`,
    "服务端会在你回复后自动把正文渲染成真实可下载文件并附加到本次对话中。",
    "不要声称自己无法生成、无法回传、不能下载或只能让用户复制粘贴该文件。",
    request.format === "pptx"
      ? "请输出适合拆成 PPT 页面的大纲内容：每页用清晰标题开头，下面列 3-5 条要点。不要只回复“已生成”。"
      : "请直接输出可写入该文件的完整正文内容，不要只回复“已生成”。",
    "如果用户提供了附件，请基于附件内容整理成完整文档；如果资料不足，请在正文中说明需要补充的信息。",
  ].join("\n")
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function stripMarkdownSyntax(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/^\s*\d+\.\s+/, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
}

async function createDocxBuffer(text: string): Promise<Buffer> {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const children = lines.map((line) => {
    const trimmed = line.trim()
    if (!trimmed) return new Paragraph({ text: "" })
    const isHeading = /^#{1,3}\s+/.test(trimmed)
    return new Paragraph({
      spacing: { after: isHeading ? 180 : 120 },
      children: [
        new TextRun({
          text: stripMarkdownSyntax(trimmed),
          bold: isHeading,
          size: isHeading ? 28 : 22,
        }),
      ],
    })
  })
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  })
  return Buffer.from(await Packer.toBuffer(doc))
}

function splitIntoSlides(text: string): Array<{ title: string; bullets: string[] }> {
  const normalized = text.replace(/\r\n/g, "\n").trim()
  const groups = normalized
    .split(/\n(?=#{1,3}\s+|第[一二三四五六七八九十\d]+[页部分章节]|Slide\s*\d+|幻灯片\s*\d+)/i)
    .map((part) => part.trim())
    .filter(Boolean)
  const sourceGroups = groups.length >= 2 ? groups : normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
  const slides: Array<{ title: string; bullets: string[] }> = []

  for (const group of sourceGroups) {
    const lines = group.split("\n").map((line) => stripMarkdownSyntax(line.trim())).filter(Boolean)
    if (lines.length === 0) continue
    const title = lines[0].replace(/^第[一二三四五六七八九十\d]+[页部分章节][：:\s-]*/, "").replace(/^Slide\s*\d+[：:\s-]*/i, "").slice(0, 60)
    const bullets = lines
      .slice(1)
      .flatMap((line) => line.split(/[；;]/))
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 6)
    slides.push({
      title: title || "内容页",
      bullets: bullets.length > 0 ? bullets : [lines.slice(1).join(" ").slice(0, 180) || group.slice(0, 180)],
    })
    if (slides.length >= 12) break
  }

  if (slides.length === 0) {
    slides.push({ title: "灵猫生成 PPT", bullets: [normalized.slice(0, 220) || "暂无内容"] })
  }
  return slides
}

async function createPptxBuffer(text: string): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = "LAYOUT_WIDE"
  pptx.author = "CatTools"
  pptx.subject = "灵猫助手生成文件"
  pptx.title = "灵猫生成 PPT"
  pptx.company = "CatTools"
  pptx.theme = {
    headFontFace: "Microsoft YaHei",
    bodyFontFace: "Microsoft YaHei",
  }

  const slides = splitIntoSlides(text)
  for (let i = 0; i < slides.length; i++) {
    const spec = slides[i]!
    const slide = pptx.addSlide()
    slide.background = { color: i === 0 ? "F6F8FB" : "FBFCFE" }
    slide.addText(spec.title, {
      x: 0.65,
      y: 0.48,
      w: 11.0,
      h: 0.55,
      fontFace: "Microsoft YaHei",
      fontSize: i === 0 ? 28 : 24,
      bold: true,
      color: "1F2937",
      breakLine: false,
      fit: "shrink",
    })
    slide.addShape(pptx.ShapeType.line, {
      x: 0.68,
      y: 1.25,
      w: 1.4,
      h: 0,
      line: { color: "2563EB", width: 2 },
    })
    slide.addText(
      spec.bullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 18 }, hanging: 4 } })),
      {
        x: 0.9,
        y: 1.58,
        w: 10.4,
        h: 4.65,
        fontFace: "Microsoft YaHei",
        fontSize: 15,
        color: "374151",
        breakLine: false,
        margin: 0.05,
        fit: "shrink",
        paraSpaceAfter: 8,
      },
    )
    slide.addText(`${i + 1} / ${slides.length}`, {
      x: 11.2,
      y: 6.78,
      w: 0.7,
      h: 0.2,
      fontSize: 8,
      color: "9CA3AF",
      align: "right",
    })
  }

  const out = await pptx.write({ outputType: "nodebuffer", compression: true })
  return Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer)
}

export async function createGeneratedFile(
  request: AiOutputFileRequest | null,
  text: string,
): Promise<AiGeneratedFile | null> {
  if (!request || !text.trim()) return null
  let buffer: Buffer
  switch (request.format) {
    case "docx":
      buffer = await createDocxBuffer(text)
      break
    case "pptx":
      buffer = await createPptxBuffer(text)
      break
    case "html":
      buffer = Buffer.from(
        `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>灵猫生成文件</title></head><body><pre>${escapeHtml(text)}</pre></body></html>`,
        "utf8",
      )
      break
    case "json":
    case "csv":
    case "md":
    case "txt":
      buffer = Buffer.from(text, "utf8")
      break
  }
  return {
    name: request.name,
    mimeType: request.mimeType,
    base64: buffer.toString("base64"),
  }
}
