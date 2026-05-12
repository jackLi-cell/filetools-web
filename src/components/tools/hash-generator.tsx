"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function HashGeneratorTool() {
  const [input, setInput] = useState("")
  const [results, setResults] = useState<Record<string, string>>({})
  const [mode, setMode] = useState<"text" | "file">("text")
  const [fileName, setFileName] = useState("")

  const computeHash = async (data: ArrayBuffer) => {
    const algorithms = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"]
    const hashes: Record<string, string> = {}
    for (const algo of algorithms) {
      const hash = await crypto.subtle.digest(algo, data)
      hashes[algo] = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("")
    }
    setResults(hashes)
  }

  const hashText = async () => {
    if (!input) return
    const data = new TextEncoder().encode(input)
    await computeHash(data.buffer)
  }

  const hashFile = async (file: File) => {
    setFileName(file.name)
    const buffer = await file.arrayBuffer()
    await computeHash(buffer)
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => { setMode("text"); setResults({}) }}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "text" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          文本哈希
        </button>
        <button
          onClick={() => { setMode("file"); setResults({}) }}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "file" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          文件哈希
        </button>
      </div>

      {mode === "text" ? (
        <div className="space-y-3">
          <textarea
            className="w-full h-32 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入要计算哈希的文本..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button onClick={hashText} disabled={!input} className="w-full">计算哈希</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-gray-300"
            onClick={() => document.getElementById("hash-file")?.click()}
          >
            <input id="hash-file" type="file" className="hidden" onChange={(e) => e.target.files?.[0] && hashFile(e.target.files[0])} />
            {fileName ? (
              <p className="text-sm text-gray-700">{fileName}</p>
            ) : (
              <>
                <div className="text-3xl mb-2">📎</div>
                <p className="text-sm text-gray-600">点击选择文件计算哈希值</p>
              </>
            )}
          </div>
        </div>
      )}

      {Object.keys(results).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">哈希结果</h3>
          {Object.entries(results).map(([algo, hash]) => (
            <div key={algo} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">{algo}</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigator.clipboard.writeText(hash)}>复制</Button>
              </div>
              <p className="text-xs font-mono text-gray-800 break-all">{hash}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
