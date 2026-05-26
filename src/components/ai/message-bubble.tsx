"use client"

import type { UIMessage } from "@ai-sdk/ui-utils"
import { Markdown } from "@/components/ai/markdown"
import { ToolCallCard } from "@/components/ai/tool-call-card"
import { DownloadFileCard } from "@/components/ai/download-file-card"
import { ProcessTaskCard } from "@/components/ai/process-task-card"
import { cn } from "@/lib/utils"

export interface MessageBubbleProps {
  role: "user" | "assistant"
  message?: UIMessage
  content?: string
  isStreaming?: boolean
}

interface ToolInvocationLike {
  toolName?: unknown
  toolCallId?: unknown
  args?: unknown
  result?: unknown
  state?: unknown
}

interface ToolResultLike {
  kind?: unknown
  slug?: unknown
  toolName?: unknown
  reason?: unknown
  params?: unknown
  message?: unknown
  taskId?: unknown
  creditsCost?: unknown
  fileCount?: unknown
  inputFileName?: unknown
  resultText?: unknown
  attachmentId?: unknown
  signedToken?: unknown
  expiresAt?: unknown
  attachmentName?: unknown
  attachmentMime?: unknown
  status?: unknown
  url?: unknown
  downloadUrl?: unknown
  fileName?: unknown
  files?: unknown
  file?: unknown
  href?: unknown
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : undefined
}

function getFileName(data: string, mimeType?: string): string {
  const mime = (mimeType || "").toLowerCase()
  const ext =
    mime.includes("wordprocessingml.document")
      ? "docx"
      : mime.includes("presentationml.presentation")
        ? "pptx"
        : mime.includes("markdown")
          ? "md"
          : mime.includes("plain")
            ? "txt"
            : mime.includes("html")
              ? "html"
              : mime.includes("json")
                ? "json"
                : mime.includes("csv")
                  ? "csv"
                  : mime.includes("png")
                    ? "png"
                    : mime.includes("jpeg")
                      ? "jpg"
                      : mime.includes("webp")
                        ? "webp"
                        : mimeType?.split("/").pop()?.replace("plain", "txt") || "file"
  return `灵猫生成文件.${ext}`
}

function getFileUrl(data: string, mimeType?: string): string {
  if (data.startsWith("data:")) return data
  return `data:${mimeType || "application/octet-stream"};base64,${data}`
}

function getMessageText(msg: UIMessage | undefined, fallback?: string): string {
  if (!msg) return fallback ?? ""
  if (msg.parts && msg.parts.length > 0) {
    return msg.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("")
  }
  return msg.content ?? fallback ?? ""
}

function getToolResultFiles(result: unknown): Array<{ name: string; url: string; mimeType?: string }> {
  const root = asRecord(result)
  if (!root) return []
  const candidates = Array.isArray(root.files)
    ? root.files
    : Array.isArray(root.file)
      ? root.file
      : root.file
        ? [root.file]
        : root.url || root.downloadUrl
          ? [root]
          : []

  return candidates.flatMap((candidate) => {
    const item = asRecord(candidate)
    if (!item) return []
    const url = asString(item.url) ?? asString(item.downloadUrl) ?? asString(item.href)
    if (!url) return []
    return [
      {
        name:
          asString(item.name) ??
          asString(item.fileName) ??
          asString(item.filename) ??
          "ai-result",
        url,
        mimeType: asString(item.mimeType) ?? asString(item.mime),
      },
    ]
  })
}

function parseToolResult(value: unknown): ToolResultLike | null {
  const root = asRecord(value)
  if (!root) return null
  return root as ToolResultLike
}

