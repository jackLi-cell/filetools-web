import { Job } from "bullmq"
import { PrismaClient } from "@prisma/client"
import { execFile } from "child_process"
import { promisify } from "util"
import { mkdtemp, rm, readFile, writeFile, stat } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { downloadFileFromStorage, uploadFileToStorage } from "../config/storage.js"

const execFileAsync = promisify(execFile)
const prisma = new PrismaClient()

interface MediaJobData {
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
  await prisma.processTask.update({
    where: { id: taskId },
    data: { status: "failed", errorMessage: message, completedAt: new Date() },
  })
}

export async function processVideoCompress(job: Job<MediaJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-vid-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const crf = String(params.quality || 28)
    const outputFileName = `compressed_${inputFileName.replace(/\.\w+$/, ".mp4")}`
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("ffmpeg", [
      "-i", inputPath, "-c:v", "libx264", "-crf", crf,
      "-preset", "medium", "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart", "-y",
      "-protocol_whitelist", "file",
      outputPath,
    ], { timeout: 300000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "video/mp4")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "视频压缩失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processVideoConvert(job: Job<MediaJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-vid-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const format = String(params.format || "mp4")
    const outputFileName = inputFileName.replace(/\.\w+$/, `.${format}`)
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("ffmpeg", [
      "-i", inputPath, "-y", "-protocol_whitelist", "file", outputPath,
    ], { timeout: 300000 })

    const mimeMap: Record<string, string> = { mp4: "video/mp4", webm: "video/webm", avi: "video/x-msvideo", mov: "video/quicktime" }
    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, mimeMap[format] || "video/mp4")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "视频转换失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processVideoToGif(job: Job<MediaJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-vid-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const fps = String(params.fps || 10)
    const width = String(params.width || 480)
    const outputFileName = inputFileName.replace(/\.\w+$/, ".gif")
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("ffmpeg", [
      "-i", inputPath, "-vf", `fps=${fps},scale=${width}:-1:flags=lanczos`,
      "-y", "-protocol_whitelist", "file", outputPath,
    ], { timeout: 120000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "image/gif")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "视频转 GIF 失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processVideoExtractAudio(job: Job<MediaJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-vid-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const outputFileName = inputFileName.replace(/\.\w+$/, ".mp3")
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("ffmpeg", [
      "-i", inputPath, "-vn", "-acodec", "libmp3lame", "-b:a", "192k",
      "-y", "-protocol_whitelist", "file", outputPath,
    ], { timeout: 120000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "audio/mpeg")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "提取音频失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processAudioConvert(job: Job<MediaJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-aud-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const format = String(params.format || "mp3")
    const outputFileName = inputFileName.replace(/\.\w+$/, `.${format}`)
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("ffmpeg", [
      "-i", inputPath, "-y", "-protocol_whitelist", "file", outputPath,
    ], { timeout: 120000 })

    const mimeMap: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav", flac: "audio/flac", aac: "audio/aac", ogg: "audio/ogg" }
    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, mimeMap[format] || "audio/mpeg")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "音频转换失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processAudioCompress(job: Job<MediaJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-aud-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const bitrate = String(params.bitrate || "128k")
    const outputFileName = `compressed_${inputFileName.replace(/\.\w+$/, ".mp3")}`
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("ffmpeg", [
      "-i", inputPath, "-acodec", "libmp3lame", "-b:a", bitrate,
      "-y", "-protocol_whitelist", "file", outputPath,
    ], { timeout: 120000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "audio/mpeg")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "音频压缩失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processAudioTrim(job: Job<MediaJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-aud-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const start = String(params.start || "0")
    const duration = String(params.duration || "30")
    const ext = inputFileName.split(".").pop() || "mp3"
    const outputFileName = `trimmed_${inputFileName}`
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("ffmpeg", [
      "-i", inputPath, "-ss", start, "-t", duration, "-c", "copy",
      "-y", "-protocol_whitelist", "file", outputPath,
    ], { timeout: 60000 })

    const mimeMap: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav", flac: "audio/flac", ogg: "audio/ogg" }
    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, mimeMap[ext] || "audio/mpeg")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "音频裁剪失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processAudioMerge(job: Job<MediaJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-aud-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const outputFileName = `merged_${inputFileName}`
    const outputPath = join(workDir, outputFileName)

    // Single file pass-through for now; multi-file merge needs concat protocol
    await execFileAsync("ffmpeg", [
      "-i", inputPath, "-c", "copy", "-y", "-protocol_whitelist", "file", outputPath,
    ], { timeout: 120000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "audio/mpeg")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "音频合并失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processAudioSpeed(job: Job<MediaJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-aud-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const speed = Math.min(2, Math.max(0.5, Number(params.speed) || 1.5))
    const outputFileName = `speed_${speed}x_${inputFileName.replace(/\.\w+$/, ".mp3")}`
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("ffmpeg", [
      "-i", inputPath, "-filter:a", `atempo=${speed}`,
      "-y", "-protocol_whitelist", "file", outputPath,
    ], { timeout: 120000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "audio/mpeg")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "音频变速失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processAudioDenoise(job: Job<MediaJobData>) {
  const { taskId, inputFileKey, inputFileName } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-aud-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const outputFileName = `denoised_${inputFileName.replace(/\.\w+$/, ".mp3")}`
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("ffmpeg", [
      "-i", inputPath, "-af", "afftdn=nf=-25",
      "-y", "-protocol_whitelist", "file", outputPath,
    ], { timeout: 120000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "audio/mpeg")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "音频降噪失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

export async function processVideoClip(job: Job<MediaJobData>) {
  const { taskId, inputFileKey, inputFileName, params } = job.data
  const workDir = await mkdtemp(join(tmpdir(), "ft-vid-"))
  try {
    await markProcessing(taskId)
    const inputPath = join(workDir, inputFileName)
    await downloadFromStorage(inputFileKey, inputPath)

    const start = String(params.start || "0")
    const end = String(params.end || "10")
    const outputFileName = `clip_${inputFileName.replace(/\.\w+$/, ".mp4")}`
    const outputPath = join(workDir, outputFileName)

    await execFileAsync("ffmpeg", [
      "-i", inputPath, "-ss", start, "-to", end, "-c", "copy",
      "-y", "-protocol_whitelist", "file", outputPath,
    ], { timeout: 120000 })

    const outputKey = `results/${taskId}/${outputFileName}`
    const outputSize = await uploadToStorage(outputPath, outputKey, "video/mp4")
    await markCompleted(taskId, outputKey, outputFileName, outputSize)
  } catch (error: unknown) {
    await markFailed(taskId, error instanceof Error ? error.message : "视频截取失败")
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}
