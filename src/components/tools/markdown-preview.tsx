"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { marked } from "marked"

type Theme = "github" | "dark" | "minimal" | "wechat"

const themeStyles: Record<Theme, string> = {
  github: `body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;max-width:800px;margin:0 auto;padding:2rem;line-height:1.6;color:#24292f}h1{font-size:2em;border-bottom:1px solid #d0d7de;padding-bottom:.3em}h2{font-size:1.5em;border-bottom:1px solid #d0d7de;padding-bottom:.3em}h3{font-size:1.25em}code{background:#f6f8fa;padding:2px 6px;border-radius:6px;font-size:85%}pre{background:#f6f8fa;padding:16px;border-radius:6px;overflow-x:auto;line-height:1.45}pre code{background:none;padding:0}blockquote{border-left:4px solid #d0d7de;padding:0 1em;color:#656d76;margin:0}table{border-collapse:collapse;width:100%}th,td{border:1px solid #d0d7de;padding:6px 13px}th{background:#f6f8fa;font-weight:600}img{max-width:100%}a{color:#0969da}`,
  dark: `body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:2rem;line-height:1.6;color:#e6edf3;background:#0d1117}h1,h2,h3{color:#f0f6fc}h1{border-bottom:1px solid #30363d}h2{border-bottom:1px solid #30363d}code{background:#161b22;padding:2px 6px;border-radius:6px;font-size:85%;color:#79c0ff}pre{background:#161b22;padding:16px;border-radius:6px;overflow-x:auto}pre code{background:none;padding:0}blockquote{border-left:4px solid #30363d;padding:0 1em;color:#8b949e}table{border-collapse:collapse;width:100%}th,td{border:1px solid #30363d;padding:6px 13px}th{background:#161b22}a{color:#58a6ff}`,
  minimal: `body{font-family:Georgia,"Times New Roman",serif;max-width:680px;margin:0 auto;padding:3rem 2rem;line-height:1.8;color:#333}h1{font-size:1.8em;margin-top:2em}h2{font-size:1.4em;margin-top:1.5em}h3{font-size:1.2em}code{background:#f5f5f5;padding:2px 4px;border-radius:3px;font-family:Menlo,monospace;font-size:0.9em}pre{background:#f5f5f5;padding:1.2em;border-radius:4px;overflow-x:auto}pre code{background:none;padding:0}blockquote{border-left:3px solid #ccc;padding-left:1em;color:#666;font-style:italic}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #ddd;padding:8px 12px;text-align:left}`,
  wechat: `body{font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;max-width:680px;margin:0 auto;padding:1.5rem;line-height:1.75;color:#3f3f3f;font-size:15px}h1{font-size:1.6em;text-align:center;margin:1.5em 0 1em}h2{font-size:1.3em;border-left:4px solid #07c160;padding-left:10px;margin:1.5em 0 0.8em}h3{font-size:1.1em}code{background:#fff5f5;color:#ff502c;padding:2px 6px;border-radius:3px;font-size:90%}pre{background:#f8f8f8;padding:1em;border-radius:4px;overflow-x:auto;font-size:13px}pre code{background:none;color:inherit;padding:0}blockquote{background:#f8f8f8;border-left:4px solid #07c160;padding:10px 15px;color:#666;margin:1em 0}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e8e8e8;padding:8px 12px}th{background:#f8f8f8}img{max-width:100%;border-radius:4px}`,
}

const previewThemeClass: Record<Theme, string> = {
  github: "bg-white text-gray-900",
  dark: "bg-[#0d1117] text-[#e6edf3]",
  minimal: "bg-white text-gray-800",
  wechat: "bg-white text-gray-700",
}

export function MarkdownPreviewTool() {
  const [md, setMd] = useState(`# 标题示例

这是一段 **Markdown** 文本预览，支持完整语法渲染。

## 功能特性

- [x] 支持标题、列表、粗体、斜体
- [x] 支持代码块和行内代码
- [ ] 支持任务列表
- 支持链接和图片

\`\`\`javascript
const hello = "world";
console.log(hello);
\`\`\`

> 引用文本示例

| 表头1 | 表头2 | 表头3 |
|-------|:-----:|------:|
| 左对齐 | 居中 | 右对齐 |
| 内容1 | 内容2 | 内容3 |

---

脚注示例[^1]，以及~~删除线~~文本。

[^1]: 这是脚注内容。
`)
  const [theme, setTheme] = useState<Theme>("github")

  const renderedHtml = useMemo(() => {
    try {
      return marked.parse(md, { gfm: true, breaks: true }) as string
    } catch {
      return "<p>渲染出错</p>"
    }
  }, [md])

  const tocItems = useMemo(() => {
    const headings: { level: number; text: string; id: string }[] = []
    const lines = md.split("\n")
    for (const line of lines) {
      const match = line.match(/^(#{1,3})\s+(.+)$/)
      if (match) {
        const level = match[1].length
        const text = match[2].replace(/[*_`~\[\]]/g, "")
        const id = text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w一-鿿-]/g, "")
        headings.push({ level, text, id })
      }
    }
    return headings
  }, [md])

  const exportHtml = () => {
    const style = themeStyles[theme]
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Markdown Export</title>
<style>${style}</style>
</head><body>${renderedHtml}</body></html>`
    const blob = new Blob([html], { type: "text/html" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "markdown_export.html"
    a.click()
  }

  const exportMd = () => {
    const blob = new Blob([md], { type: "text/markdown" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "document.md"
    a.click()
  }

  const exportPdf = () => {
    const style = themeStyles[theme]
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Markdown PDF</title><style>${style}@media print{body{margin:0;padding:1cm}}</style></head><body>${renderedHtml}</body></html>`
    const printWindow = window.open("", "_blank")
    if (!printWindow) return
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => { printWindow.print() }
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {([["github", "GitHub"], ["dark", "暗色"], ["minimal", "简约"], ["wechat", "公众号"]] as const).map(([val, label]) => (
            <button
              key={val}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                theme === val ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => setTheme(val)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={exportMd}>导出 .md</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={exportHtml}>导出 HTML</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={exportPdf}>导出 PDF</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setMd("")}>清空</Button>
        </div>
      </div>

      {/* 主体：编辑器 + TOC + 预览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[500px]">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-600 mb-2">Markdown 编辑</span>
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
            {tocItems.length > 0 && (
              <span className="text-xs text-gray-400">{tocItems.length} 个标题</span>
            )}
          </div>
          {/* TOC */}
          {tocItems.length > 2 && (
            <div className="mb-2 p-2 bg-gray-50 rounded border text-xs max-h-32 overflow-y-auto">
              <p className="font-medium text-gray-600 mb-1">目录</p>
              {tocItems.map((item, i) => (
                <div key={i} style={{ paddingLeft: `${(item.level - 1) * 12}px` }} className="text-gray-600 py-0.5 truncate">
                  {item.text}
                </div>
              ))}
            </div>
          )}
          {/* 渲染预览 */}
          <div
            className={`flex-1 p-4 border rounded-lg overflow-auto text-sm prose prose-sm max-w-none ${previewThemeClass[theme]}`}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>
      </div>
    </div>
  )
}