function renderAiToolResult(result: ToolResultLike, key: string) {
  const kind = asString(result.kind)
  if (kind === "process_task") {
    return (
      <ProcessTaskCard
        key={key}
        toolSlug={asString(result.slug) ?? asString(result.toolName) ?? "tool"}
        taskId={asString(result.taskId) ?? ""}
        title={asString(result.toolName)}
        description={asString(result.message)}
        creditsCost={asNumber(result.creditsCost)}
        fileCount={asNumber(result.fileCount)}
      />
    )
  }
  if (kind === "inline_result") {
    const text = asString(result.resultText) ?? asString(result.message) ?? ""
    return (
      <div key={key} className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
        <div className="text-sm font-medium text-gray-900">{asString(result.toolName) ?? "工具结果"}</div>
        <Markdown content={text} />
      </div>
    )
  }
  if (kind === "redirect") {
    return (
      <ToolCallCard
        key={key}
        slug={asString(result.slug) ?? ""}
        params={asRecord(result.params) ?? undefined}
        attachmentId={asString(result.attachmentId)}
        signedToken={asString(result.signedToken)}
        expiresAt={asNumber(result.expiresAt)}
        reason={asString(result.reason) ?? asString(result.message)}
      />
    )
  }
  if (kind === "error") {
    const status = asNumber(result.status)
    const message = asString(result.message) ?? "执行失败"
    const isBalanceError =
      status === 402 ||
      /余额不足|积分不足/.test(message)
    if (isBalanceError) {
      return (
        <div key={key} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <div className="font-medium text-amber-900">{asString(result.toolName) ?? "工具"} 需要付费</div>
          <div className="mt-1">{message}</div>
          <div className="mt-1 text-[11px] text-amber-700">请先前往充值后再继续使用该工具。</div>
        </div>
      )
    }
    return (
      <div key={key} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        {asString(result.toolName) ?? "工具"}：{message}
      </div>
    )
  }

  const fileCards = getToolResultFiles(result)
  if (fileCards.length > 0) {
    return (
      <div key={key} className="space-y-2">
        {fileCards.map((file, fileIndex) => (
          <DownloadFileCard
            key={`${file.url}-${fileIndex}`}
            name={file.name}
            url={file.url}
            mimeType={file.mimeType}
          />
        ))}
      </div>
    )
  }

  return (
    <div key={key} className="rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 text-xs text-gray-600">
      工具结果：<code className="font-mono text-gray-800">{asString(result.toolName) ?? "unknown"}</code>
    </div>
  )
}

