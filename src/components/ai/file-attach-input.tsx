"use client"

import { forwardRef, useImperativeHandle, useRef } from "react"

const ALLOWED_MIMES = new Set<string>([
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/x-markdown",
  "application/pdf",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
])

const SINGLE_FILE_MAX = 20 * 1024 * 1024
const TOTAL_MAX = 30 * 1024 * 1024
const MAX_FILES = 3

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

function isAcceptedMime(mime: string): boolean {
  if (!mime) return true // some browsers don't set mime, allow and let backend decide
  if (mime.startsWith("text/")) return true
  if (mime.startsWith("image/")) return true
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
      const files = Array.from(fl)
      let count = existingCount
      let total = existingTotalBytes

      for (const f of files) {
        if (count >= MAX_FILES) {
          onError({ kind: "too-many", existing: count })
          break
        }
        if (!isAcceptedMime(f.type)) {
          onError({ kind: "mime-rejected", file: f })
          continue
        }
        if (f.size > SINGLE_FILE_MAX) {
          onError({ kind: "too-large", file: f })
          continue
        }
        if (total + f.size > TOTAL_MAX) {
          onError({ kind: "total-exceeded", current: total, incoming: f.size })
          continue
        }
        onAccept(f)
        count += 1
        total += f.size
      }

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
        accept="text/*,image/*,application/pdf,application/json,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
      />
    )
  }
)
