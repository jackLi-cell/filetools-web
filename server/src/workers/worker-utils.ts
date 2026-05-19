import archiver from "archiver"
import { execFile } from "child_process"
import { createWriteStream } from "fs"
import { readdir } from "fs/promises"
import { basename, join } from "path"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export interface JobInputFile {
  fileKey: string
  fileName: string
}

export interface MultiInputJobData {
  inputFileKey: string
  inputFileName: string
  inputFiles?: JobInputFile[]
}

export function getInputFiles(data: MultiInputJobData): JobInputFile[] {
  if (Array.isArray(data.inputFiles) && data.inputFiles.length > 0) {
    return data.inputFiles
  }
  return [{ fileKey: data.inputFileKey, fileName: data.inputFileName }]
}

export function baseNameWithoutExt(fileName: string): string {
  return basename(fileName).replace(/\.[^.]+$/, "") || "output"
}

export async function createZipArchive(
  zipPath: string,
  entries: Array<{ path: string; name: string }>,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath)
    const archive = archiver("zip", { zlib: { level: 9 } })

    output.on("close", resolve)
    output.on("error", reject)
    archive.on("error", reject)

    archive.pipe(output)
    for (const entry of entries) {
      archive.file(entry.path, { name: entry.name })
    }
    void archive.finalize()
  })
}

export async function renderPdfPagesToImages(
  pdfPath: string,
  outputDir: string,
  baseName: string,
  params: Record<string, unknown> = {},
): Promise<Array<{ path: string; name: string }>> {
  const format = String(params.format || "png").toLowerCase() === "jpg" ? "jpg" : "png"
  const dpi = Math.min(Math.max(Number(params.dpi) || 150, 72), 300)
  const ext = format === "jpg" ? "jpg" : "png"
  const device = format === "jpg" ? "jpeg" : "png16m"
  const outputPattern = join(outputDir, `${baseName}_page_%03d.${ext}`)
  const args = [
    "-dNOPAUSE",
    "-dBATCH",
    `-sDEVICE=${device}`,
    `-r${dpi}`,
  ]

  if (format === "jpg") {
    args.push("-dJPEGQ=90")
  }

  args.push(`-sOutputFile=${outputPattern}`, pdfPath)
  await execFileAsync("gs", args, { timeout: 120000 })

  const prefix = `${baseName}_page_`
  const files = (await readdir(outputDir))
    .filter((file) => file.startsWith(prefix) && file.endsWith(`.${ext}`))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  if (files.length === 0) {
    throw new Error("转换完成但未生成图片文件")
  }

  return files.map((name) => ({ path: join(outputDir, name), name }))
}