export function MessageBubble({ role, message, content, isStreaming }: MessageBubbleProps) {
  if (role === "user") {
    const text = getMessageText(message, content)
    const attachments = message?.experimental_attachments
      ?.filter((attachment) => typeof attachment.name === "string" && attachment.name.length > 0)
    return (
      <div className="flex w-full justify-end">
        <div
          className={cn(
            "max-w-[80%] rounded-2xl rounded-tr-md bg-blue-50 px-4 py-2 text-[13px] leading-5 text-gray-900",
            "whitespace-pre-wrap break-words animate-in fade-in slide-in-from-bottom-2 duration-500"
          )}
        >
          {text}
          {attachments && attachments.length > 0 ? (
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              {attachments.map((attachment) => {
                const isImage =
                  typeof attachment.contentType === "string" &&
                  attachment.contentType.startsWith("image/") &&
                  typeof attachment.url === "string" &&
                  (attachment.url.startsWith("blob:") || attachment.url.startsWith("data:"))
                return (
                  <span
                    key={`${attachment.name}-${attachment.url}`}
                    className="inline-flex max-w-[180px] items-center gap-1.5 rounded-full bg-white/85 px-2 py-1 text-[11px] text-gray-600"
                  >
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={attachment.url}
                        alt=""
                        className="h-7 w-7 shrink-0 rounded-md object-cover"
                      />
                    ) : null}
                    <span className="truncate">{attachment.name}</span>
                  </span>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  const parts = message?.parts ?? []
  const hasParts = parts.length > 0
  const fallbackText = !hasParts ? message?.content ?? content ?? "" : ""

  return (
    <div className="flex w-full justify-start">
      <div
        className={cn(
          "max-w-[80%] space-y-2 rounded-2xl rounded-tl-md border border-gray-200 bg-white px-4 py-3 shadow-sm",
          "text-[13px] leading-5",
          "animate-in fade-in slide-in-from-bottom-2 duration-500"
        )}
      >
        {!hasParts && !fallbackText ? (
          <span className="inline-flex items-center gap-1 text-[13px] text-gray-400">
            正在思考
            <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-gray-400" />
            <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-gray-400 [animation-delay:150ms]" />
            <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-gray-400 [animation-delay:300ms]" />
          </span>
        ) : null}

        {!hasParts && fallbackText ? <Markdown content={fallbackText} /> : null}

          {hasParts &&
          parts.map((part, i) => {
            if (part.type === "text") {
              const textPart = part as { type: "text"; text: string }
              if (!textPart.text) return null
              return <Markdown key={`text-${i}`} content={textPart.text} />
            }
            if (part.type === "file") {
              const filePart = part as { type: "file"; data: string; mimeType?: string }
              return (
                <DownloadFileCard
                  key={`file-${i}`}
                  name={getFileName(filePart.data, filePart.mimeType)}
                  url={getFileUrl(filePart.data, filePart.mimeType)}
                  mimeType={filePart.mimeType}
                />
              )
            }
            const partType = (part as { type?: string }).type
            if (partType === "tool-invocation" || partType === "tool_call") {
              const rawPart = part as Record<string, unknown>
              const inv =
                (rawPart.toolInvocation as ToolInvocationLike | undefined) ??
                (rawPart.toolCall as ToolInvocationLike | undefined) ??
                (rawPart as unknown as ToolInvocationLike)
              const toolName = asString(inv.toolName)
              const args = asRecord(inv.args)
              const result = parseToolResult(inv.result)

              if (result) {
                return renderAiToolResult(result, `tool-result-${i}`)
              }

              if (toolName === "open_tool") {
                const slug = asString(args?.slug)
                if (!slug) return null
                const params = asRecord(args?.params)
                const attachmentId =
                  asString(args?.attachmentId) ??
                  asString(asRecord(inv?.result)?.attachmentId)
                const signedToken =
                  asString(asRecord(inv?.result)?.signedToken) ??
                  asString(args?.signedToken)
                const expiresAt =
                  asNumber(asRecord(inv?.result)?.expiresAt) ??
                  asNumber(args?.expiresAt)
                const reason =
                  asString(asRecord(inv?.result)?.reason) ??
                  asString(args?.reason)
                return (
                  <ToolCallCard
                    key={`tool-${i}`}
                    slug={slug}
                    params={params}
                    attachmentId={attachmentId}
                    signedToken={signedToken}
                    expiresAt={expiresAt}
                    reason={reason}
                  />
                )
              }

              if (toolName === "execute_tool") {
                return (
                  <div key={`tool-exec-${i}`} className="rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 text-xs text-gray-600">
                    工具正在执行：<code className="font-mono text-gray-800">{toolName}</code>
                  </div>
                )
              }

              const fileCards = getToolResultFiles(inv?.result)
              if (fileCards.length > 0) {
                return (
                  <div key={`tool-files-${i}`} className="space-y-2">
                    {fileCards.map((file, fileIndex) => (
                      <DownloadFileCard
                        key={`${file.url}-${fileIndex}`}
                        name={file.name}
                        url={file.url}
                        mimeType={file.mimeType}
                      />
                    ))}
                  </div>
                )
              }

              return (
                <div
                  key={`tool-${i}`}
                  className="rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 text-xs text-gray-600"
                >
                  调用工具 <code className="font-mono text-gray-800">{toolName || "unknown"}</code>
                </div>
              )
            }
            return null
          })}

        {isStreaming ? (
          <span
            className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-gray-500 align-middle"
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  )
}
