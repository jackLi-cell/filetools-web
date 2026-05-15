"use client"

import { Download, FileArchive, FileCode, FileImage, FileSpreadsheet, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DownloadFileCardProps {
  name: string
  url: string
  mimeType?: string
}

function getFileIcon(name: string, mimeType?: string) {
  const lower = name.toLowerCase()
  const mime = (mimeType || "").toLowerCase()
  if (mime.includes("image") || /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(lower)) return FileImage
  if (mime.includes("spreadsheet") || /\.(csv|xlsx?|tsv)$/i.test(lower)) return FileSpreadsheet
  if (mime.includes("zip") || /\.(zip|rar|7z|tar|gz)$/i.test(lower)) return FileArchive
  if (mime.includes("json") || /\.(json|xml|yaml|yml|html|css|js|ts|md)$/i.test(lower)) return FileCode
  return FileText
}

function getTypeLabel(name: string, mimeType?: string) {
  const ext = name.split(".").pop()
  if (ext && ext !== name) return ext.toUpperCase()
  if (mimeType) return mimeType.split("/").pop()?.toUpperCase() || "FILE"
  return "FILE"
}

export function DownloadFileCard({ name, url, mimeType }: DownloadFileCardProps) {
  const Icon = getFileIcon(name, mimeType)

  return (
    <a
      href={url}
      download={name}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-sm",
        "transition-colors hover:border-blue-200 hover:bg-blue-50/60"
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm group-hover:text-blue-700">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-gray-900">{name}</span>
        <span className="text-xs text-gray-500">{getTypeLabel(name, mimeType)}</span>
      </span>
      <span
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700",
          "transition-colors group-hover:border-blue-200 group-hover:text-blue-700"
        )}
        aria-label={`下载 ${name}`}
      >
        <Download className="h-4 w-4" />
      </span>
    </a>
  )
}
