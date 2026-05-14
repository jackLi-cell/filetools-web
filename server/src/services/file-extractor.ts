/**
 * 附件文本提取
 *
 * 支持类型：
 * - text/* / application/json / application/xml / text/csv / application/csv → utf-8 直读
 * - application/pdf → pdf-parse（最多 50 页）
 * - .docx (officedocument.wordprocessingml) → mammoth.extractRawText
 * - .xlsx (officedocument.spreadsheetml.sheet) → exceljs，前 500 行，tab 分隔
 *
 * 不支持类型一律抛 UnsupportedFileTypeError，路由层捕获返 400。
 *
 * 单次解析 30s 超时，避免恶意大 PDF 阻塞主线程。
 */

import ExcelJS from "exceljs"

// ─── 限制 ────────────────────────────────────────────────────────────
const PDF_MAX_PAGES = 50
const SHEET_MAX_ROWS = 500
const CSV_MAX_ROWS = 500
const EXTRACT_TIMEOUT_MS = 30_000

// ─── 类型 ────────────────────────────────────────────────────────────
export interface ExtractedFile {
  text: string
  meta: {
    pages?: number
    rows?: number
    truncated?: boolean
    sheetName?: string
  }
}

export class UnsupportedFileTypeError extends Error {
  public mime: string
  public fileName: string
  constructor(mime: string, fileName: string) {
    super(`Unsupported file type: ${mime} (${fileName})`)
    this.name = "UnsupportedFileTypeError"
    this.mime = mime
    this.fileName = fileName
  }
}

export class ExtractionFailedError extends Error {
  public cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = "ExtractionFailedError"
    this.cause = cause
  }
}

// ─── 类型判定 ────────────────────────────────────────────────────────
const TEXT_MIME_PREFIXES = ["text/"]
const TEXT_EXACT_MIMES = new Set([
  "application/json",
  "application/xml",
  "application/javascript",
  "application/yaml",
  "application/x-yaml",
])
const CSV_MIMES = new Set(["text/csv", "application/csv", "text/x-csv"])
const PDF_MIMES = new Set(["application/pdf"])
const DOCX_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])
const XLSX_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

function isTextMime(mime: string): boolean {
  if (TEXT_MIME_PREFIXES.some((p) => mime.startsWith(p))) return true
  return TEXT_EXACT_MIMES.has(mime)
}

function looksLikeCsv(mime: string, name: string): boolean {
  if (CSV_MIMES.has(mime)) return true
  return /\.(csv|tsv)$/i.test(name)
}

// ─── 工具：超时 wrapper ──────────────────────────────────────────────
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ExtractionFailedError(`${label} timed out after ${ms}ms`))
    }, ms)
    promise
      .then((v) => {
        clearTimeout(timer)
        resolve(v)
      })
      .catch((e) => {
        clearTimeout(timer)
        reject(e)
      })
  })
}

// ─── 各类型实现 ──────────────────────────────────────────────────────

function extractPlainText(buffer: Buffer): ExtractedFile {
  // 直接 utf-8 解码（容忍非 utf-8，让 toString 自动替换非法字符）
  const text = buffer.toString("utf8")
  return { text, meta: {} }
}

function extractCsv(buffer: Buffer): ExtractedFile {
  const raw = buffer.toString("utf8")
  // 不做 CSV 解析，只按行截断（保持原文给模型读，模型自己理解结构）
  const allLines = raw.split(/\r?\n/)
  const truncated = allLines.length > CSV_MAX_ROWS
  const lines = allLines.slice(0, CSV_MAX_ROWS)
  const text = lines.join("\n")
  return {
    text,
    meta: { rows: allLines.length, truncated },
  }
}

async function extractPdf(buffer: Buffer): Promise<ExtractedFile> {
  // pdf-parse v2 是 ESM, 用 dynamic import 拿到 PDFParse 类
  // 在 Node 22+ 上偶有 buffer 边界问题，包 try/catch
  try {
    const mod = await import("pdf-parse")
    const PDFParse = (mod as { PDFParse: new (opts: { data: Uint8Array }) => unknown }).PDFParse
    if (!PDFParse) {
      throw new ExtractionFailedError("pdf-parse module shape unexpected")
    }
    const parser = new PDFParse({ data: new Uint8Array(buffer) }) as {
      getInfo: () => Promise<{ total: number }>
      getText: (params?: { first?: number }) => Promise<{ pages: Array<{ num: number; text: string }>; text: string; total: number }>
      destroy: () => Promise<void>
    }
    let totalPages = 0
    try {
      const info = await parser.getInfo()
      totalPages = info.total || 0
    } catch {
      // info 失败不致命，继续 getText
    }
    const result = await parser.getText({ first: PDF_MAX_PAGES })
    await parser.destroy().catch(() => undefined)

    const truncated = totalPages > 0 && totalPages > PDF_MAX_PAGES
    const text = result.text || ""
    return {
      text,
      meta: {
        pages: totalPages || result.pages.length,
        truncated,
      },
    }
  } catch (e) {
    if (e instanceof ExtractionFailedError) throw e
    throw new ExtractionFailedError(
      `PDF extraction failed: ${e instanceof Error ? e.message : String(e)}`,
      e,
    )
  }
}

