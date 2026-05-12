import { Job } from "bullmq"
import { PrismaClient } from "@prisma/client"
import { mkdtemp, rm, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { getUploadUrl, getDownloadUrl } from "../config/r2.js"

const prisma = new PrismaClient()

interface ImageJobData {
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

export async function processVisibleWatermark(job: Job<ImageJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-wm-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromR2(inputFileKey, inputPath)

    const sharp = (await import("sharp")).default
    const text = String(params.text || "CatConvert")
    const opacity = Number(params.opacity) || 0.3
    const fontSize = Number(params.fontSize) || 48

    const image = sharp(inputPath)
    const metadata = await image.metadata()
    const width = metadata.width || 800
    const height = metadata.height || 600

    const svgText = `<svg width="${width}" height="${height}">
      <style>.wm { fill: rgba(255,255,255,${opacity}); font-size: ${fontSize}px; font-family: sans-serif; }</style>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="wm" transform="rotate(-30, ${width / 2}, ${height / 2})">${text}</text>
    </svg>`

    const outputFileName = `watermarked_${inputFileName}`
    const outputPath = join(workDir, outputFileName)

    await image
      .composite([{ input: Buffer.from(svgText), gravity: "center" }])
      .toFile(outputPath)

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToR2(outputPath, outputKey, "image/png")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "添加水印失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processInvisibleWatermark(job: Job<ImageJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-wm-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromR2(inputFileKey, inputPath)

    const sharp = (await import("sharp")).default
    const message = String(params.message || "CatConvert")

    const image = sharp(inputPath)
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
    const pixels = new Uint8Array(data)

    // LSB steganography: embed message in least significant bits of blue channel
    const msgBits = Array.from(new TextEncoder().encode(message + "\0"))
      .flatMap(byte => Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1))

    for (let i = 0; i < msgBits.length && i * info.channels + 2 < pixels.length; i++) {
      const idx = i * info.channels + 2 // blue channel
      pixels[idx] = (pixels[idx] & 0xFE) | msgBits[i]
    }

    const outputFileName = `steganography_${inputFileName.replace(/\.\w+$/, ".png")}`
    const outputPath = join(workDir, outputFileName)

    await sharp(Buffer.from(pixels), { raw: { width: info.width, height: info.height, channels: info.channels } })
      .png()
      .toFile(outputPath)

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToR2(outputPath, outputKey, "image/png")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "隐形水印嵌入失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processDetectWatermark(job: Job<ImageJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-wm-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromR2(inputFileKey, inputPath)

    const sharp = (await import("sharp")).default
    const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true })
    const pixels = new Uint8Array(data)

    // Extract LSB from blue channel
    const bits: number[] = []
    for (let i = 0; i < Math.min(pixels.length / info.channels, 8192); i++) {
      bits.push(pixels[i * info.channels + 2] & 1)
    }

    const bytes: number[] = []
    for (let i = 0; i + 7 < bits.length; i += 8) {
      let byte = 0
      for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j]
      if (byte === 0) break
      bytes.push(byte)
    }

    const message = new TextDecoder().decode(new Uint8Array(bytes))
    const outputFileName = `watermark_result.txt`
    const outputPath = join(workDir, outputFileName)
    await writeFile(outputPath, `检测到的隐形水印内容：\n${message}\n`)

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToR2(outputPath, outputKey, "text/plain")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "水印检测失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}
