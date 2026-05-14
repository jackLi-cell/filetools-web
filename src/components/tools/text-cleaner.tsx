"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function TextCleanerTool() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [copied, setCopied] = useState(false)

  const operations = [
    { label: "去除多余空格", fn: (s: string) => s.replace(/[ \t]+/g, " ").replace(/^ +| +$/gm, "") },
    { label: "去除空行", fn: (s: string) => s.replace(/\n{3,}/g, "\n\n").replace(/^\s*\n/gm, "") },
    { label: "去除全部空白行", fn: (s: string) => s.split("\n").filter(l => l.trim()).join("\n") },
    { label: "全角转半角", fn: (s: string) => s.replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/　/g, " ") },
    { label: "半角转全角", fn: (s: string) => s.replace(/[!-~]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xfee0)).replace(/ /g, "　") },
    { label: "去除 HTML 标签", fn: (s: string) => s.replace(/<[^>]+>/g, "") },
    { label: "去除零宽字符", fn: (s: string) => s.replace(/[​-‍﻿­]/g, "") },
    { label: "统一换行符为 LF", fn: (s: string) => s.replace(/\r\n/g, "\n").replace(/\r/g, "\n") },
    { label: "去除行首行尾空格", fn: (s: string) => s.split("\n").map(l => l.trim()).join("\n") },
    { label: "一键全部清理", fn: (s: string) => {
      let r = s
      r = r.replace(/[​-‍﻿­]/g, "")
      r = r.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
      r = r.replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/　/g, " ")
      r = r.replace(/[ \t]+/g, " ")
      r = r.split("\n").map(l => l.trim()).join("\n")
      r = r.replace(/\n{3,}/g, "\n\n")
      return r
    }},
  ]

  const apply = (fn: (s: string) => string) => {
    setOutput(fn(input))
  }

  const copy = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <textarea
        className="w-full h-40 p-3 border rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="粘贴需要清理的文本（从 Word/PDF/网页复制的文本常有多余空格、乱码和格式问题）..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        {operations.map((op) => (
          <Button key={op.label} variant="outline" size="sm" onClick={() => apply(op.fn)} disabled={!input.trim()}>
            {op.label}
          </Button>
        ))}
      </div>

      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">清理结果</span>
            <Button variant="ghost" size="sm" onClick={copy}>{copied ? "已复制" : "复制"}</Button>
          </div>
          <textarea className="w-full h-40 p-3 bg-gray-50 border rounded-lg text-sm resize-y" value={output} readOnly />
        </div>
      )}
    </div>
  )
}
