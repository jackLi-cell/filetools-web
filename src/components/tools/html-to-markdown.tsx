"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function HtmlToMarkdownTool() {
  const [html, setHtml] = useState("")
  const [markdown, setMarkdown] = useState("")
  const [copied, setCopied] = useState(false)

  const convert = async () => {
    if (!html.trim()) return
    const TurndownService = (await import("turndown")).default
    const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" })
    setMarkdown(td.turndown(html))
  }

  const copy = async () => {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm text-gray-700 mb-2 block">HTML 源码</label>
        <textarea
          className="w-full h-48 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="粘贴 HTML 内容..."
          value={html}
          onChange={(e) => setHtml(e.target.value)}
        />
      </div>
      <Button onClick={convert} disabled={!html.trim()}>转换为 Markdown</Button>
      {markdown && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Markdown 结果</span>
            <Button variant="ghost" size="sm" onClick={copy}>{copied ? "已复制" : "复制"}</Button>
          </div>
          <pre className="w-full p-3 bg-gray-50 border rounded-lg text-sm font-mono whitespace-pre-wrap max-h-96 overflow-auto">{markdown}</pre>
        </div>
      )}
    </div>
  )
}
