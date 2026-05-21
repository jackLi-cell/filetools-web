import { Job } from "bullmq"
import { PrismaClient } from "@prisma/client"
import { execFile } from "child_process"
import { promisify } from "util"
import { mkdtemp, rm, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { downloadFileFromStorage, uploadFileToStorage } from "../config/storage.js"
import { createWorker } from "../config/queue.js"
import { refundTaskCredits } from "../services/credits.js"
import { processVideoCompress, processVideoConvert, processVideoToGif, processVideoExtractAudio, processAudioConvert, processAudioCompress, processAudioTrim, processAudioMerge } from "./media-worker.js"
import { processVisibleWatermark, processInvisibleWatermark, processDetectWatermark } from "./image-worker.js"
import { processPdfRotate, processPdfEncrypt, processPdfDecrypt, processPdfExtract, processFileHash, processClearMetadata } from "./pdf-advanced-worker.js"
import { processWordToPdf, processPdfToWord, processExcelToPdf, processExcelToImage, processPptToPdf, processPptToImage, processWordToImage } from "./office-worker.js"
import { processAudioSpeed, processAudioDenoise, processVideoClip } from "./media-worker.js"
import { processCsvToExcel, processExcelToCsv, processBatchQrcode, processSignaturePdf, processMarkdownToPdf, processHtmlToPdf, processPdfAddPageNumbers } from "./util-worker.js"
import { baseNameWithoutExt, createZipArchive, getInputFiles, renderPdfPagesToImages, type JobInputFile } from "./worker-utils.js"

const execFileAsync = promisify(execFile)
const prisma = new PrismaClient()

interface ProcessJobData {
  taskId: string
  toolSlug: string
  inputFileKey: string
  inputFileName: string
  inputFiles?: JobInputFile[]
  params: Record<string, unknown>
}

async function downloadFromStorage(fileKey: string, destPath: string) {
  await downloadFileFromStorage(fileKey, destPath)
}

async function uploadToStorage(filePath: string, key: string, _contentType: string): Promise<number> {
  return uploadFileToStorage(filePath, key)
}

async function markProcessing(taskId: string) {
  await prisma.processTask.update({ where: { id: taskId }, data: { status: "processing", startedAt: new Date(), errorMessage: null } })
}

async function markCompleted(taskId: string, outputKey: string, outputFileName: string, outputSize: number) {
  await prisma.processTask.update({
    where: { id: taskId },
    data: { status: "completed", outputFileKey: outputKey, outputFileName, outputFileSize: BigInt(outputSize), errorMessage: null, completedAt: new Date() },
  })
}

async function markFailed(taskId: string, message: string) {
  await prisma.processTask.update({
    where: { id: taskId },
    data: { status: "processing", errorMessage: message },
  })
}

async function processPdfToImage(job: Job<ProcessJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const images = await renderPdfPagesToImages(inputPath, workDir, baseNameWithoutExt(inputFileName), params)
    let outputFileName: string
    let outputPath: string
    let contentType: string
    if (images.length === 1) {
      outputFileName = images[0].name
      outputPath = images[0].path
      contentType = outputFileName.endsWith(".jpg") ? "image/jpeg" : "image/png"
    } else {
      outputFileName = `${baseNameWithoutExt(inputFileName)}_images.zip`
      outputPath = join(workDir, outputFileName)
      await createZipArchive(outputPath, images)
      contentType = "application/zip"
    }

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, contentType)
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "PDF 转图片失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

async function processPdfSplit(job: Job<ProcessJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const { PDFDocument } = await import("pdf-lib")
    const sourceBytes = await readFile(inputPath)
    const sourceDoc = await PDFDocument.load(sourceBytes)
    const pageCount = sourceDoc.getPageCount()
    if (pageCount < 1) throw new Error("PDF 文件没有可拆分的页面")

    const splitMode = String(params.splitMode || "range")

    let outputFileName: string
    let outputPath: string
    if (splitMode === "each") {
      const entries: Array<{ path: string; name: string }> = []
      for (let i = 0; i < pageCount; i++) {
        const doc = await PDFDocument.create()
        const [page] = await doc.copyPages(sourceDoc, [i])
        doc.addPage(page)
        const name = `${baseNameWithoutExt(inputFileName)}_page_${String(i + 1).padStart(3, "0")}.pdf`
        const path = join(workDir, name)
        await writeFile(path, await doc.save())
        entries.push({ path, name })
      }
      outputFileName = `${baseNameWithoutExt(inputFileName)}_split_pages.zip`
      outputPath = join(workDir, outputFileName)
      await createZipArchive(outputPath, entries)
    } else {
      const startPage = Math.max(1, Number(params.startPage) || 1)
      const endPage = Math.min(pageCount, Number(params.endPage) || startPage)
      if (startPage > endPage) throw new Error("起始页不能大于结束页")

      const indices = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage - 1 + i)
      const outputDoc = await PDFDocument.create()
      const pages = await outputDoc.copyPages(sourceDoc, indices)
      pages.forEach((page) => outputDoc.addPage(page))

      outputFileName = `${baseNameWithoutExt(inputFileName)}_p${startPage}-p${endPage}.pdf`
      outputPath = join(workDir, outputFileName)
      await writeFile(outputPath, await outputDoc.save())
    }

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, outputFileName.endsWith(".zip") ? "application/zip" : "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "PDF 拆分失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

async function processPdfCompress(job: Job<ProcessJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const outputFileName = `compressed_${inputFileName}`
    const outputPath = join(workDir, outputFileName)
    const quality = String(params.quality || "ebook")
    const allowedQualities = new Set(["screen", "ebook", "printer", "prepress", "default"])
    const pdfSettings = allowedQualities.has(quality) ? quality : "ebook"

    await execFileAsync("gs", [
      "-dNOPAUSE", "-dBATCH", "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      `-dPDFSETTINGS=/${pdfSettings}`,
      `-sOutputFile=${outputPath}`, inputPath,
    ], { timeout: 120000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "PDF 压缩失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

async function processPdfMerge(job: Job<ProcessJobData>) {
  const { taskId } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-"))
  try {
    await markProcessing(taskId)
    const inputs = getInputFiles(job.data)
    if (inputs.length < 2) throw new Error("PDF 合并至少需要上传 2 个 PDF 文件")

    const outputFileName = "merged.pdf"
    const outputPath = join(workDir, outputFileName)
    const { PDFDocument } = await import("pdf-lib")
    const outputDoc = await PDFDocument.create()

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i]
      const inputPath = join(workDir, `${String(i + 1).padStart(2, "0")}_${input.fileName}`)
      await downloadFromStorage(input.fileKey, inputPath)
      const sourceDoc = await PDFDocument.load(await readFile(inputPath))
      const pages = await outputDoc.copyPages(sourceDoc, sourceDoc.getPageIndices())
      pages.forEach((page) => outputDoc.addPage(page))
    }

    if (outputDoc.getPageCount() === 0) throw new Error("PDF 文件没有可合并的页面")
    await writeFile(outputPath, await outputDoc.save())

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "PDF 合并失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

async function processImageToPdf(job: Job<ProcessJobData>) {
  const { taskId } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-"))
  try {
    await markProcessing(taskId)
    const inputs = getInputFiles(job.data)
    const { PDFDocument } = await import("pdf-lib")
    const sharp = (await import("sharp")).default
    const outputDoc = await PDFDocument.create()

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i]
      const inputPath = join(workDir, `${String(i + 1).padStart(2, "0")}_${input.fileName}`)
      await downloadFromStorage(input.fileKey, inputPath)

      const image = sharp(inputPath, { pages: 1 }).rotate()
      const metadata = await image.metadata()
      const format = metadata.format === "jpeg" ? "jpeg" : "png"
      const bytes = format === "jpeg"
        ? await image.jpeg({ quality: 95 }).toBuffer()
        : await image.png().toBuffer()
      const embedded = format === "jpeg"
        ? await outputDoc.embedJpg(bytes)
        : await outputDoc.embedPng(bytes)
      const width = Math.max(1, metadata.width || embedded.width)
      const height = Math.max(1, metadata.height || embedded.height)
      const page = outputDoc.addPage([width, height])
      page.drawImage(embedded, { x: 0, y: 0, width, height })
    }

    if (outputDoc.getPageCount() === 0) throw new Error("请至少上传 1 张图片")

    const outputFileName = inputs.length === 1
      ? `${baseNameWithoutExt(inputs[0].fileName)}.pdf`
      : "images.pdf"
    const outputPath = join(workDir, outputFileName)
    await writeFile(outputPath, await outputDoc.save())

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "图片转 PDF 失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

const worker = createWorker(async (job: Job<ProcessJobData>) => {
  const { toolSlug, taskId } = job.data
  const startTime = Date.now()
  console.log(`[Worker] Processing ${toolSlug}: ${taskId}`)

  switch (toolSlug) {
    // PDF
    case "pdf-to-image": return processPdfToImage(job)
    case "pdf-merge": return processPdfMerge(job)
    case "pdf-split": return processPdfSplit(job)
    case "pdf-compress": return processPdfCompress(job)
    case "image-to-pdf": return processImageToPdf(job)
    // Video
    case "video-compress": return processVideoCompress(job)
    case "video-convert": return processVideoConvert(job)
    case "video-to-gif": return processVideoToGif(job)
    case "video-extract-audio": return processVideoExtractAudio(job)
    // Audio
    case "audio-convert": return processAudioConvert(job)
    case "audio-compress": return processAudioCompress(job)
    case "audio-trim": return processAudioTrim(job)
    case "audio-merge": return processAudioMerge(job)
    // Image
    case "image-watermark": return processVisibleWatermark(job)
    case "image-steganography": return processInvisibleWatermark(job)
    case "image-steganography-detect": return processDetectWatermark(job)
    // PDF advanced
    case "pdf-rotate": return processPdfRotate(job)
    case "pdf-extract": return processPdfExtract(job)
    case "pdf-encrypt": return processPdfEncrypt(job)
    case "pdf-decrypt": return processPdfDecrypt(job)
    // Security
    case "file-hash": return processFileHash(job)
    case "image-metadata-clear": return processClearMetadata(job)
    case "pdf-metadata-clear": return processClearMetadata(job)
    // Office (LibreOffice)
    case "word-to-pdf": return processWordToPdf(job)
    case "pdf-to-word": return processPdfToWord(job)
    case "excel-to-pdf": return processExcelToPdf(job)
    case "excel-to-image": return processExcelToImage(job)
    case "ppt-to-pdf": return processPptToPdf(job)
    case "ppt-to-image": return processPptToImage(job)
    case "word-to-image": return processWordToImage(job)
    // FFmpeg extended
    case "audio-speed": return processAudioSpeed(job)
    case "audio-denoise": return processAudioDenoise(job)
    case "video-clip": return processVideoClip(job)
    // Utilities
    case "csv-to-excel": return processCsvToExcel(job)
    case "excel-to-csv": return processExcelToCsv(job)
    case "batch-qrcode": return processBatchQrcode(job)
    case "signature-pdf": return processSignaturePdf(job)
    case "markdown-to-pdf": return processMarkdownToPdf(job)
    case "html-to-pdf": return processHtmlToPdf(job)
    case "pdf-page-number": return processPdfAddPageNumbers(job)
    default:
      throw new Error(`工具 ${toolSlug} 暂未实现`)
  }
})

worker.on("completed", async (job) => {
  const { toolSlug, taskId } = job.data as ProcessJobData
  const processTime = Date.now() - (job.processedOn || Date.now())
  const { recordToolUsage } = await import("../services/stats.js")
  const task = await prisma.processTask.findUnique({
    where: { id: taskId },
    select: { creditsCost: true },
  })
  await recordToolUsage(toolSlug, true, processTime, task?.creditsCost || 0)
  console.log(`[Worker] Done: ${job.id} (${processTime}ms)`)
})

worker.on("failed", async (job, err) => {
  if (!job) return
  const { toolSlug, taskId } = job.data as ProcessJobData
  const processTime = Date.now() - (job.processedOn || Date.now())
  const { recordToolUsage } = await import("../services/stats.js")
  const maxAttempts = job.opts.attempts || 1
  if (job.attemptsMade >= maxAttempts) {
    await prisma.processTask.update({
      where: { id: taskId },
      data: {
        status: "failed",
        errorMessage: (job.failedReason || "处理失败").slice(0, 500),
        completedAt: new Date(),
      },
    })
    await refundTaskCredits(prisma, taskId)
  }
  await recordToolUsage(toolSlug, false, processTime, 0)
  console.error(`[Worker] Failed: ${job.id}`, err.message)
})

export default worker
