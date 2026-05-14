"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function HashGeneratorTool() {
  const [input, setInput] = useState("")
  const [results, setResults] = useState<Record<string, string>>({})
  const [mode, setMode] = useState<"text" | "file" | "verify" | "compare" | "batch">("text")
  const [fileName, setFileName] = useState("")
  const [verifyHash, setVerifyHash] = useState("")
  const [verifyResult, setVerifyResult] = useState<"match" | "mismatch" | "">("")
  const [compareResult, setCompareResult] = useState<"match" | "mismatch" | "">("")
  const [compareNames, setCompareNames] = useState<[string, string]>(["", ""])
  const [batchResults, setBatchResults] = useState<{ name: string; hash: string }[]>([])

  const computeHash = async (data: ArrayBuffer) => {
    const algorithms = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"]
    const hashes: Record<string, string> = {}
    for (const algo of algorithms) {
      const hash = await crypto.subtle.digest(algo, data)
      hashes[algo] = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("")
    }
    setResults(hashes)
    return hashes
  }

  const hashText = async () => {
    if (!input) return
    const data = new TextEncoder().encode(input)
    await computeHash(data.buffer)
  }

  const hashFile = async (file: File) => {
    setFileName(file.name)
    const buffer = await file.arrayBuffer()
    const hashes = await computeHash(buffer)
    if (mode === "verify" && verifyHash.trim()) {
      checkVerify(hashes, verifyHash.trim())
    }
  }

  const checkVerify = (hashes: Record<string, string>, expected: string) => {
    const normalized = expected.toLowerCase().replace(/\s/g, "")
    const match = Object.values(hashes).some(h => h === normalized)
    setVerifyResult(match ? "match" : "mismatch")
  }

  const handleVerifyFile = async (file: File) => {
    setFileName(file.name)
    const buffer = await file.arrayBuffer()
    const hashes = await computeHash(buffer)
    if (verifyHash.trim()) {
      checkVerify(hashes, verifyHash.trim())
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {([["text", "文本哈希"], ["file", "文件哈希"], ["verify", "校验验证"], ["compare", "文件对比"], ["batch", "批量哈希"]] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => { setMode(val); setResults({}); setVerifyResult(""); setCompareResult(""); setBatchResults([]) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === val ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "text" && (
        <div className="space-y-3">
          <textarea
            className="w-full h-32 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入要计算哈希的文本..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button onClick={hashText} disabled={!input} className="w-full">计算哈希</Button>
        </div>
      )}

      {mode === "file" && (
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

      {mode === "verify" && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">粘贴已知哈希值</label>
            <Input
              value={verifyHash}
              onChange={(e) => { setVerifyHash(e.target.value); setVerifyResult("") }}
              placeholder="粘贴 SHA-256 或其他哈希值..."
              className="text-sm font-mono"
            />
          </div>
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-gray-300"
            onClick={() => document.getElementById("verify-file")?.click()}
          >
            <input id="verify-file" type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleVerifyFile(e.target.files[0])} />
            {fileName ? (
              <p className="text-sm text-gray-700">{fileName}</p>
            ) : (
              <>
                <div className="text-2xl mb-2">📎</div>
                <p className="text-sm text-gray-600">选择文件进行校验</p>
              </>
            )}
          </div>
          {verifyResult === "match" && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium">校验通过 — 哈希值匹配</p>
            </div>
          )}
          {verifyResult === "mismatch" && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">校验失败 — 哈希值不匹配，文件可能被篡改</p>
            </div>
          )}
        </div>
      )}

      {mode === "compare" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-600">上传两个文件，自动比较 SHA-256 哈希是否一致</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-gray-300" onClick={() => document.getElementById("compare-file-a")?.click()}>
              <input id="compare-file-a" type="file" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return
                setCompareNames(prev => [f.name, prev[1]])
                const buf = await f.arrayBuffer()
                const hash = await crypto.subtle.digest("SHA-256", buf)
                const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("")
                setResults(prev => ({ ...prev, fileA: hex }))
                if (results.fileB) setCompareResult(hex === results.fileB ? "match" : "mismatch")
              }} />
              <p className="text-xs text-gray-600">{compareNames[0] || "选择文件 A"}</p>
            </div>
            <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-gray-300" onClick={() => document.getElementById("compare-file-b")?.click()}>
              <input id="compare-file-b" type="file" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return
                setCompareNames(prev => [prev[0], f.name])
                const buf = await f.arrayBuffer()
                const hash = await crypto.subtle.digest("SHA-256", buf)
                const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("")
                setResults(prev => ({ ...prev, fileB: hex }))
                if (results.fileA) setCompareResult(hex === results.fileA ? "match" : "mismatch")
              }} />
              <p className="text-xs text-gray-600">{compareNames[1] || "选择文件 B"}</p>
            </div>
          </div>
          {compareResult === "match" && <div className="p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-sm text-green-800 font-medium">两个文件完全一致</p></div>}
          {compareResult === "mismatch" && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-800 font-medium">两个文件不一致</p></div>}
        </div>
      )}

      {mode === "batch" && (
        <div className="space-y-3">
          <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-gray-300" onClick={() => document.getElementById("batch-hash-input")?.click()}>
            <input id="batch-hash-input" type="file" multiple className="hidden" onChange={async (e) => {
              const files = e.target.files; if (!files) return
              const results: { name: string; hash: string }[] = []
              for (const f of Array.from(files)) {
                const buf = await f.arrayBuffer()
                const hash = await crypto.subtle.digest("SHA-256", buf)
                results.push({ name: f.name, hash: Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("") })
              }
              setBatchResults(results)
            }} />
            <p className="text-sm text-gray-600">选择多个文件批量计算 SHA-256</p>
          </div>
          {batchResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600">{batchResults.length} 个文件</p>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => {
                  const csv = ["文件名,SHA-256", ...batchResults.map(r => `"${r.name}",${r.hash}`)].join("\n")
                  const blob = new Blob(["﻿" + csv], { type: "text/csv" })
                  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "hashes.csv"; a.click()
                }}>导出 CSV</Button>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0"><tr><th className="text-left px-2 py-1.5">文件</th><th className="text-left px-2 py-1.5">SHA-256</th></tr></thead>
                  <tbody>
                    {batchResults.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1.5 truncate max-w-[150px]">{r.name}</td>
                        <td className="px-2 py-1.5 font-mono text-gray-700 break-all">{r.hash.slice(0, 16)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {Object.keys(results).length > 0 && mode !== "compare" && mode !== "batch" && (
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
