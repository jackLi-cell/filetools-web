import { Job } from "bullmq"
import { PrismaClient } from "@prisma/client"
import { mkdtemp, rm, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { downloadFileFromStorage, uploadFileToStorage } from "../config/storage.js"

const prisma = new PrismaClient()

interface UtilJobData {
  taskId: string
  toolSlug: string
  inputFileKey: string
  inputFileName: string
  params: Record<string, unknown>
}

async function downloadFromStorage(fileKey: string, destPath: string) {
  await downloadFileFromStorage(fileKey, destPath)
}

async function uploadToStorage(filePath: string, key: string, _contentType: string): Promise<number> {
  return uploadFileToStorage(filePath, key)
}

async function markProcessing(taskId: string) {
  await prisma.processTask.update({ where: { id: taskId }, data: { status: "processing", startedAt: new Date() } })
}

async function markCompleted(taskId: string, outputKey: string, outputFileName: string, outputSize: number) {
  await prisma.processTask.update({
    where: { id: taskId },
    data: { status: "completed", outputFileKey: outputKey, outputFileName, outputFileSize: BigInt(outputSize), completedAt: new Date() },
  })
}

async function markFailed(taskId: string, message: string) {
  await prisma.processTask.update({ where: { id: taskId }, data: { status: "failed", errorMessage: message, completedAt: new Date() } })
}

export async function processCsvToExcel(job: Job<UtilJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-csv-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const ExcelJS = (await import("exceljs")).default
    const csvContent = await readFile(inputPath, "utf-8")
    const rows = csvContent.split("\n").map(line => line.split(",").map(cell => cell.trim().replace(/^"|"$/g, "")))

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("Sheet1")
    rows.forEach(row => { if (row.some(c => c)) sheet.addRow(row) })

    const outputFileName = inputFileName.replace(/\.csv$/i, ".xlsx")
    const outputPath = join(workDir, outputFileName)
    await workbook.xlsx.writeFile(outputPath)

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "CSV 转 Excel 失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processExcelToCsv(job: Job<UtilJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-csv-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const ExcelJS = (await import("exceljs")).default
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(inputPath)
    const sheet = workbook.worksheets[0]
    if (!sheet) throw new Error("Excel 文件中没有工作表")

    const rows: string[] = []
    sheet.eachRow((row) => {
      const cells = (row.values as any[]).slice(1).map(v => {
        const s = String(v ?? "")
        return s.includes(",") ? `"${s}"` : s
      })
      rows.push(cells.join(","))
    })

    const outputFileName = inputFileName.replace(/\.xlsx?$/i, ".csv")
    const outputPath = join(workDir, outputFileName)
    await writeFile(outputPath, rows.join("\n"), "utf-8")

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "text/csv")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "Excel 转 CSV 失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processBatchQrcode(job: Job<UtilJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-qr-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const content = await readFile(inputPath, "utf-8")
    const lines = content.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 100)

    if (lines.length === 0) throw new Error("文件为空")

    const QRCode = (await import("qrcode")).default
    const archiver = (await import("archiver")).default

    const outputFileName = "qrcodes.zip"
    const outputPath = join(workDir, outputFileName)
    const { createWriteStream } = await import("fs")
    const output = createWriteStream(outputPath)
    const archive = archiver("zip", { zlib: { level: 9 } })
    archive.pipe(output)

    for (let i = 0; i < lines.length; i++) {
      const buffer = await QRCode.toBuffer(lines[i], { width: 256, margin: 2 })
      archive.append(buffer, { name: `qrcode_${i + 1}.png` })
    }

    await archive.finalize()
    await new Promise<void>((resolve) => output.on("close", resolve))

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "application/zip")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "批量二维码生成失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processSignaturePdf(job: Job<UtilJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-sig-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const { PDFDocument } = await import("pdf-lib")
    const pdfBytes = await readFile(inputPath)
    const pdfDoc = await PDFDocument.load(pdfBytes)

    const sigData = String(params.signatureData || "")
    if (!sigData) throw new Error("请提供签名图片数据")

    const sigBytes = Buffer.from(sigData.replace(/^data:image\/\w+;base64,/, ""), "base64")
    const sigImage = sigData.includes("image/png")
      ? await pdfDoc.embedPng(sigBytes)
      : await pdfDoc.embedJpg(sigBytes)

    const page = Number(params.page) || 1
    const x = Number(params.x) || 100
    const y = Number(params.y) || 100
    const width = Number(params.width) || 150
    const height = Number(params.height) || 60

    const pdfPage = pdfDoc.getPage(Math.min(page - 1, pdfDoc.getPageCount() - 1))
    pdfPage.drawImage(sigImage, { x, y, width, height })

    const outputFileName = `signed_${inputFileName}`
    const outputPath = join(workDir, outputFileName)
    const outputBytes = await pdfDoc.save()
    await writeFile(outputPath, outputBytes)

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "签名插入失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processMarkdownToPdf(job: Job<UtilJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-md-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const mdContent = await readFile(inputPath, "utf-8")
    const { marked } = await import("marked")
    const htmlContent = await marked(mdContent)

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px;line-height:1.8;font-size:14px;color:#333}
      h1{font-size:24px;margin-top:32px}h2{font-size:20px;margin-top:24px}h3{font-size:16px}
      code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:13px}
      pre{background:#1f2937;color:#e5e7eb;padding:16px;border-radius:8px;overflow-x:auto}
      pre code{background:none;padding:0;color:inherit}
      blockquote{border-left:4px solid #d1d5db;padding-left:16px;color:#6b7280;margin:16px 0}
      table{border-collapse:collapse;width:100%}th,td{border:1px solid #e5e7eb;padding:8px 12px}th{background:#f9fafb}
      img{max-width:100%}
    </style></head><body>${htmlContent}</body></html>`

    const htmlPath = join(workDir, "temp.html")
    await writeFile(htmlPath, fullHtml)

    const puppeteer = await import("puppeteer")
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    })
    const page = await browser.newPage()
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" })

    const outputFileName = inputFileName.replace(/\.md$/i, ".pdf")
    const outputPath = join(workDir, outputFileName)
    await page.pdf({ path: outputPath, format: "A4", margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" } })
    await browser.close()

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "Markdown 转 PDF 失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processHtmlToPdf(job: Job<UtilJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-html-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const puppeteer = await import("puppeteer")
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    })
    const page = await browser.newPage()
    await page.goto(`file://${inputPath}`, { waitUntil: "networkidle0" })

    const outputFileName = inputFileName.replace(/\.html?$/i, ".pdf")
    const outputPath = join(workDir, outputFileName)
    await page.pdf({ path: outputPath, format: "A4", margin: { top: "15mm", bottom: "15mm", left: "10mm", right: "10mm" } })
    await browser.close()

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "HTML 转 PDF 失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processPdfAddPageNumbers(job: Job<UtilJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-pn-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib")
    const pdfBytes = await readFile(inputPath)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontSize = Number(params.fontSize) || 10
    const pages = pdfDoc.getPages()

    pages.forEach((page, i) => {
      const { width } = page.getSize()
      const text = `${i + 1} / ${pages.length}`
      const textWidth = font.widthOfTextAtSize(text, fontSize)
      page.drawText(text, {
        x: (width - textWidth) / 2,
        y: 20,
        size: fontSize,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
    })

    const outputFileName = `paged_${inputFileName}`
    const outputPath = join(workDir, outputFileName)
    await writeFile(outputPath, await pdfDoc.save())

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "添加页码失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}
