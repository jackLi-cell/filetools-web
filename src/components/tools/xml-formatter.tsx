"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function XmlFormatterTool() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [mode, setMode] = useState<"xml" | "yaml">("xml")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const formatXml = (xml: string): string => {
    let formatted = ""
    let indent = 0
    const lines = xml.replace(/>\s*</g, ">\n<").split("\n")
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (trimmed.startsWith("</")) indent--
      formatted += "  ".repeat(Math.max(0, indent)) + trimmed + "\n"
      if (trimmed.startsWith("<") && !trimmed.startsWith("</") && !trimmed.startsWith("<?") && !trimmed.endsWith("/>") && !trimmed.includes("</")) {
        indent++
      }
    }
    return formatted.trim()
  }

  const compressXml = (xml: string): string => {
    return xml.replace(/>\s+</g, "><").replace(/\n\s*/g, "").trim()
  }

  const formatYaml = (yaml: string): string => {
    const lines = yaml.split("\n")
    const result: string[] = []
    for (const line of lines) {
      const trimmed = line.trimEnd()
      if (trimmed) result.push(trimmed)
    }
    return result.join("\n")
  }

  const jsonToYaml = (json: string): string => {
    try {
      const obj = JSON.parse(json)
      return objectToYaml(obj, 0)
    } catch {
      return "转换失败：输入不是有效的 JSON"
    }
  }

  const objectToYaml = (obj: unknown, indent: number): string => {
    const prefix = "  ".repeat(indent)
    if (obj === null) return "null"
    if (typeof obj === "string") return obj.includes("\n") ? `|\n${obj.split("\n").map(l => prefix + "  " + l).join("\n")}` : obj
    if (typeof obj === "number" || typeof obj === "boolean") return String(obj)
    if (Array.isArray(obj)) {
      if (obj.length === 0) return "[]"
      return obj.map(item => `${prefix}- ${objectToYaml(item, indent + 1).trimStart()}`).join("\n")
    }
    if (typeof obj === "object") {
      const entries = Object.entries(obj as Record<string, unknown>)
      if (entries.length === 0) return "{}"
      return entries.map(([key, val]) => {
        const valStr = objectToYaml(val, indent + 1)
        if (typeof val === "object" && val !== null) {
          return `${prefix}${key}:\n${valStr}`
        }
        return `${prefix}${key}: ${valStr}`
      }).join("\n")
    }
    return String(obj)
  }

  const handleFormat = () => {
    setError("")
    if (mode === "xml") {
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(input, "text/xml")
        const parseError = doc.querySelector("parsererror")
        if (parseError) {
          setError("XML 格式错误：" + parseError.textContent?.slice(0, 100))
          setOutput("")
          return
        }
        setOutput(formatXml(input))
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "格式化失败")
      }
    } else {
      setOutput(formatYaml(input))
    }
  }

  const handleCompress = () => {
    setError("")
    if (mode === "xml") {
      setOutput(compressXml(input))
    } else {
      setOutput(input.split("\n").filter(l => l.trim()).join("\n"))
    }
  }

  const handleJsonToYaml = () => {
    setError("")
    setOutput(jsonToYaml(input))
  }

  const copy = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => { setMode("xml"); setOutput(""); setError("") }} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "xml" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>
          XML
        </button>
        <button onClick={() => { setMode("yaml"); setOutput(""); setError("") }} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "yaml" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>
          YAML
        </button>
      </div>

      <textarea
        className="w-full h-48 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={mode === "xml" ? "粘贴 XML 数据..." : "粘贴 YAML 数据或 JSON（可转为 YAML）..."}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleFormat} disabled={!input.trim()}>格式化</Button>
        <Button onClick={handleCompress} disabled={!input.trim()} variant="outline">压缩</Button>
        {mode === "yaml" && <Button onClick={handleJsonToYaml} disabled={!input.trim()} variant="outline">JSON → YAML</Button>}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">❌ {error}</div>}

      {output && !error && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">结果</span>
            <Button variant="ghost" size="sm" onClick={copy}>{copied ? "已复制" : "复制"}</Button>
          </div>
          <pre className="w-full max-h-64 overflow-auto p-3 bg-gray-50 border rounded-lg text-sm font-mono whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  )
}
