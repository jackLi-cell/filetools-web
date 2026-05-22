"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { QuickPrompts } from "@/components/ai/quick-prompts"
import { ConversationPanel } from "@/components/ai/conversation-panel"
import {
  FileAttachInput,
  FILE_ATTACH_LIMITS,
  type FileAttachError,
  type FileAttachInputHandle,
  validateAttachFiles,
} from "@/components/ai/file-attach-input"
import { FileChip } from "@/components/ai/file-chip"
import { ArrowUp, Paperclip, Square } from "lucide-react"
import { cn } from "@/lib/utils"
import { getApiBaseUrl } from "@/lib/api-base"

const API_URL = getApiBaseUrl()

interface AttachmentItem {
  /** local id for tracking before upload completes */
  localId: string
  /** server-assigned id once uploaded */
  serverId?: string
  name: string
  size: number
  mime: string
  status: "uploading" | "ready" | "error"
  errorMessage?: string
  previewUrl?: string
}

interface AttachUploadResponse {
  attachmentId: string
  name: string
  size: number
  mime: string
  charCount?: number
  signedToken?: string
  expiresAt?: number
  meta?: {
    width?: number
    height?: number
    format?: string
  } | null
}

let _localCounter = 0
function nextLocalId(): string {
  _localCounter += 1
  return `att-${Date.now().toString(36)}-${_localCounter}`
}

function normalizeDisplayFileName(name: string): string {
  if (!/[ÃÂ¤åæçèéä»�ï¿½]/.test(name)) return name
  try {
    const bytes = Uint8Array.from(Array.from(name).map((ch) => ch.charCodeAt(0) & 0xff))
    const decoded = new TextDecoder("utf-8").decode(bytes)
    return decoded && !decoded.includes("\uFFFD") ? decoded : name
  } catch {
    return name
  }
}

function describeAttachError(err: FileAttachError): string {
  switch (err.kind) {
    case "too-large":
      return `文件 ${err.file.name} 超过 20MB 上限`
    case "too-many":
      return `最多同时携带 ${FILE_ATTACH_LIMITS.maxFiles} 个附件`
    case "total-exceeded":
      return "附件总大小已超过 30MB 限制"
    case "mime-rejected":
      return `暂不支持 ${err.file.name}。AI 附件支持图片、文本、PDF、DOCX、XLSX、CSV/JSON 等文件`
  }
}

