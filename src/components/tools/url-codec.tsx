"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function UrlCodecTool() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [tab, setTab] = useState<"codec" | "parse" | "build">("codec")

  // Build mode state
  const [protocol, setProtocol] = useState("https")
  const [host, setHost] = useState("")
  const [path, setPath] = useState("")
  const [params, setParams] = useState<{ key: string; value: string }[]>([{ key: "", value: "" }])

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
  const batchEncode = () => {
    setOutput(input.split("\n").map(line => line.trim() ? encodeURIComponent(line.trim()) : "").join("\n"))
  }
  const batchDecode = () => {
    setOutput(input.split("\n").map(line => {
      try { return line.trim() ? decodeURIComponent(line.trim()) : "" }
      catch { return `[解码失败] ${line}` }
    }).join("\n"))
  }

  const parsedParams = useMemo(() => {
    if (tab !== "parse" || !input.trim()) return []
    try {
      const url = new URL(input.includes("://") ? input : `https://${input}`)
      return Array.from(url.searchParams.entries()).map(([key, value]) => ({ key, value }))
    } catch {
      const qIndex = input.indexOf("?")
      if (qIndex === -1) return []
      const qs = input.slice(qIndex + 1)
      return qs.split("&").filter(Boolean).map(pair => {
        const [key, ...rest] = pair.split("=")
        return { key: decodeURIComponent(key), value: decodeURIComponent(rest.join("=")) }
      })
    }
  }, [input, tab])

  const builtUrl = useMemo(() => {
    if (!host) return ""
    const validParams = params.filter(p => p.key.trim())
    const qs = validParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join("&")
    const pathPart = path.startsWith("/") ? path : path ? `/${path}` : ""
    return `${protocol}://${host}${pathPart}${qs ? `?${qs}` : ""}`
  }, [protocol, host, path, params])

  const addParam = () => setParams([...params, { key: "", value: "" }])
  const removeParam = (i: number) => setParams(params.filter((_, idx) => idx !== i))
  const updateParam = (i: number, field: "key" | "value", val: string) => {
    const next = [...params]
    next[i][field] = val
    setParams(next)
  }

  return (
    <div className="space-y-6">
      {/* Tab 切换 */}
      <div className="flex gap-2">
        {([["codec", "编码/解码"], ["parse", "参数解析"], ["build", "URL 构建"]] as const).map(([val, label]) => (
          <button
            key={val}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              tab === val ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setTab(val)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 编码/解码 */}
      {tab === "codec" && (
        <>
          <textarea
            className="w-full h-32 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入要编码或解码的文本/URL（支持多行批量处理）..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={encode} disabled={!input} size="sm">encodeURIComponent</Button>
            <Button onClick={decode} disabled={!input} variant="outline" size="sm">decodeURIComponent</Button>
            <Button onClick={encodeAll} disabled={!input} variant="outline" size="sm">encodeURI</Button>
            <Button onClick={decodeAll} disabled={!input} variant="outline" size="sm">decodeURI</Button>
            <Button onClick={batchEncode} disabled={!input} variant="outline" size="sm">批量编码</Button>
            <Button onClick={batchDecode} disabled={!input} variant="outline" size="sm">批量解码</Button>
          </div>
          {output && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">结果</span>
                <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(output)}>复制</Button>
              </div>
              <pre className="p-3 bg-gray-50 border rounded-lg text-sm font-mono whitespace-pre-wrap break-all max-h-48 overflow-auto">{output}</pre>
            </div>
          )}
        </>
      )}

      {/* 参数解析 */}
      {tab === "parse" && (
        <>
          <Input
            placeholder="粘贴完整 URL，如 https://example.com/path?key=value&foo=bar"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="text-sm font-mono"
          />
          {parsedParams.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600">解析出 {parsedParams.length} 个参数</p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Key</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Value</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedParams.map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs text-blue-700">{p.key}</td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-800 break-all">{p.value}</td>
                        <td className="px-2">
                          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigator.clipboard.writeText(p.value)}>复制</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {input.trim() && parsedParams.length === 0 && (
            <p className="text-xs text-gray-500">未检测到 URL 参数</p>
          )}
        </>
      )}

      {/* URL 构建器 */}
      {tab === "build" && (
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-3">
              <label className="text-xs text-gray-600 mb-1 block">协议</label>
              <select value={protocol} onChange={(e) => setProtocol(e.target.value)} className="w-full h-9 px-2 border rounded-lg text-sm bg-white">
                <option value="https">https</option>
                <option value="http">http</option>
              </select>
            </div>
            <div className="col-span-5">
              <label className="text-xs text-gray-600 mb-1 block">域名</label>
              <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="example.com" className="h-9 text-sm" />
            </div>
            <div className="col-span-4">
              <label className="text-xs text-gray-600 mb-1 block">路径</label>
              <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/api/users" className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-600">查询参数</label>
            {params.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Input value={p.key} onChange={(e) => updateParam(i, "key", e.target.value)} placeholder="key" className="h-8 text-xs flex-1" />
                <Input value={p.value} onChange={(e) => updateParam(i, "value", e.target.value)} placeholder="value" className="h-8 text-xs flex-1" />
                <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={() => removeParam(i)}>x</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addParam}>+ 添加参数</Button>
          </div>

          {builtUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">生成的 URL</span>
                <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(builtUrl)}>复制</Button>
              </div>
              <pre className="p-3 bg-gray-50 border rounded-lg text-xs font-mono break-all">{builtUrl}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}