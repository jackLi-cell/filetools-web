"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function JwtDecoderTool() {
  const [token, setToken] = useState("")
  const [decoded, setDecoded] = useState<{ header: string; payload: string; expInfo: string } | null>(null)
  const [error, setError] = useState("")

  const decode = () => {
    setError("")
    setDecoded(null)
    const parts = token.trim().split(".")
    if (parts.length !== 3) { setError("无效的 JWT 格式（应包含 3 个部分，用 . 分隔）"); return }
    try {
      const header = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")))
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))
      let expInfo = ""
      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000)
        const now = new Date()
        expInfo = expDate > now
          ? `有效期至：${expDate.toLocaleString("zh-CN")}（剩余 ${Math.round((expDate.getTime() - now.getTime()) / 60000)} 分钟）`
          : `已过期：${expDate.toLocaleString("zh-CN")}（过期 ${Math.round((now.getTime() - expDate.getTime()) / 60000)} 分钟）`
      }
      if (payload.iat) {
        expInfo += `\n签发时间：${new Date(payload.iat * 1000).toLocaleString("zh-CN")}`
      }
      setDecoded({
        header: JSON.stringify(header, null, 2),
        payload: JSON.stringify(payload, null, 2),
        expInfo,
      })
    } catch {
      setError("解码失败：JWT 内容不是有效的 Base64 编码")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs text-gray-600 mb-1 block">JWT Token</label>
        <textarea
          className="w-full h-24 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="粘贴 JWT Token（eyJhbGciOiJIUzI1NiIs...）"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </div>
      <Button onClick={decode} disabled={!token.trim()}>解码</Button>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">❌ {error}</div>}

      {decoded && (
        <div className="space-y-4">
          {decoded.expInfo && (
            <div className={`p-3 rounded-lg text-sm ${decoded.expInfo.includes("已过期") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              <pre className="whitespace-pre-wrap">{decoded.expInfo}</pre>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">Header</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigator.clipboard.writeText(decoded.header)}>复制</Button>
            </div>
            <pre className="p-3 bg-gray-50 border rounded-lg text-sm font-mono overflow-auto max-h-40">{decoded.header}</pre>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">Payload</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigator.clipboard.writeText(decoded.payload)}>复制</Button>
            </div>
            <pre className="p-3 bg-gray-50 border rounded-lg text-sm font-mono overflow-auto max-h-64">{decoded.payload}</pre>
          </div>
          <p className="text-xs text-gray-400">注意：JWT 签名未验证，仅解码展示内容。</p>
        </div>
      )}
    </div>
  )
}