async function extractDocx(buffer: Buffer): Promise<ExtractedFile> {
  try {
    // mammoth 是 CJS，dynamic import 后取 default 或本身
    const mod = await import("mammoth")
    const mammoth = (mod as { default?: typeof import("mammoth") }).default ?? mod
    const result = await mammoth.extractRawText({ buffer })
    return {
      text: result.value || "",
      meta: {},
    }
  } catch (e) {
    throw new ExtractionFailedError(
      `DOCX extraction failed: ${e instanceof Error ? e.message : String(e)}`,
      e,
    )
  }
}

async function extractXlsx(buffer: Buffer): Promise<ExtractedFile> {
  try {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)
    const sheet = workbook.worksheets[0]
    if (!sheet) {
      return { text: "(空工作簿)", meta: { rows: 0 } }
    }
    const totalRows = sheet.rowCount || 0
    const limit = Math.min(totalRows, SHEET_MAX_ROWS)
    const lines: string[] = []
    for (let r = 1; r <= limit; r++) {
      const row = sheet.getRow(r)
      const cells: string[] = []
      // 用 row.values 会带 leading null（exceljs 1-indexed），手动遍历
      const cellCount = Math.max(row.cellCount, sheet.columnCount)
      for (let c = 1; c <= cellCount; c++) {
        const cell = row.getCell(c)
        const v = cell.value
        if (v == null) {
          cells.push("")
        } else if (typeof v === "object" && "richText" in (v as object)) {
          const rt = v as { richText: Array<{ text: string }> }
          cells.push(rt.richText.map((p) => p.text).join(""))
        } else if (typeof v === "object" && "result" in (v as object)) {
          const f = v as { result?: unknown }
          cells.push(f.result == null ? "" : String(f.result))
        } else if (v instanceof Date) {
          cells.push(v.toISOString())
        } else {
          cells.push(String(v))
        }
      }
      // 去掉行尾连续空单元格
      while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop()
      lines.push(cells.join("\t"))
    }
    const truncated = totalRows > SHEET_MAX_ROWS
    const header = `[Sheet: ${sheet.name}, 总行数: ${totalRows}${truncated ? `（已截取前 ${SHEET_MAX_ROWS} 行）` : ""}]`
    const text = `${header}\n${lines.join("\n")}`
    return {
      text,
      meta: {
        rows: totalRows,
        truncated,
        sheetName: sheet.name,
      },
    }
  } catch (e) {
    throw new ExtractionFailedError(
      `XLSX extraction failed: ${e instanceof Error ? e.message : String(e)}`,
      e,
    )
  }
}

// ─── 主入口 ──────────────────────────────────────────────────────────

export async function extractText(
  buffer: Buffer,
  mime: string,
  name: string,
): Promise<ExtractedFile> {
  const lowerMime = (mime || "").toLowerCase()
  const lowerName = (name || "").toLowerCase()

  // CSV / TSV 优先匹配（很多浏览器会把 csv 报为 application/octet-stream）
  if (looksLikeCsv(lowerMime, lowerName)) {
    return extractCsv(buffer)
  }

  // PDF
  if (PDF_MIMES.has(lowerMime) || /\.pdf$/i.test(lowerName)) {
    return withTimeout(extractPdf(buffer), EXTRACT_TIMEOUT_MS, "PDF extraction")
  }

  // DOCX
  if (DOCX_MIMES.has(lowerMime) || /\.docx$/i.test(lowerName)) {
    return withTimeout(extractDocx(buffer), EXTRACT_TIMEOUT_MS, "DOCX extraction")
  }

  // XLSX
  if (XLSX_MIMES.has(lowerMime) || /\.xlsx$/i.test(lowerName)) {
    return withTimeout(extractXlsx(buffer), EXTRACT_TIMEOUT_MS, "XLSX extraction")
  }

  // 普通文本
  if (isTextMime(lowerMime) || /\.(txt|md|markdown|json|xml|yml|yaml|log|html|htm|js|ts|jsx|tsx|py|java|c|cpp|h|css|scss|less|sql|sh|conf|ini|toml)$/i.test(lowerName)) {
    return extractPlainText(buffer)
  }

  throw new UnsupportedFileTypeError(mime, name)
}

/**
 * 截断单个附件文本到指定字符上限。截断时给出提示，前端用户可见。
 */
export function truncateExtractedText(
  text: string,
  maxChars: number,
): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false }
  const head = text.slice(0, maxChars)
  return { text: head, truncated: true }
}
