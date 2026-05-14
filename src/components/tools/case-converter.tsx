"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

function splitWords(s: string): string[] {
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

export function CaseConverterTool() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [copied, setCopied] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [cnConverting, setCnConverting] = useState(false)

  const conversions = [
    { label: "全部大写", fn: (s: string) => s.toUpperCase() },
    { label: "全部小写", fn: (s: string) => s.toLowerCase() },
    { label: "首字母大写", fn: (s: string) => s.replace(/\b\w/g, c => c.toUpperCase()) },
    { label: "句首大写", fn: (s: string) => s.replace(/(^|[.!?]\s+)\w/g, c => c.toUpperCase()) },
    { label: "camelCase", fn: (s: string) => { const w = splitWords(s); return w.map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("") } },
    { label: "PascalCase", fn: (s: string) => splitWords(s).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("") },
    { label: "snake_case", fn: (s: string) => splitWords(s).map(w => w.toLowerCase()).join("_") },
    { label: "kebab-case", fn: (s: string) => splitWords(s).map(w => w.toLowerCase()).join("-") },
    { label: "SCREAMING_SNAKE", fn: (s: string) => splitWords(s).map(w => w.toUpperCase()).join("_") },
    { label: "dot.case", fn: (s: string) => splitWords(s).map(w => w.toLowerCase()).join(".") },
    { label: "path/case", fn: (s: string) => splitWords(s).map(w => w.toLowerCase()).join("/") },
  ]

  const apply = (fn: (s: string) => string) => {
    if (batchMode) {
      const lines = input.split("\n").map(l => l.trim()).filter(Boolean)
      setOutput(lines.map(fn).join("\n"))
    } else {
      setOutput(fn(input))
    }
  }

  const convertChinese = async (direction: "s2t" | "t2s") => {
    if (!input.trim()) return
    setCnConverting(true)
    try {
      const OpenCC = await import("opencc-js")
      const converter = OpenCC.Converter({ from: direction === "s2t" ? "cn" : "tw", to: direction === "s2t" ? "tw" : "cn" })
      const text = batchMode ? input : input
      setOutput(converter(text))
    } catch {
      setOutput("转换失败，请检查输入")
    }
    setCnConverting(false)
  }

  const copy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={batchMode} onChange={(e) => setBatchMode(e.target.checked)} className="rounded" />
          批量模式（每行一个变量名）
        </label>
      </div>

      <textarea
        className="w-full h-32 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={batchMode ? "每行一个变量名，如：\nmy-variable-name\nanotherVariable\nsome_snake_case" : "输入要转换的文本或变量名..."}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {conversions.map((c) => (
            <Button key={c.label} variant="outline" size="sm" onClick={() => apply(c.fn)} disabled={!input}>
              {c.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => convertChinese("s2t")} disabled={!input || cnConverting}>
            简体 → 繁体
          </Button>
          <Button variant="outline" size="sm" onClick={() => convertChinese("t2s")} disabled={!input || cnConverting}>
            繁体 → 简体
          </Button>
        </div>
      </div>

      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">结果</span>
            <Button variant="ghost" size="sm" onClick={copy}>{copied ? "已复制" : "复制"}</Button>
          </div>
          <pre className="p-3 bg-gray-50 border rounded-lg text-sm font-mono whitespace-pre-wrap break-all">{output}</pre>
        </div>
      )}
    </div>
  )
}
