import { Request, Response, NextFunction } from "express"

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp", "image/svg+xml",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv", "text/markdown",
  "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
  "audio/mpeg", "audio/wav", "audio/ogg", "audio/flac", "audio/aac",
])

const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".sh", ".ps1", ".msi", ".dll", ".so",
  ".com", ".vbs", ".js", ".wsh", ".wsf", ".scr", ".pif",
])

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg",
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".csv", ".md", ".markdown",
  ".mp4", ".webm", ".mov", ".avi",
  ".mp3", ".wav", ".ogg", ".flac", ".aac",
])

export function validateFileParams(fileName: string, mimeType: string, fileSize: number, maxSizeMb: number): string | null {
  const ext = "." + (fileName.split(".").pop()?.toLowerCase() || "")
  if (BLOCKED_EXTENSIONS.has(ext)) return "不支持的文件类型"
  if (!ALLOWED_MIME_TYPES.has(mimeType) && !(mimeType === "application/octet-stream" && ALLOWED_EXTENSIONS.has(ext))) {
    return `不支持的文件格式：${mimeType}`
  }
  if (fileSize > maxSizeMb * 1024 * 1024) return `文件大小超过限制（最大 ${maxSizeMb}MB）`
  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) return "文件名包含非法字符"
  return null
}
