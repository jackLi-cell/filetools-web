import { createReadStream } from "node:fs"
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { env } from "./env.js"

const storageRoot = path.resolve(env.storage.root)

export function getStorageInfo() {
  return {
    driver: env.storage.driver,
    root: storageRoot,
  }
}

function assertSafeKey(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "")
  if (!normalized || normalized.includes("\0")) {
    throw new Error("Invalid storage key")
  }
  const resolved = path.resolve(storageRoot, normalized)
  const relative = path.relative(storageRoot, resolved)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid storage key")
  }
  return normalized
}

function pathForKey(key: string): string {
  return path.resolve(storageRoot, assertSafeKey(key))
}

export async function ensureStorageRoot(): Promise<void> {
  await mkdir(storageRoot, { recursive: true })
}

export async function writeBufferToStorage(key: string, buffer: Buffer): Promise<number> {
  const filePath = pathForKey(key)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, buffer)
  return buffer.length
}

export async function uploadFileToStorage(filePath: string, key: string): Promise<number> {
  const buffer = await readFile(filePath)
  return writeBufferToStorage(key, buffer)
}

export async function downloadFileFromStorage(key: string, destPath: string): Promise<void> {
  const sourcePath = pathForKey(key)
  await mkdir(path.dirname(destPath), { recursive: true })
  await writeFile(destPath, await readFile(sourcePath))
}

export async function deleteFile(key: string): Promise<void> {
  await rm(pathForKey(key), { force: true })
}

export async function getFileSize(key: string): Promise<number> {
  const info = await stat(pathForKey(key))
  return info.size
}

export function createStorageReadStream(key: string) {
  return createReadStream(pathForKey(key))
}

export async function getUploadUrl(key: string, token: string): Promise<string> {
  assertSafeKey(key)
  return `/api/process/upload-file/${encodeURIComponent(key)}?token=${encodeURIComponent(token)}`
}

export async function getDownloadUrl(key: string): Promise<string> {
  assertSafeKey(key)
  return `/api/process/download-file/${encodeURIComponent(key)}`
}
