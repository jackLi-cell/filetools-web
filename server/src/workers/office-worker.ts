import { Job } from "bullmq"
import { PrismaClient } from "@prisma/client"
import { execFile } from "child_process"
import { promisify } from "util"
import { mkdtemp, rm, readdir, readFile, writeFile } from "fs/promises"
import { basename, join } from "path"
import { tmpdir } from "os"
import { downloadFileFromStorage, uploadFileToStorage } from "../config/storage.js"
import { baseNameWithoutExt, createZipArchive, renderPdfPagesToImages } from "./worker-utils.js"

const execFileAsync = promisify(execFile)
const prisma = new PrismaClient()

interface OfficeJobData {
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
  const inputBase = basename(inputPath).replace(/\.[^.]+$/, "")
  const outputFile = files.find(f => f.startsWith(inputBase) && f.endsWith(`.${format}`))
  if (!outputFile) throw new Error(`LibreOffice 转换失败：未找到输出文件`)
  return join(outputDir, outputFile)
}

async function pdfToImageZip(
  pdfPath: string,
  workDir: string,
  inputFileName: string,
  taskId: string,
  params: Record<string, unknown>,
): Promise<void> {
  const baseName = baseNameWithoutExt(inputFileName)
  const images = await renderPdfPagesToImages(pdfPath, workDir, baseName, params)
  let outputFileName: string
  let outputPath: string
  let contentType: string
  if (images.length === 1) {
    outputFileName = images[0].name
    outputPath = images[0].path
    contentType = outputFileName.endsWith(".jpg") ? "image/jpeg" : "image/png"
  } else {
    outputFileName = `${baseName}_images.zip`
    outputPath = join(workDir, outputFileName)
    await createZipArchive(outputPath, images)
    contentType = "application/zip"
  }

  const outputKey = `results/${taskId}/${outputFileName}`
  const outputSize = await uploadToStorage(outputPath, outputKey, contentType)
  await markCompleted(taskId, outputKey, outputFileName, outputSize)
}

async function extractPdfTextToDocx(pdfPath: string, outputPath: string, inputFileName: string) {
  const { PDFParse } = await import("pdf-parse")
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx")
  const parser = new PDFParse({ data: await readFile(pdfPath) })
  try {
    const result = await parser.getText()
    const lines = result.text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    const children = [
      new Paragraph({
        text: `PDF 转 Word：${inputFileName}`,
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        children: [
          new TextRun("说明：该文件由 PDF 文本内容提取生成，复杂排版、图片和表格可能无法完整还原。"),
        ],
      }),
      ...lines.map((line) => new Paragraph({ text: line })),
    ]

    const doc = new Document({ sections: [{ children }] })
    await writeFile(outputPath, await Packer.toBuffer(doc))
  } finally {
    await parser.destroy()
  }
}

export async function processWordToPdf(job: Job<OfficeJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-lo-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const outputPath = await libreofficeConvert(inputPath, workDir, "pdf")
    const outputFileName = basename(outputPath)

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "application/pdf")
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
    await downloadFromStorage(inputFileKey, inputPath)

    let outputPath: string
    try {
      outputPath = await libreofficeConvert(inputPath, workDir, "docx")
    } catch {
      outputPath = join(workDir, `${baseNameWithoutExt(inputFileName)}.docx`)
      await extractPdfTextToDocx(inputPath, outputPath, inputFileName)
    }
    const outputFileName = basename(outputPath)

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
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
    await downloadFromStorage(inputFileKey, inputPath)

    const outputPath = await libreofficeConvert(inputPath, workDir, "pdf")
    const outputFileName = basename(outputPath)

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "Excel 转 PDF 失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processExcelToImage(job: Job<OfficeJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-lo-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const pdfPath = await libreofficeConvert(inputPath, workDir, "pdf")
    await pdfToImageZip(pdfPath, workDir, inputFileName, taskId, params)
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
    await downloadFromStorage(inputFileKey, inputPath)

    const outputPath = await libreofficeConvert(inputPath, workDir, "pdf")
    const outputFileName = basename(outputPath)

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "application/pdf")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "PPT 转 PDF 失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processPptToImage(job: Job<OfficeJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-lo-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const pdfPath = await libreofficeConvert(inputPath, workDir, "pdf")
    await pdfToImageZip(pdfPath, workDir, inputFileName, taskId, params)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "PPT 转图片失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processWordToImage(job: Job<OfficeJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-lo-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const pdfPath = await libreofficeConvert(inputPath, workDir, "pdf")
    await pdfToImageZip(pdfPath, workDir, inputFileName, taskId, params)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "Word 转图片失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}
