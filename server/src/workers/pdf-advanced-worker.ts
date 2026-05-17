import { Job } from "bullmq"
import { PrismaClient } from "@prisma/client"
import { execFile } from "child_process"
import { promisify } from "util"
import { mkdtemp, rm, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { downloadFileFromStorage, uploadFileToStorage } from "../config/storage.js"

const execFileAsync = promisify(execFile)
const prisma = new PrismaClient()

interface PdfJobData {
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

export async function processPdfRotate(job: Job<PdfJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-pdf-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const angle = Number(params.angle) || 90 // 90, 180, 270
    const outputFileName = `rotated_${inputFileName}`
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("qpdf", [
      "--rotate", `+${angle}`, inputPath, outputPath,
    ], { timeout: 60000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "PDF 旋转失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processPdfEncrypt(job: Job<PdfJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-pdf-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const password = String(params.password || "")
    if (!password) throw new Error("请提供密码")
    if (password.length < 4) throw new Error("密码至少 4 位")

    const outputFileName = `encrypted_${inputFileName}`
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("qpdf", [
      "--encrypt", password, password, "256", "--", inputPath, outputPath,
    ], { timeout: 60000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "PDF 加密失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processPdfDecrypt(job: Job<PdfJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-pdf-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const password = String(params.password || "")
    if (!password) throw new Error("请提供 PDF 密码")

    const outputFileName = `decrypted_${inputFileName}`
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("qpdf", [
      "--password=" + password, "--decrypt", inputPath, outputPath,
    ], { timeout: 60000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "PDF 解密失败，请检查密码")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processPdfExtract(job: Job<PdfJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-pdf-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const pages = String(params.pages || "1") // 例如 "1,3,5" 或 "1-5"
    const outputFileName = `extracted_${inputFileName}`
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("qpdf", [
      inputPath, "--pages", inputPath, pages.replace(/,/g, " "), "--", outputPath,
    ], { timeout: 60000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "PDF 页面提取失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processFileHash(job: Job<PdfJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-hash-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const crypto = await import("crypto")
    const buffer = await readFile(inputPath)
    const md5 = crypto.createHash("md5").update(buffer).digest("hex")
    const sha1 = crypto.createHash("sha1").update(buffer).digest("hex")
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex")

    const content = `文件：${inputFileName}\n大小：${buffer.length} 字节\n\nMD5    : ${md5}\nSHA-1  : ${sha1}\nSHA-256: ${sha256}\n`
    const outputFileName = `hash_${inputFileName}.txt`
    const outputPath = join(workDir, outputFileName)
    await writeFile(outputPath, content)

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "text/plain")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "哈希计算失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processClearMetadata(job: Job<PdfJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-meta-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const outputFileName = `cleaned_${inputFileName}`
    const outputPath = join(workDir, outputFileName)
    const ext = inputFileName.split(".").pop()?.toLowerCase() || ""

    if (ext === "pdf") {
      await execFileAsync("qpdf", [
        "--linearize", "--remove-unreferenced-resources=yes", inputPath, outputPath,
      ], { timeout: 60000 })
    } else {
      const sharp = (await import("sharp")).default
      await sharp(inputPath).withMetadata({ orientation: undefined }).toFile(outputPath)
    }

    const contentType = ext === "pdf" ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}`
    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, contentType)
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "元数据清除失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}
