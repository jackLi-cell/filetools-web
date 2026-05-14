"use client"

import type { UIMessage } from "@ai-sdk/ui-utils"
import { Markdown } from "@/components/ai/markdown"
import { ToolCallCard } from "@/components/ai/tool-call-card"
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

export function MessageBubble({ role, message, content, isStreaming }: MessageBubbleProps) {
  if (role === "user") {
    const text = getMessageText(message, content)
    return (
      <div className="flex w-full justify-end">
        <div
          className={cn(
            "max-w-[80%] rounded-2xl rounded-tr-md bg-blue-50 px-4 py-2 text-sm text-gray-900",
            "whitespace-pre-wrap break-words"
          )}
        >
          {text}
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
          "max-w-[80%] space-y-2 rounded-2xl rounded-tl-md border border-gray-200 bg-white px-4 py-3 shadow-sm"
        )}
      >
        {!hasParts && !fallbackText ? (
          <span className="inline-flex items-center gap-1 text-sm text-gray-400">
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
