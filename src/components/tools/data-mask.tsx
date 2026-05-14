"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ToolDisclaimer } from "@/components/tool-disclaimer"

export function DataMaskTool() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [copied, setCopied] = useState(false)

  const mask = () => {
    let result = input
    result = result.replace(/1[3-9]\d{9}/g, (m) => m.slice(0, 3) + "****" + m.slice(7))
    result = result.replace(/[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g, (m) => m.slice(0, 6) + "********" + m.slice(14))
    result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (m) => {
      const [local, domain] = m.split("@")
      return local.slice(0, 2) + "***@" + domain
    })
    result = result.replace(/\d{16,19}/g, (m) => m.slice(0, 4) + " **** **** " + m.slice(-4))
    setOutput(result)
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
        placeholder={"粘贴包含敏感信息的文本，如：\n张三的手机号是13800138000\n身份证号：110101199001011234\n邮箱：zhangsan@example.com"}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <div className="text-xs text-gray-500 space-y-1">
        <p>自动识别并脱敏以下类型：</p>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-0.5 bg-gray-100 rounded">手机号</span>
          <span className="px-2 py-0.5 bg-gray-100 rounded">身份证号</span>
          <span className="px-2 py-0.5 bg-gray-100 rounded">邮箱地址</span>
          <span className="px-2 py-0.5 bg-gray-100 rounded">银行卡号</span>
        </div>
      </div>

      <Button onClick={mask} disabled={!input.trim()} className="w-full">一键脱敏</Button>

      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">脱敏结果</span>
            <Button variant="ghost" size="sm" onClick={copy}>{copied ? "已复制" : "复制"}</Button>
          </div>
          <pre className="p-3 bg-gray-50 border rounded-lg text-sm whitespace-pre-wrap">{output}</pre>
        </div>
      )}

      <ToolDisclaimer type="privacy" />
    </div>
  )
}
