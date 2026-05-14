"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { QuickPrompts } from "@/components/ai/quick-prompts"
import { ConversationPanel } from "@/components/ai/conversation-panel"
import {
  FileAttachInput,
  type FileAttachError,
  type FileAttachInputHandle,
} from "@/components/ai/file-attach-input"
import { FileChip } from "@/components/ai/file-chip"
import { ArrowUp, Paperclip, Square } from "lucide-react"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

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
}

interface AttachUploadResponse {
  attachmentId: string
  name: string
  size: number
  mime: string
  charCount?: number
  signedToken?: string
  expiresAt?: number
}

let _localCounter = 0
function nextLocalId(): string {
  _localCounter += 1
  return `att-${Date.now().toString(36)}-${_localCounter}`
}

function describeAttachError(err: FileAttachError): string {
  switch (err.kind) {
    case "too-large":
      return `文件 ${err.file.name} 超过 20MB 上限`
    case "too-many":
      return "最多同时携带 3 个附件"
    case "total-exceeded":
      return "附件总大小已超过 30MB 限制"
    case "mime-rejected":
      return `不支持的文件类型：${err.file.name}`
  }
}

export function AiHero() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<FileAttachInputHandle | null>(null)
  const [attachments, setAttachments] = useState<AttachmentItem[]>([])
  const [attachError, setAttachError] = useState<string | null>(null)
  const attachmentsRef = useRef<AttachmentItem[]>([])

  useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])

  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
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

  const updateAttachment = useCallback((localId: string, patch: Partial<AttachmentItem>) => {
    setAttachments((prev) => prev.map((a) => (a.localId === localId ? { ...a, ...patch } : a)))
  }, [])

  const removeAttachment = useCallback((localId: string) => {
    setAttachments((prev) => prev.filter((a) => a.localId !== localId))
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
          name: payload.name || file.name,
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
      const item: AttachmentItem = {
        localId,
        name: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
        status: "uploading",
      }
      setAttachments((prev) => [...prev, item])
      void uploadFile(file, localId)
    },
    [uploadFile]
  )

  const onAttachError = useCallback((err: FileAttachError) => {
    setAttachError(describeAttachError(err))
  }, [])

  const submit = useCallback(() => {
    if (!input.trim() || isLoading || hasUploadingAttachment) return
    const ready = attachmentsRef.current
      .filter((a) => a.status === "ready" && a.serverId)
      .map((a) => a.serverId as string)
    if (ready.length > 0) {
      handleSubmit(undefined, { body: { attachmentIds: ready } })
    } else {
      handleSubmit()
    }
    // clear attachments after submit kicks off
    setAttachments([])
    setAttachError(null)
  }, [handleSubmit, hasUploadingAttachment, input, isLoading])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        submit()
      }
    },
    [submit]
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
    !input.trim() || isLoading || hasUploadingAttachment || attachments.some((a) => a.status === "error")

  return (
    <div className="w-full">
      <Card
        className={cn(
          "mx-auto max-w-3xl rounded-2xl border border-gray-200/80 bg-white p-3 shadow-lg shadow-blue-500/5 md:p-4",
          "gap-2"
        )}
      >
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            placeholder="告诉我你要做什么... 例如：把这份 PDF 总结成 5 条要点"
            rows={1}
            className={cn(
              "block max-h-[200px] min-h-[56px] w-full resize-none rounded-xl bg-transparent px-3 py-3 text-sm leading-6 text-gray-900 outline-none placeholder:text-gray-400",
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
                title="添加附件（PDF/Word/Excel/图片，单个 ≤20MB，总计 ≤30MB，最多 3 个）"
                className="text-gray-500 hover:text-gray-700"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <span className="hidden text-[11px] text-gray-400 sm:inline">
                ⌘+Enter 发送 · Shift+Enter 换行
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

      <QuickPrompts onSelect={onQuickSelect} disabled={isLoading} />

      {messages.length > 0 ? (
        <ConversationPanel
          messages={messages}
          onClear={onClear}
          onCopyLast={onCopyLast}
          isLoading={isLoading}
          error={error}
        />
      ) : null}
    </div>
  )
}