export function AiHero() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<FileAttachInputHandle | null>(null)
  const [attachments, setAttachments] = useState<AttachmentItem[]>([])
  const [attachError, setAttachError] = useState<string | null>(null)
  const attachmentsRef = useRef<AttachmentItem[]>([])
  const previewUrlsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])

  useEffect(() => {
    const previewUrls = previewUrlsRef.current
    return () => {
      for (const url of previewUrls) {
        URL.revokeObjectURL(url)
      }
      previewUrls.clear()
    }
  }, [])

  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    append,
    setMessages,
    stop,
    status,
    error,
  } = useChat({
    api: `${API_URL}/api/ai/chat`,
    credentials: "include",
  })

  const isLoading = status === "submitted" || status === "streaming"

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const next = Math.min(el.scrollHeight, 200)
    el.style.height = `${next}px`
  }, [input])

  const totalBytes = attachments.reduce((acc, a) => acc + a.size, 0)
  const hasUploadingAttachment = attachments.some((a) => a.status === "uploading")
  const hasReadyAttachment = attachments.some((a) => a.status === "ready" && a.serverId)
  const hasConversation = messages.length > 0

  useEffect(() => {
    if (!hasConversation || typeof document === "undefined") return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [hasConversation])

  const updateAttachment = useCallback((localId: string, patch: Partial<AttachmentItem>) => {
    setAttachments((prev) => prev.map((a) => (a.localId === localId ? { ...a, ...patch } : a)))
  }, [])

  const removeAttachment = useCallback((localId: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.localId === localId)
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
        previewUrlsRef.current.delete(target.previewUrl)
      }
      return prev.filter((a) => a.localId !== localId)
    })
  }, [])

  const uploadFile = useCallback(
    async (file: File, localId: string) => {
      try {
        const fd = new FormData()
        fd.append("file", file)
        const res = await fetch(`${API_URL}/api/ai/attach`, {
          method: "POST",
          credentials: "include",
          body: fd,
        })
        if (!res.ok) {
          let message = `上传失败 (${res.status})`
          try {
            const j = (await res.json()) as { message?: string }
            if (j?.message) message = j.message
          } catch {
            // ignore parse errors
          }
          throw new Error(message)
        }
        const json = (await res.json()) as
          | AttachUploadResponse
          | { code: number; data?: AttachUploadResponse; message?: string }
        const payload =
          "data" in json && json.data
            ? json.data
            : ("attachmentId" in json ? (json as AttachUploadResponse) : null)
        if (!payload || !payload.attachmentId) {
          throw new Error(("message" in json && json.message) || "上传响应异常")
        }
        updateAttachment(localId, {
          status: "ready",
          serverId: payload.attachmentId,
          name: normalizeDisplayFileName(payload.name || file.name),
          size: payload.size ?? file.size,
          mime: payload.mime || file.type,
        })
      } catch (e) {
        updateAttachment(localId, {
          status: "error",
          errorMessage: e instanceof Error ? e.message : "上传失败",
        })
      }
    },
    [updateAttachment]
  )

  const onPickFile = useCallback(() => {
    setAttachError(null)
    fileInputRef.current?.pick()
  }, [])

  const onAcceptFile = useCallback(
    (file: File) => {
      const localId = nextLocalId()
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined
      if (previewUrl) previewUrlsRef.current.add(previewUrl)
      const item: AttachmentItem = {
        localId,
        name: normalizeDisplayFileName(file.name),
        size: file.size,
        mime: file.type || "application/octet-stream",
        status: "uploading",
        previewUrl,
      }
      setAttachments((prev) => [...prev, item])
      void uploadFile(file, localId)
    },
    [uploadFile]
  )

  const acceptFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return
      setAttachError(null)
      const current = attachmentsRef.current
      const existingCount = current.length
      const existingTotalBytes = current.reduce((sum, item) => sum + item.size, 0)
      const { accepted, errors } = validateAttachFiles(files, existingCount, existingTotalBytes)
      errors.forEach((err) => setAttachError(describeAttachError(err)))
      accepted.forEach(onAcceptFile)
    },
    [onAcceptFile]
  )

  const onAttachError = useCallback((err: FileAttachError) => {
    setAttachError(describeAttachError(err))
  }, [])

  const submit = useCallback(() => {
    if ((!input.trim() && !hasReadyAttachment) || isLoading || hasUploadingAttachment) return
    const readyItems = attachmentsRef.current.filter((a) => a.status === "ready" && a.serverId)
    const ready = readyItems.map((a) => a.serverId as string)
    const experimentalAttachments = readyItems.map((a) => ({
      name: a.name,
      contentType: a.mime,
      url: a.previewUrl ?? `attachment://${a.serverId}`,
    }))
    if (ready.length > 0) {
      const text = input.trim() || "请根据附件内容帮我处理。"
      void append(
        {
          role: "user",
          content: text,
          experimental_attachments: experimentalAttachments,
        },
        { body: { attachmentIds: ready } }
      )
      setInput("")
    } else {
      handleSubmit()
    }
    // clear attachments after submit kicks off
    setAttachments([])
    setAttachError(null)
  }, [append, handleSubmit, hasReadyAttachment, hasUploadingAttachment, input, isLoading, setInput])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.nativeEvent.isComposing) return
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        submit()
      }
    },
    [submit]
  )

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const files = Array.from(e.clipboardData.files || [])
      if (files.length === 0) return
      e.preventDefault()
      acceptFiles(files)
    },
    [acceptFiles]
  )

  const onQuickSelect = useCallback(
    (text: string) => {
      setInput(text)
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
      })
    },
    [setInput]
  )

  const onClear = useCallback(() => {
    setMessages([])
    setInput("")
    for (const url of previewUrlsRef.current) {
      URL.revokeObjectURL(url)
    }
    previewUrlsRef.current.clear()
    setAttachments([])
    setAttachError(null)
  }, [setMessages, setInput])

  const onCopyLast = useCallback(async () => {
    const last = messages[messages.length - 1]
    if (!last || last.role !== "assistant") return
    const text =
      last.parts && last.parts.length > 0
        ? last.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("")
        : last.content ?? ""
    if (!text) return
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text)
      }
    } catch {
      // ignore clipboard errors (e.g. permissions)
    }
  }, [messages])

  const sendDisabled =
    (!input.trim() && !hasReadyAttachment) ||
    isLoading ||
    hasUploadingAttachment ||
    attachments.some((a) => a.status === "error")

  const composer = (
    <>
      <Card
        className={cn(
          "mx-auto w-full max-w-3xl rounded-2xl border border-gray-200/80 bg-white p-3 shadow-lg shadow-blue-500/5 md:p-4",
          "gap-2 transition-[box-shadow,transform] duration-500 ease-out",
          hasConversation ? "shadow-xl shadow-blue-500/10" : ""
        )}
      >
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder="告诉我你要做什么... 例如：把这份 PDF 总结成 5 条要点"
            rows={1}
            className={cn(
              "block max-h-[180px] min-h-[52px] w-full resize-none rounded-xl bg-transparent px-3 py-3 text-[13px] leading-5 text-gray-900 outline-none placeholder:text-gray-400",
              "overflow-y-auto"
            )}
          />

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1 py-1">
              {attachments.map((a) => (
                <FileChip
                  key={a.localId}
                  name={a.name}
                  size={a.size}
                  mime={a.mime}
                  status={a.status}
                  errorMessage={a.errorMessage}
                  previewUrl={a.previewUrl}
                  onRemove={() => removeAttachment(a.localId)}
                />
              ))}
            </div>
          )}

          <FileAttachInput
            ref={fileInputRef}
            existingCount={attachments.length}
            existingTotalBytes={totalBytes}
            onAccept={onAcceptFile}
            onError={onAttachError}
          />

          {attachError && (
            <p className="px-1 pb-1 text-[11px] text-red-600" role="alert">
              {attachError}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onPickFile}
                aria-label="添加附件"
                title={`添加附件（图片/文本/PDF/DOCX/XLSX/CSV/JSON，单个 ≤20MB，总计 ≤30MB，最多 ${FILE_ATTACH_LIMITS.maxFiles} 个）`}
                className="text-gray-500 hover:text-gray-700"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <span className="hidden text-[11px] text-gray-400 sm:inline">
                Enter 发送 · Shift+Enter 换行 · 可粘贴文件或图片
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isLoading ? (
                <Button
                  type="button"
                  variant="default"
                  size="icon-sm"
                  onClick={stop}
                  aria-label="停止生成"
                  className="rounded-full"
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="default"
                  size="icon-sm"
                  onClick={submit}
                  disabled={sendDisabled}
                  aria-label="发送"
                  className="rounded-full"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <p className="mt-2 text-center text-[11px] text-gray-400">
        文件仅用于本次处理，30 分钟后自动从服务器内存中清除
      </p>
    </>
  )

  return (
    <div
      className={cn(
        "w-full transition-all duration-700 ease-out",
        hasConversation
          ? "ai-chat-active mx-auto flex h-full max-w-4xl flex-col overflow-hidden pt-3 md:pt-4"
          : ""
      )}
    >
      {!hasConversation ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {composer}
          <QuickPrompts onSelect={onQuickSelect} disabled={isLoading} />
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <ConversationPanel
              messages={messages}
              onClear={onClear}
              onCopyLast={onCopyLast}
              isLoading={isLoading}
              error={error}
            />
          </div>
          <div className="shrink-0 pb-3 pt-3 animate-in fade-in slide-in-from-bottom-4 duration-700 md:pb-4">
            {composer}
          </div>
        </>
      )}
    </div>
  )
}
