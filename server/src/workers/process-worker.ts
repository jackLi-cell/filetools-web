import { Job } from "bullmq"
import { PrismaClient } from "@prisma/client"
import { execFile } from "child_process"
import { promisify } from "util"
import { mkdtemp, rm, readdir, readFile, writeFile, stat } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { getUploadUrl, getDownloadUrl } from "../config/r2.js"
import { createWorker } from "../config/queue.js"
import { processVideoCompress, processVideoConvert, processVideoToGif, processVideoExtractAudio, processAudioConvert, processAudioCompress, processAudioTrim, processAudioMerge } from "./media-worker.js"
import { processVisibleWatermark, processInvisibleWatermark, processDetectWatermark } from "./image-worker.js"
import { processPdfRotate, processPdfEncrypt, processPdfDecrypt, processPdfExtract, processFileHash, processClearMetadata } from "./pdf-advanced-worker.js"
import { processWordToPdf, processPdfToWord, processExcelToPdf, processExcelToImage, processPptToPdf, processPptToImage, processWordToImage } from "./office-worker.js"
import { processAudioSpeed, processAudioDenoise, processVideoClip } from "./media-worker.js"
import { processCsvToExcel, processExcelToCsv, processBatchQrcode, processSignaturePdf, processMarkdownToPdf, processHtmlToPdf, processPdfAddPageNumbers } from "./util-worker.js"

const execFileAsync = promisify(execFile)
const prisma = new PrismaClient()

interface ProcessJobData {
  taskId: string
  toolSlug: string
  inputFileKey: string
  inputFileName: string
  params: Record<string, unknown>
}

async function downloadFromR2(fileKey: string, destPath: string) {
  const url = await getDownloadUrl(fileKey)
  const response = await fetch(url)
  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(destPath, buffer)
}

async function uploadToR2(filePath: string, key: string, contentType: string): Promise<number> {
  const fileBuffer = await readFile(filePath)
  const uploadUrl = await getUploadUrl(key, contentType)
  await fetch(uploadUrl, { method: "PUT", body: fileBuffer, headers: { "Content-Type": contentType } })
  return fileBuffer.length
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
  await prisma.processTask.update({
    where: { id: taskId },
    data: { status: "failed", errorMessage: message, completedAt: new Date() },
  })
}

async function processPdfToImage(job: Job<ProcessJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromR2(inputFileKey, inputPath)

    const outputFileName = inputFileName.replace(/\.pdf$/i, "_page1.png")
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("gs", [
      "-dNOPAUSE", "-dBATCH", "-sDEVICE=png16m", "-r150",
      "-dFirstPage=1", "-dLastPage=1",
      `-sOutputFile=${outputPath}`, inputPath,
    ], { timeout: 60000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToR2(outputPath, outputKey, "image/png")
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
    await downloadFromR2(inputFileKey, inputPath)

    const startPage = Number(params.startPage) || 1
    const endPage = Number(params.endPage) || 1
    const outputFileName = `split_p${startPage}-p${endPage}.pdf`
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("gs", [
      "-dNOPAUSE", "-dBATCH", "-sDEVICE=pdfwrite",
      `-dFirstPage=${startPage}`, `-dLastPage=${endPage}`,
      `-sOutputFile=${outputPath}`, inputPath,
    ], { timeout: 60000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToR2(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "PDF 拆分失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

async function processPdfCompress(job: Job<ProcessJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromR2(inputFileKey, inputPath)

    const outputFileName = `compressed_${inputFileName}`
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("gs", [
      "-dNOPAUSE", "-dBATCH", "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-dPDFSETTINGS=/ebook",
      `-sOutputFile=${outputPath}`, inputPath,
    ], { timeout: 60000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToR2(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "PDF 压缩失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

async function processPdfMerge(job: Job<ProcessJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromR2(inputFileKey, inputPath)

    const outputFileName = "merged.pdf"
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("gs", [
      "-dNOPAUSE", "-dBATCH", "-sDEVICE=pdfwrite",
      `-sOutputFile=${outputPath}`, inputPath,
    ], { timeout: 60000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToR2(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "PDF 合并失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

async function processImageToPdf(job: Job<ProcessJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromR2(inputFileKey, inputPath)

    const outputFileName = inputFileName.replace(/\.\w+$/, ".pdf")
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("gs", [
      "-dNOPAUSE", "-dBATCH", "-sDEVICE=pdfwrite",
      `-sOutputFile=${outputPath}`, inputPath,
    ], { timeout: 60000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToR2(outputPath, outputKey, "application/pdf")
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
      await markFailed(taskId, `工具 ${toolSlug} 暂未实现`)
  }
})

worker.on("completed", async (job) => {
  const { toolSlug } = job.data as ProcessJobData
  const processTime = Date.now() - (job.processedOn || Date.now())
  const { recordToolUsage } = await import("../services/stats.js")
  await recordToolUsage(toolSlug, true, processTime, 0)
  console.log(`[Worker] Done: ${job.id} (${processTime}ms)`)
})

worker.on("failed", async (job, err) => {
  if (!job) return
  const { toolSlug } = job.data as ProcessJobData
  const processTime = Date.now() - (job.processedOn || Date.now())
  const { recordToolUsage } = await import("../services/stats.js")
  await recordToolUsage(toolSlug, false, processTime, 0)
  console.error(`[Worker] Failed: ${job.id}`, err.message)
})

export default worker
