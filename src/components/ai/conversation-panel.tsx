"use client"

import { useEffect, useRef } from "react"
import type { UIMessage } from "@ai-sdk/ui-utils"
import { Button } from "@/components/ui/button"
import { MessageBubble } from "@/components/ai/message-bubble"
import { Copy, RotateCcw } from "lucide-react"

export interface ConversationPanelProps {
  messages: UIMessage[]
  onClear: () => void
  onCopyLast: () => void
  isLoading: boolean
  error?: Error
}

function getMessageText(msg: UIMessage): string {
  if (msg.parts && msg.parts.length > 0) {
    return msg.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("")
  }
  return msg.content ?? ""
}

function LoadingDots() {
  return (
    <div className="flex w-full justify-start pb-4">
      <div
        className="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-500 shadow-sm"
        aria-label="AI 正在回复"
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 [animation-delay:300ms]" />
      </div>
    </div>
  )
}

export function ConversationPanel({
  messages,
  onClear,
  onCopyLast,
  isLoading,
  error,
}: ConversationPanelProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [messages, isLoading])

  if (messages.length === 0) return null

  const lastMessage = messages[messages.length - 1]
  const lastIsAssistant = lastMessage?.role === "assistant"
  const showPendingBubble = isLoading && lastMessage?.role === "user"

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
      <div className="mb-2 flex shrink-0 items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCopyLast}
          disabled={!lastIsAssistant || !getMessageText(lastMessage).trim()}
          aria-label="复制最后回复"
        >
          <Copy className="h-3.5 w-3.5" />
          <span className="ml-1">复制最后回复</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={isLoading}
          aria-label="新对话"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="ml-1">新对话</span>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-gray-200/80 bg-gray-50/50 p-3 md:p-4">
        <div className="flex min-h-full flex-col gap-3 pb-6">
          {messages.map((msg, idx) => {
            const isLast = idx === messages.length - 1
            const isStreaming =
              isLoading && isLast && msg.role === "assistant"
            if (msg.role !== "user" && msg.role !== "assistant") return null
            return (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                message={msg}
                isStreaming={isStreaming}
              />
            )
          })}
          {showPendingBubble ? <LoadingDots /> : null}
          {error ? (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
              role="alert"
            >
              出错了：{error.message || "请稍后重试"}
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
