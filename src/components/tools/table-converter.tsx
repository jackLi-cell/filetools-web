"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function TableConverterTool() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [outputFormat, setOutputFormat] = useState<"markdown" | "html" | "csv">("markdown")
  const [delimiter, setDelimiter] = useState("\t")
  const [copied, setCopied] = useState(false)

  const convert = () => {
    const lines = input.split("\n").filter(l => l.trim())
    if (lines.length === 0) { setOutput(""); return }

    const rows = lines.map(line => line.split(delimiter === "\\t" ? "\t" : delimiter).map(cell => cell.trim()))
    const maxCols = Math.max(...rows.map(r => r.length))
    const normalized = rows.map(r => [...r, ...Array(maxCols - r.length).fill("")])

    if (outputFormat === "markdown") {
      const header = `| ${normalized[0].join(" | ")} |`
      const separator = `| ${normalized[0].map(() => "---").join(" | ")} |`
      const body = normalized.slice(1).map(r => `| ${r.join(" | ")} |`).join("\n")
      setOutput([header, separator, body].join("\n"))
    } else if (outputFormat === "html") {
      const thead = `<thead><tr>${normalized[0].map(c => `<th>${c}</th>`).join("")}</tr></thead>`
      const tbody = `<tbody>${normalized.slice(1).map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>`
      setOutput(`<table>\n  ${thead}\n  ${tbody}\n</table>`)
    } else {
      setOutput(normalized.map(r => r.map(c => c.includes(",") ? `"${c}"` : c).join(",")).join("\n"))
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm text-gray-700 mb-2 block">粘贴表格数据（从 Excel/Google Sheets 复制，或手动输入）</label>
        <textarea
          className="w-full h-40 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={"姓名\t年龄\t城市\n张三\t28\t北京\n李四\t32\t上海"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">分隔符：</label>
          <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)} className="h-8 px-2 border rounded text-xs bg-white">
            <option value="\t">Tab（从 Excel 粘贴）</option>
            <option value=",">逗号</option>
            <option value="|">竖线</option>
            <option value=" ">空格</option>
          </select>
        </div>
        <div className="flex gap-1">
          {([["markdown", "Markdown"], ["html", "HTML"], ["csv", "CSV"]] as const).map(([val, label]) => (
            <button key={val} className={`px-3 py-1.5 text-xs rounded ${outputFormat === val ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`} onClick={() => setOutputFormat(val)}>
              {label}
            </button>
          ))}
        </div>
        <Button onClick={convert} disabled={!input.trim()} size="sm">转换</Button>
      </div>

      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">结果</span>
            <Button variant="ghost" size="sm" onClick={copy}>{copied ? "已复制" : "复制"}</Button>
          </div>
          <pre className="p-3 bg-gray-50 border rounded-lg text-xs font-mono whitespace-pre-wrap max-h-64 overflow-auto">{output}</pre>
        </div>
      )}
    </div>
  )
}
