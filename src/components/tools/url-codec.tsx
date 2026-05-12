"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function UrlCodecTool() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")

  const encode = () => setOutput(encodeURIComponent(input))
  const decode = () => {
    try { setOutput(decodeURIComponent(input)) }
    catch { setOutput("解码失败：输入不是有效的编码字符串") }
  }
  const encodeAll = () => setOutput(encodeURI(input))
  const decodeAll = () => {
    try { setOutput(decodeURI(input)) }
    catch { setOutput("解码失败：输入不是有效的编码字符串") }
  }

  return (
    <div className="space-y-6">
      <textarea
        className="w-full h-32 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="输入要编码或解码的文本/URL..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={encode} disabled={!input}>encodeURIComponent</Button>
        <Button onClick={decode} disabled={!input} variant="outline">decodeURIComponent</Button>
        <Button onClick={encodeAll} disabled={!input} variant="outline">encodeURI</Button>
        <Button onClick={decodeAll} disabled={!input} variant="outline">decodeURI</Button>
      </div>
      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">结果</span>
            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(output)}>复制</Button>
          </div>
          <pre className="p-3 bg-gray-50 border rounded-lg text-sm font-mono whitespace-pre-wrap break-all">{output}</pre>
        </div>
      )}
    </div>
  )
}
