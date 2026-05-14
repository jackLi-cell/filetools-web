"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function TextDedupTool() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [stats, setStats] = useState({ original: 0, unique: 0, removed: 0 })
  const [separator, setSeparator] = useState("")
  const [columnIndex, setColumnIndex] = useState(0)
  const [showReport, setShowReport] = useState(false)
  const [report, setReport] = useState<{ line: string; count: number }[]>([])

  const dedup = () => {
    const lines = getLines()
    const seen = new Map<string, number>()
    lines.forEach(line => {
      if (line) seen.set(line, (seen.get(line) || 0) + 1)
    })
    const unique = Array.from(seen.keys())
    setOutput(unique.join("\n"))
    setStats({ original: lines.filter(Boolean).length, unique: unique.length, removed: lines.filter(Boolean).length - unique.length })
    setReport(Array.from(seen.entries()).filter(([, c]) => c > 1).map(([line, count]) => ({ line, count })).sort((a, b) => b.count - a.count))
  }

  const sortAndDedup = () => {
    const lines = getLines().filter(Boolean)
    const unique = [...new Set(lines)].sort()
    setOutput(unique.join("\n"))
    setStats({ original: lines.length, unique: unique.length, removed: lines.length - unique.length })
  }

  const [fuzzyThreshold, setFuzzyThreshold] = useState(3)

  const editDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length
    if (b.length === 0) return a.length
    const matrix: number[][] = []
    for (let i = 0; i <= a.length; i++) { matrix[i] = [i] }
    for (let j = 0; j <= b.length; j++) { matrix[0][j] = j }
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost)
      }
    }
    return matrix[a.length][b.length]
  }

  const fuzzyDedup = () => {
    const lines = getLines().filter(Boolean)
    const kept: string[] = []
    const removedItems: { line: string; similarTo: string }[] = []
    for (const line of lines) {
      const similar = kept.find(k => editDistance(k.toLowerCase(), line.toLowerCase()) <= fuzzyThreshold)
      if (similar) {
        removedItems.push({ line, similarTo: similar })
      } else {
        kept.push(line)
      }
    }
    setOutput(kept.join("\n"))
    setStats({ original: lines.length, unique: kept.length, removed: removedItems.length })
    setReport(removedItems.map(r => ({ line: `${r.line} ≈ ${r.similarTo}`, count: 1 })))
  }

  const getLines = (): string[] => {
    const lines = input.split("\n").map(l => l.trim())
    if (separator && columnIndex >= 0) {
      return lines.map(l => {
        const parts = l.split(separator)
        return parts[columnIndex]?.trim() || ""
      })
    }
    return lines
  }

  const exportReport = () => {
    if (report.length === 0) return
    const csv = ["重复内容,出现次数", ...report.map(r => `"${r.line.replace(/"/g, '""')}",${r.count}`)].join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "dedup_report.csv"
    a.click()
  }

  return (
    <div className="space-y-6">
      <textarea
        className="w-full h-40 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="输入文本，每行一条（将按行去重）..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      {/* 列提取选项 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">分隔符：</label>
          <Input
            value={separator}
            onChange={(e) => setSeparator(e.target.value)}
            placeholder="留空=整行"
            className="w-24 h-7 text-xs"
          />
        </div>
        {separator && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">取第几列（从0开始）：</label>
            <Input
              type="number"
              value={columnIndex}
              onChange={(e) => setColumnIndex(Number(e.target.value))}
              min={0}
              className="w-16 h-7 text-xs"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <Button onClick={dedup} disabled={!input.trim()}>去重（保持顺序）</Button>
        <Button onClick={sortAndDedup} disabled={!input.trim()} variant="outline">去重并排序</Button>
        <Button onClick={fuzzyDedup} disabled={!input.trim()} variant="outline">模糊去重</Button>
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-600">阈值:</label>
          <Input type="number" value={fuzzyThreshold} onChange={(e) => setFuzzyThreshold(Number(e.target.value))} min={1} max={20} className="w-14 h-7 text-xs" />
        </div>
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
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(output)}>复制</Button>
              {report.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setShowReport(!showReport)}>
                  {showReport ? "隐藏报告" : "查看重复报告"}
                </Button>
              )}
            </div>
          </div>
          <textarea className="w-full h-40 p-3 bg-gray-50 border rounded-lg text-sm font-mono resize-y" value={output} readOnly />

          {/* 重复报告 */}
          {showReport && report.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600">重复项报告（{report.length} 项有重复）</p>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={exportReport}>导出 CSV</Button>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-1.5 font-medium text-gray-600">内容</th>
                      <th className="text-right px-3 py-1.5 font-medium text-gray-600 w-20">次数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5 font-mono truncate max-w-[300px]">{r.line}</td>
                        <td className="px-3 py-1.5 text-right text-red-600 font-medium">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}