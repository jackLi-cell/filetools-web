"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function RegexTesterTool() {
  const [pattern, setPattern] = useState("")
  const [flags, setFlags] = useState("g")
  const [testStr, setTestStr] = useState("")
  const [error, setError] = useState("")

  const getMatches = () => {
    if (!pattern || !testStr) return []
    try {
      const regex = new RegExp(pattern, flags)
      setError("")
      const matches: { match: string; index: number; groups: string[] }[] = []
      let m
      if (flags.includes("g")) {
        while ((m = regex.exec(testStr)) !== null) {
          matches.push({ match: m[0], index: m.index, groups: m.slice(1) })
          if (!m[0]) break
        }
      } else {
        m = regex.exec(testStr)
        if (m) matches.push({ match: m[0], index: m.index, groups: m.slice(1) })
      }
      return matches
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "正则表达式语法错误")
      return []
    }
  }

  const matches = getMatches()

  const getHighlightedText = () => {
    if (!pattern || !testStr || error) return testStr
    try {
      const regex = new RegExp(pattern, flags.includes("g") ? flags : flags + "g")
      const parts: { text: string; highlighted: boolean }[] = []
      let lastIndex = 0
      let m
      while ((m = regex.exec(testStr)) !== null) {
        if (m.index > lastIndex) parts.push({ text: testStr.slice(lastIndex, m.index), highlighted: false })
        parts.push({ text: m[0], highlighted: true })
        lastIndex = m.index + m[0].length
        if (!m[0]) break
      }
      if (lastIndex < testStr.length) parts.push({ text: testStr.slice(lastIndex), highlighted: false })
      return parts
    } catch {
      return testStr
    }
  }

  const highlighted = getHighlightedText()

  const flagOptions = [
    { value: "g", label: "全局 (g)" },
    { value: "i", label: "忽略大小写 (i)" },
    { value: "m", label: "多行 (m)" },
    { value: "s", label: "单行 (s)" },
  ]

  const toggleFlag = (f: string) => {
    setFlags(prev => prev.includes(f) ? prev.replace(f, "") : prev + f)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">正则表达式</label>
          <div className="flex items-center gap-1 border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
            <span className="text-gray-400 font-mono">/</span>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="flex-1 text-sm font-mono outline-none"
              placeholder="输入正则表达式"
            />
            <span className="text-gray-400 font-mono">/{flags}</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {flagOptions.map(f => (
            <button
              key={f.value}
              onClick={() => toggleFlag(f.value)}
              className={`px-3 py-1 rounded text-xs font-medium ${flags.includes(f.value) ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-600 mb-1 block">测试文本</label>
        <textarea
          className="w-full h-32 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="输入要测试的文本..."
          value={testStr}
          onChange={(e) => setTestStr(e.target.value)}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">❌ {error}</p>
        </div>
      )}

      {!error && pattern && testStr && (
        <>
          <div>
            <p className="text-xs text-gray-600 mb-2">匹配高亮（共 {matches.length} 个匹配）</p>
            <div className="p-3 bg-gray-50 border rounded-lg text-sm font-mono whitespace-pre-wrap break-all">
              {Array.isArray(highlighted) ? highlighted.map((part, i) => (
                part.highlighted
                  ? <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part.text}</mark>
                  : <span key={i}>{part.text}</span>
              )) : <span>{highlighted}</span>}
            </div>
          </div>

          {matches.length > 0 && (
            <div>
              <p className="text-xs text-gray-600 mb-2">匹配详情</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {matches.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs p-2 bg-gray-50 rounded">
                    <span className="text-gray-400 w-6">#{i + 1}</span>
                    <code className="text-blue-700 font-medium">{m.match}</code>
                    <span className="text-gray-400">位置 {m.index}</span>
                    {m.groups.length > 0 && <span className="text-green-600">分组: [{m.groups.join(", ")}]</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
