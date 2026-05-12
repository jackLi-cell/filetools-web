import { Job } from "bullmq"
import { PrismaClient } from "@prisma/client"
import { execFile } from "child_process"
import { promisify } from "util"
import { mkdtemp, rm, readdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { getUploadUrl, getDownloadUrl } from "../config/r2.js"

const execFileAsync = promisify(execFile)
const prisma = new PrismaClient()

interface OfficeJobData {
  taskId: string
  toolSlug: string
  inputFileKey: string
  inputFileName: string
  params: Record<string, unknown>
}

async function downloadFromR2(fileKey: string, destPath: string) {
  const url = await getDownloadUrl(fileKey)
  const response = await fetch(url)
  await writeFile(destPath, Buffer.from(await response.arrayBuffer()))
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
  await prisma.processTask.update({ where: { id: taskId }, data: { status: "failed", errorMessage: message, completedAt: new Date() } })
}

async function libreofficeConvert(inputPath: string, outputDir: string, format: string): Promise<string> {
  await execFileAsync("libreoffice", [
    "--headless",
    "--norestore",
    "--nolockcheck",
    "--nologo",
    "--convert-to", format,
    "--outdir", outputDir,
    inputPath,
  ], { timeout: 60000, env: { ...process.env, HOME: "/tmp" } })

  const files = await readdir(outputDir)
  const inputBase = inputPath.split("/").pop()!.replace(/\.[^.]+$/, "")
  const outputFile = files.find(f => f.startsWith(inputBase) && f.endsWith(`.${format}`))
  if (!outputFile) throw new Error(`LibreOffice 转换失败：未找到输出文件`)
  return join(outputDir, outputFile)
}

export async function processWordToPdf(job: Job<OfficeJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-lo-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromR2(inputFileKey, inputPath)

    const outputPath = await libreofficeConvert(inputPath, workDir, "pdf")
    const outputFileName = outputPath.split("/").pop()!

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToR2(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "Word 转 PDF 失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processPdfToWord(job: Job<OfficeJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-lo-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromR2(inputFileKey, inputPath)

    const outputPath = await libreofficeConvert(inputPath, workDir, "docx")
    const outputFileName = outputPath.split("/").pop()!

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToR2(outputPath, outputKey, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "PDF 转 Word 失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processExcelToPdf(job: Job<OfficeJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-lo-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromR2(inputFileKey, inputPath)

    const outputPath = await libreofficeConvert(inputPath, workDir, "pdf")
    const outputFileName = outputPath.split("/").pop()!

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToR2(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "Excel 转 PDF 失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processExcelToImage(job: Job<OfficeJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-lo-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromR2(inputFileKey, inputPath)

    // Excel → PDF → Image
    const pdfPath = await libreofficeConvert(inputPath, workDir, "pdf")

    const outputFileName = inputFileName.replace(/\.\w+$/, ".png")
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("gs", [
      "-dNOPAUSE", "-dBATCH", "-sDEVICE=png16m", "-r150",
      "-dFirstPage=1", "-dLastPage=1",
      `-sOutputFile=${outputPath}`, pdfPath,
    ], { timeout: 60000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToR2(outputPath, outputKey, "image/png")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "Excel 转图片失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processPptToPdf(job: Job<OfficeJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-lo-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromR2(inputFileKey, inputPath)

    const outputPath = await libreofficeConvert(inputPath, workDir, "pdf")
    const outputFileName = outputPath.split("/").pop()!

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToR2(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "PPT 转 PDF 失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processPptToImage(job: Job<OfficeJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-lo-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromR2(inputFileKey, inputPath)

    // PPT → PDF → Image
    const pdfPath = await libreofficeConvert(inputPath, workDir, "pdf")

    const outputFileName = inputFileName.replace(/\.\w+$/, ".png")
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("gs", [
      "-dNOPAUSE", "-dBATCH", "-sDEVICE=png16m", "-r150",
      "-dFirstPage=1", "-dLastPage=1",
      `-sOutputFile=${outputPath}`, pdfPath,
    ], { timeout: 60000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToR2(outputPath, outputKey, "image/png")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "PPT 转图片失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processWordToImage(job: Job<OfficeJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-lo-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromR2(inputFileKey, inputPath)

    // Word → PDF → Image
    const pdfPath = await libreofficeConvert(inputPath, workDir, "pdf")

    const outputFileName = inputFileName.replace(/\.\w+$/, ".png")
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("gs", [
      "-dNOPAUSE", "-dBATCH", "-sDEVICE=png16m", "-r150",
      "-dFirstPage=1", "-dLastPage=1",
      `-sOutputFile=${outputPath}`, pdfPath,
    ], { timeout: 60000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToR2(outputPath, outputKey, "image/png")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "Word 转图片失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}
