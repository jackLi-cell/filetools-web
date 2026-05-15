"use client"

import type { UIMessage } from "@ai-sdk/ui-utils"
import { Markdown } from "@/components/ai/markdown"
import { ToolCallCard } from "@/components/ai/tool-call-card"
import { DownloadFileCard } from "@/components/ai/download-file-card"
import { cn } from "@/lib/utils"

export interface MessageBubbleProps {
  role: "user" | "assistant"
  message?: UIMessage
  /** Plain text fallback when only `content` is available. */
  content?: string
  isStreaming?: boolean
}

interface OpenToolArgs {
  slug?: unknown
  params?: Record<string, unknown>
  attachmentId?: unknown
  signedToken?: unknown
  expiresAt?: unknown
  reason?: unknown
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined
}

function getFileName(data: string, mimeType?: string): string {
  const mime = (mimeType || "").toLowerCase()
  const ext =
    mime.includes("wordprocessingml.document")
      ? "docx"
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

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : undefined
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

export function MessageBubble({ role, message, content, isStreaming }: MessageBubbleProps) {
  if (role === "user") {
    const text = getMessageText(message, content)
    const attachmentNames = message?.experimental_attachments
      ?.map((attachment) => attachment.name)
      .filter((name): name is string => typeof name === "string" && name.length > 0)
    return (
      <div className="flex w-full justify-end">
        <div
          className={cn(
            "max-w-[80%] rounded-2xl rounded-tr-md bg-blue-50 px-4 py-2 text-[13px] leading-5 text-gray-900",
            "whitespace-pre-wrap break-words animate-in fade-in slide-in-from-bottom-2 duration-500"
          )}
        >
          {text}
          {attachmentNames && attachmentNames.length > 0 ? (
            <div className="mt-2 flex flex-wrap justify-end gap-1.5">
              {attachmentNames.map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-gray-600"
                >
                  {name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  // assistant: render parts in order, mixing markdown text and tool-call cards
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
            if (part.type === "tool-invocation") {
              const inv = (part as {
                type: "tool-invocation"
                toolInvocation: {
                  toolName: string
                  args?: unknown
                  result?: unknown
                  state?: string
                }
              }).toolInvocation
              if (inv.toolName === "open_tool") {
                const args = (inv.args ?? {}) as OpenToolArgs
                const result = (inv.result ?? {}) as OpenToolArgs & {
                  signedToken?: unknown
                  expiresAt?: unknown
                }
                const slug = asString(args.slug) ?? asString(result.slug)
                if (!slug) return null
                const params =
                  (result.params && typeof result.params === "object"
                    ? (result.params as Record<string, unknown>)
                    : undefined) ??
                  (args.params && typeof args.params === "object"
                    ? (args.params as Record<string, unknown>)
                    : undefined)
                // signedToken / expiresAt 必须从 result 取（execute 注入），args 里没有
                const signedToken =
                  asString(result.signedToken) ?? asString(args.signedToken)
                const expiresAt =
                  asNumber(result.expiresAt) ?? asNumber(args.expiresAt)
                const attachmentId =
                  asString(result.attachmentId) ?? asString(args.attachmentId)
                const reason =
                  asString(result.reason) ?? asString(args.reason)
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
              const fileCards = getToolResultFiles(inv.result)
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
              // other tools: render minimal note
              return (
                <div
                  key={`tool-${i}`}
                  className="rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 text-xs text-gray-600"
                >
                  调用工具 <code className="font-mono text-gray-800">{inv.toolName}</code>
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
