"use client"

import { useState, useMemo } from "react"
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

  const readingTime = useMemo(() => {
    const cnChars = (text.match(/[一-鿿]/g) || []).length
    const enWords = text.replace(/[一-鿿]/g, "").trim().split(/\s+/).filter(Boolean).length
    const minutes = cnChars / 300 + enWords / 200
    if (minutes < 1) return "不到 1 分钟"
    return `约 ${Math.ceil(minutes)} 分钟`
  }, [text])

  const keywords = useMemo(() => {
    if (!text.trim()) return []
    const words: Record<string, number> = {}
    const cnMatches = text.match(/[一-鿿]{2,}/g) || []
    cnMatches.forEach(w => { words[w] = (words[w] || 0) + 1 })
    const enMatches = text.toLowerCase().match(/[a-z]{3,}/g) || []
    enMatches.forEach(w => { words[w] = (words[w] || 0) + 1 })
    return Object.entries(words)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({
        word,
        count,
        density: ((count / Math.max(stats.charsNoSpace, 1)) * 100).toFixed(1),
      }))
  }, [text, stats.charsNoSpace])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      if (content) setText(content)
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <textarea
          className="w-full h-48 p-4 border rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="在此输入或粘贴文本，或拖入 .txt / .md 文件..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <label className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-100 rounded cursor-pointer hover:bg-gray-200">
          上传文件
          <input type="file" accept=".txt,.md,.csv,.log" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "总字符", value: stats.chars },
          { label: "不含空格", value: stats.charsNoSpace },
          { label: "中文字符", value: stats.chineseChars },
          { label: "英文单词", value: stats.words },
          { label: "行数", value: stats.lines },
          { label: "段落", value: stats.paragraphs },
          { label: "句子", value: stats.sentences },
          { label: "阅读时间", value: text ? readingTime : "-" },
        ].map((item) => (
          <div key={item.label} className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xl font-semibold text-gray-900">{typeof item.value === "number" ? item.value : item.value}</p>
            <p className="text-xs text-gray-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* 关键词密度 */}
      {keywords.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">关键词密度 (Top 10)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {keywords.map((k) => (
              <div key={k.word} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                <span className="font-medium text-gray-800">{k.word}</span>
                <span className="text-gray-500">{k.count} 次 ({k.density}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {text && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setText("")}>清空</Button>
          <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(text)}>复制文本</Button>
        </div>
      )}
    </div>
  )
}
