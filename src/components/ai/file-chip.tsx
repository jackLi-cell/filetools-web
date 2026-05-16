"use client"

import {
  File,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
  Presentation,
  X,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type FileChipStatus = "uploading" | "ready" | "error"

export interface FileChipProps {
  name: string
  size: number
  mime: string
  status: FileChipStatus
  errorMessage?: string
  previewUrl?: string
  onRemove: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function iconFor(mime: string, name: string): LucideIcon {
  const lower = (mime || "").toLowerCase()
  const ext = name.toLowerCase().split(".").pop() ?? ""
  if (lower.startsWith("image/")) return FileImage
  if (lower === "application/pdf" || ext === "pdf") return FileText
  if (lower === "application/json" || ext === "json") return FileJson
  if (lower.includes("word") || ext === "docx" || ext === "doc") return FileText
  if (
    lower.includes("excel") ||
    lower.includes("spreadsheetml") ||
    ext === "xlsx" ||
    ext === "xls" ||
    ext === "csv" ||
    lower === "text/csv"
  )
    return FileSpreadsheet
  if (
    lower.includes("powerpoint") ||
    lower.includes("presentationml") ||
    ext === "pptx" ||
    ext === "ppt"
  )
    return Presentation
  if (lower.startsWith("text/") || ext === "txt" || ext === "md") return FileText
  return File
}

export function FileChip({ name, size, mime, status, errorMessage, previewUrl, onRemove }: FileChipProps) {
  const Icon = iconFor(mime, name)
  const isImage = mime.toLowerCase().startsWith("image/") && previewUrl
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-lg border bg-white px-2 py-1 text-xs shadow-sm",
        status === "error"
          ? "border-red-300 bg-red-50/40"
          : status === "uploading"
            ? "border-blue-200"
            : "border-gray-200"
      )}
      title={errorMessage ?? `${name} · ${formatSize(size)}`}
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded-md border border-gray-200 object-cover"
        />
      ) : (
        <Icon className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
      )}
      <span className="flex min-w-0 flex-col">
        <span className="truncate max-w-[180px] font-medium text-gray-800">{name}</span>
        <span className="text-[10px] text-gray-500">
          {formatSize(size)}
          {status === "error" && errorMessage ? ` · ${errorMessage}` : null}
        </span>
      </span>
      {status === "uploading" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" aria-hidden="true" />
      ) : (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`移除附件 ${name}`}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
