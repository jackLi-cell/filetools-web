"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function WordCounterTool() {
  const [text, setText] = useState("")

  const stats = {
    chars: text.length,
    charsNoSpace: text.replace(/\s/g, "").length,
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    chineseChars: (text.match(/[一-鿿]/g) || []).length,
    lines: text ? text.split("\n").length : 0,
    paragraphs: text.trim() ? text.trim().split(/\n\s*\n/).length : 0,
    sentences: (text.match(/[.!?。！？]+/g) || []).length,
  }

  return (
    <div className="space-y-6">
      <textarea
        className="w-full h-48 p-4 border rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="在此输入或粘贴文本..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "总字符", value: stats.chars },
          { label: "不含空格", value: stats.charsNoSpace },
          { label: "中文字符", value: stats.chineseChars },
          { label: "英文单词", value: stats.words },
          { label: "行数", value: stats.lines },
          { label: "段落", value: stats.paragraphs },
          { label: "句子", value: stats.sentences },
        ].map((item) => (
          <div key={item.label} className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xl font-semibold text-gray-900">{item.value}</p>
            <p className="text-xs text-gray-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {text && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setText("")}>清空</Button>
          <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(text)}>复制文本</Button>
        </div>
      )}
    </div>
  )
}
