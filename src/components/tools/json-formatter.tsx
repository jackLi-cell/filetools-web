"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function JsonFormatterTool() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const format = () => {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed, null, 2))
      setError("")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "JSON 格式错误")
      setOutput("")
    }
  }

  const compress = () => {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed))
      setError("")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "JSON 格式错误")
      setOutput("")
    }
  }

  const validate = () => {
    try {
      JSON.parse(input)
      setError("")
      setOutput("✅ JSON 格式正确")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "JSON 格式错误")
      setOutput("")
    }
  }

  const copyOutput = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="format">
        <TabsList className="mb-4">
          <TabsTrigger value="format">格式化</TabsTrigger>
          <TabsTrigger value="compress">压缩</TabsTrigger>
          <TabsTrigger value="validate">校验</TabsTrigger>
        </TabsList>

        <TabsContent value="format" className="space-y-4">
          <textarea
            className="w-full h-48 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="粘贴 JSON 数据..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button onClick={format} disabled={!input.trim()}>格式化</Button>
        </TabsContent>

        <TabsContent value="compress" className="space-y-4">
          <textarea
            className="w-full h-48 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="粘贴 JSON 数据..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button onClick={compress} disabled={!input.trim()}>压缩</Button>
        </TabsContent>

        <TabsContent value="validate" className="space-y-4">
          <textarea
            className="w-full h-48 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="粘贴 JSON 数据..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button onClick={validate} disabled={!input.trim()}>校验</Button>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">❌ {error}</p>
        </div>
      )}

      {output && !error && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">结果</span>
            <Button variant="ghost" size="sm" onClick={copyOutput}>
              {copied ? "已复制" : "复制"}
            </Button>
          </div>
          <pre className="w-full max-h-64 overflow-auto p-3 bg-gray-50 border rounded-lg text-sm font-mono whitespace-pre-wrap break-all">
            {output}
          </pre>
        </div>
      )}
    </div>
  )
}
