import { Document, Packer, Paragraph, TextRun } from "docx"

type ChatMessageLike = {
  role?: unknown
  content?: unknown
}

export type AiGeneratedFileFormat = "docx" | "md" | "txt" | "html" | "json" | "csv"

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

function detectFormat(text: string): AiGeneratedFileFormat | null {
  const hasGenerateIntent = /(生成|导出|输出|保存|整理成|制作|做成|返回|下载|写成)/i.test(text)
  const hasFileIntent =
    /(文件|文档|下载|附件|格式|\.docx?|\.md|\.txt|\.html?|\.json|\.csv|\bdocx?\b|\bword\b|\bmarkdown\b|\bhtml\b|\bjson\b|\bcsv\b|\btxt\b)/i.test(text)
  if (!hasGenerateIntent || !hasFileIntent) return null

  if (includesAny(text, [/\.docx?\b/i, /\bdocx?\b/i, /\bword\b/i, /Word\s*文档/i])) return "docx"
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
    "请直接输出可写入该文件的完整正文内容，不要只回复“已生成”。",
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
