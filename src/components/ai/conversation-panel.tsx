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

  return (
    <div className="mx-auto mt-6 w-full max-w-3xl">
      <div className="mb-3 flex items-center justify-end gap-2">
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

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-gray-50/50 p-3 md:p-4">
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
        {error ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            出错了：{error.message || "请稍后重试"}
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
