"use client"

import { Button } from "@/components/ui/button"

export interface QuickPromptsProps {
  onSelect: (text: string) => void
  disabled?: boolean
}

const PROMPTS: string[] = [
  "把这份 PDF 总结成 5 条要点",
  "压缩这张图片到 200KB",
  "Word 文档怎么转 PDF",
  "JSON 校验和格式化",
  "提取 PDF 里的所有图片",
]

export function QuickPrompts({ onSelect, disabled }: QuickPromptsProps) {
  return (
    <div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center justify-center gap-2">
      {PROMPTS.map((prompt) => (
        <Button
          key={prompt}
          variant="outline"
          size="sm"
          onClick={() => onSelect(prompt)}
          disabled={disabled}
          className="rounded-full text-xs text-gray-700"
        >
          {prompt}
        </Button>
      ))}
    </div>
  )
}
