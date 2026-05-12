"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function CaseConverterTool() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [copied, setCopied] = useState(false)

  const conversions = [
    { label: "全部大写", fn: (s: string) => s.toUpperCase() },
    { label: "全部小写", fn: (s: string) => s.toLowerCase() },
    { label: "首字母大写", fn: (s: string) => s.replace(/\b\w/g, c => c.toUpperCase()) },
    { label: "句首大写", fn: (s: string) => s.replace(/(^|[.!?]\s+)\w/g, c => c.toUpperCase()) },
    { label: "驼峰命名", fn: (s: string) => s.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : "").replace(/^./, c => c.toLowerCase()) },
    { label: "帕斯卡命名", fn: (s: string) => s.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : "").replace(/^./, c => c.toUpperCase()) },
    { label: "下划线命名", fn: (s: string) => s.replace(/([A-Z])/g, "_$1").replace(/[-\s]+/g, "_").toLowerCase().replace(/^_/, "") },
    { label: "短横线命名", fn: (s: string) => s.replace(/([A-Z])/g, "-$1").replace(/[_\s]+/g, "-").toLowerCase().replace(/^-/, "") },
  ]

  const apply = (fn: (s: string) => string) => {
    setOutput(fn(input))
  }

  const copy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <textarea
        className="w-full h-32 p-3 border rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="输入要转换的文本..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        {conversions.map((c) => (
          <Button key={c.label} variant="outline" size="sm" onClick={() => apply(c.fn)} disabled={!input}>
            {c.label}
          </Button>
        ))}
      </div>

      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">结果</span>
            <Button variant="ghost" size="sm" onClick={copy}>{copied ? "已复制" : "复制"}</Button>
          </div>
          <pre className="p-3 bg-gray-50 border rounded-lg text-sm whitespace-pre-wrap break-all">{output}</pre>
        </div>
      )}
    </div>
  )
}
