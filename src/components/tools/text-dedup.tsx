"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function TextDedupTool() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [stats, setStats] = useState({ original: 0, unique: 0, removed: 0 })

  const dedup = () => {
    const lines = input.split("\n")
    const seen = new Map<string, number>()
    lines.forEach(line => {
      const trimmed = line.trim()
      if (trimmed) seen.set(trimmed, (seen.get(trimmed) || 0) + 1)
    })
    const unique = Array.from(seen.keys())
    setOutput(unique.join("\n"))
    setStats({ original: lines.filter(l => l.trim()).length, unique: unique.length, removed: lines.filter(l => l.trim()).length - unique.length })
  }

  const sortAndDedup = () => {
    const lines = input.split("\n").map(l => l.trim()).filter(Boolean)
    const unique = [...new Set(lines)].sort()
    setOutput(unique.join("\n"))
    setStats({ original: lines.length, unique: unique.length, removed: lines.length - unique.length })
  }

  return (
    <div className="space-y-6">
      <textarea
        className="w-full h-40 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="输入文本，每行一条（将按行去重）..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="flex gap-2">
        <Button onClick={dedup} disabled={!input.trim()}>去重（保持顺序）</Button>
        <Button onClick={sortAndDedup} disabled={!input.trim()} variant="outline">去重并排序</Button>
      </div>

      {output && (
        <div className="space-y-3">
          <div className="flex gap-4 text-xs text-gray-500">
            <span>原始行数：{stats.original}</span>
            <span>去重后：{stats.unique}</span>
            <span className="text-red-600">移除：{stats.removed}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">结果</span>
            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(output)}>复制</Button>
          </div>
          <textarea className="w-full h-40 p-3 bg-gray-50 border rounded-lg text-sm font-mono resize-y" value={output} readOnly />
        </div>
      )}
    </div>
  )
}
