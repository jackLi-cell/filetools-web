"use client"

import { forwardRef, useImperativeHandle, useRef } from "react"

const ALLOWED_MIMES = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/x-markdown",
  "application/pdf",
  "application/json",
  "application/xml",
  "application/yaml",
  "application/x-yaml",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
])

const ALLOWED_EXTENSIONS = /\.(png|jpe?g|webp|gif|txt|md|markdown|csv|tsv|pdf|json|xml|yml|yaml|log|html|htm|js|ts|jsx|tsx|py|java|c|cpp|h|css|scss|less|sql|sh|conf|ini|toml|docx?|xlsx?|pptx?)$/i

const SINGLE_FILE_MAX = 20 * 1024 * 1024
const TOTAL_MAX = 30 * 1024 * 1024
const MAX_FILES = 5

export const FILE_ATTACH_LIMITS = {
  singleFileMax: SINGLE_FILE_MAX,
  totalMax: TOTAL_MAX,
  maxFiles: MAX_FILES,
} as const

export type FileAttachError =
  | { kind: "too-large"; file: File }
  | { kind: "total-exceeded"; current: number; incoming: number }
  | { kind: "too-many"; existing: number }
  | { kind: "mime-rejected"; file: File }

export function validateAttachFiles(
  files: File[],
  existingCount: number,
  existingTotalBytes: number
): { accepted: File[]; errors: FileAttachError[] } {
  const accepted: File[] = []
  const errors: FileAttachError[] = []
  let count = existingCount
  let total = existingTotalBytes

  for (const file of files) {
    if (count >= MAX_FILES) {
      errors.push({ kind: "too-many", existing: count })
      break
    }
    if (!isAcceptedFile(file)) {
      errors.push({ kind: "mime-rejected", file })
      continue
    }
    if (file.size > SINGLE_FILE_MAX) {
      errors.push({ kind: "too-large", file })
      continue
    }
    if (total + file.size > TOTAL_MAX) {
      errors.push({ kind: "total-exceeded", current: total, incoming: file.size })
      continue
    }
    accepted.push(file)
    count += 1
    total += file.size
  }

  return { accepted, errors }
}

export interface FileAttachInputHandle {
  pick: () => void
}

export interface FileAttachInputProps {
  /** Number of files already attached (used for total/count check). */
  existingCount: number
  /** Total bytes already attached. */
  existingTotalBytes: number
  /** Called for each accepted file. */
  onAccept: (file: File) => void
  /** Called per rejected file or batch-level rejection. */
  onError: (err: FileAttachError) => void
  /** Whether to disable the input. */
  disabled?: boolean
}

function isAcceptedFile(file: File): boolean {
  const mime = file.type
  if (ALLOWED_EXTENSIONS.test(file.name)) return true
  if (!mime) return ALLOWED_EXTENSIONS.test(file.name)
  if (mime.startsWith("text/")) return true
  return ALLOWED_MIMES.has(mime)
}

export const FileAttachInput = forwardRef<FileAttachInputHandle, FileAttachInputProps>(
  function FileAttachInput({ existingCount, existingTotalBytes, onAccept, onError, disabled }, ref) {
    const inputRef = useRef<HTMLInputElement | null>(null)

    useImperativeHandle(
      ref,
      () => ({
        pick: () => {
          if (disabled) return
          inputRef.current?.click()
        },
      }),
      [disabled]
    )

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const fl = e.target.files
      if (!fl || fl.length === 0) return
      const { accepted, errors } = validateAttachFiles(Array.from(fl), existingCount, existingTotalBytes)
      errors.forEach(onError)
      accepted.forEach(onAccept)

      // reset so same file can be picked again
      e.target.value = ""
    }

    return (
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onChange}
        disabled={disabled}
        accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.markdown,.csv,.tsv,.pdf,.json,.xml,.yml,.yaml,.log,.html,.htm,.js,.ts,.jsx,.tsx,.py,.java,.c,.cpp,.h,.css,.scss,.less,.sql,.sh,.conf,.ini,.toml,.doc,.docx,.xls,.xlsx,.ppt,.pptx,text/*,application/pdf,application/json,application/xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
      />
    )
  }
)
