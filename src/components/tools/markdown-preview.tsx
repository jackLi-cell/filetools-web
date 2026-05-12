"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function MarkdownPreviewTool() {
  const [md, setMd] = useState(`# 标题示例

这是一段 **Markdown** 文本预览。

## 功能特性

- 支持标题、列表、粗体、斜体
- 支持代码块和行内代码
- 支持链接和图片
- 实时预览

\`\`\`javascript
const hello = "world";
console.log(hello);
\`\`\`

> 引用文本示例

| 表头1 | 表头2 |
|-------|-------|
| 内容1 | 内容2 |
`)

  const renderMarkdown = (text: string): string => {
    let html = text
      .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mt-5 mb-2">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-6 mb-3">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-gray-100 rounded text-sm font-mono">$1</code>')
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-gray-300 pl-4 text-gray-600 my-2">$1</blockquote>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
      .replace(/\n\n/g, '</p><p class="my-2">')
      .replace(/```[\s\S]*?```/g, (match) => {
        const code = match.replace(/```\w*\n?/, '').replace(/```$/, '')
        return `<pre class="p-3 bg-gray-900 text-green-400 rounded-lg text-sm font-mono overflow-x-auto my-3"><code>${code}</code></pre>`
      })
    return `<div class="prose prose-sm max-w-none"><p class="my-2">${html}</p></div>`
  }

  const exportHtml = () => {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Markdown Export</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:2rem;line-height:1.6}h1{font-size:1.5rem}h2{font-size:1.25rem}h3{font-size:1.1rem}code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:0.9em}pre{background:#1f2937;color:#86efac;padding:1rem;border-radius:8px;overflow-x:auto}pre code{background:none;padding:0}blockquote{border-left:4px solid #d1d5db;padding-left:1rem;color:#6b7280}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left}th{background:#f9fafb}</style>
</head><body>${renderMarkdown(md)}</body></html>`
    const blob = new Blob([html], { type: "text/html" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "markdown_export.html"
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[400px]">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Markdown 编辑</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setMd("")}>清空</Button>
          </div>
          <textarea
            className="flex-1 p-3 border rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={md}
            onChange={(e) => setMd(e.target.value)}
            placeholder="输入 Markdown 内容..."
          />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">预览</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={exportHtml}>导出 HTML</Button>
          </div>
          <div
            className="flex-1 p-4 border rounded-lg overflow-auto bg-white text-sm"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }}
          />
        </div>
      </div>
    </div>
  )
}
