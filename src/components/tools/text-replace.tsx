"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function TextReplaceTool() {
  const [input, setInput] = useState("")
  const [search, setSearch] = useState("")
  const [replace, setReplace] = useState("")
  const [useRegex, setUseRegex] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [output, setOutput] = useState("")
  const [diffMode, setDiffMode] = useState(false)
  const [textA, setTextA] = useState("")
  const [textB, setTextB] = useState("")
  const [diffResult, setDiffResult] = useState<{ type: "same" | "add" | "remove"; text: string }[]>([])

  const doReplace = () => {
    if (!search) { setOutput(input); return }
    try {
      const flags = caseSensitive ? "g" : "gi"
      const regex = useRegex ? new RegExp(search, flags) : new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags)
      setOutput(input.replace(regex, replace))
    } catch {
      setOutput("正则表达式语法错误")
    }
  }

  const doDiff = () => {
    const linesA = textA.split("\n")
    const linesB = textB.split("\n")
    const result: { type: "same" | "add" | "remove"; text: string }[] = []
    const maxLen = Math.max(linesA.length, linesB.length)
    for (let i = 0; i < maxLen; i++) {
      const a = linesA[i]
      const b = linesB[i]
      if (a === b) {
        result.push({ type: "same", text: a || "" })
      } else {
        if (a !== undefined) result.push({ type: "remove", text: a })
        if (b !== undefined) result.push({ type: "add", text: b })
      }
    }
    setDiffResult(result)
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button className={`px-3 py-1.5 text-sm rounded-md ${!diffMode ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`} onClick={() => setDiffMode(false)}>批量替换</button>
        <button className={`px-3 py-1.5 text-sm rounded-md ${diffMode ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`} onClick={() => setDiffMode(true)}>差异对比</button>
      </div>

      {!diffMode ? (
        <>
          <textarea
            className="w-full h-32 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入要处理的文本..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">查找</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="要查找的文本或正则" className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">替换为</label>
              <Input value={replace} onChange={(e) => setReplace(e.target.value)} placeholder="替换后的文本" className="text-sm" />
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={useRegex} onChange={(e) => setUseRegex(e.target.checked)} className="rounded" />
              正则模式
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} className="rounded" />
              区分大小写
            </label>
          </div>
          <Button onClick={doReplace} disabled={!input.trim()}>执行替换</Button>
          {output && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">结果</span>
                <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(output)}>复制</Button>
              </div>
              <pre className="p-3 bg-gray-50 border rounded-lg text-sm font-mono whitespace-pre-wrap max-h-48 overflow-auto">{output}</pre>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">文本 A</label>
              <textarea className="w-full h-40 p-2 border rounded-lg text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500" value={textA} onChange={(e) => setTextA(e.target.value)} placeholder="原始文本..." />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">文本 B</label>
              <textarea className="w-full h-40 p-2 border rounded-lg text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500" value={textB} onChange={(e) => setTextB(e.target.value)} placeholder="修改后文本..." />
            </div>
          </div>
          <Button onClick={doDiff} disabled={!textA.trim() && !textB.trim()}>对比差异</Button>
          {diffResult.length > 0 && (
            <div className="p-3 bg-gray-50 border rounded-lg max-h-64 overflow-y-auto text-xs font-mono">
              {diffResult.map((d, i) => (
                <div key={i} className={`px-2 py-0.5 ${d.type === "add" ? "bg-green-100 text-green-800" : d.type === "remove" ? "bg-red-100 text-red-800 line-through" : "text-gray-700"}`}>
                  {d.type === "add" ? "+ " : d.type === "remove" ? "- " : "  "}{d.text}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
