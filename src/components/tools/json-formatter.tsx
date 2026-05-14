"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function TreeNode({ name, value, path, defaultExpanded }: {
  name: string
  value: unknown
  path: string
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? true)

  if (value === null) return (
    <div className="flex items-center gap-1 py-0.5">
      <span className="text-gray-500 text-xs w-4" />
      <span className="text-purple-600">{name}</span>
      <span className="text-gray-400">:</span>
      <span className="text-gray-500 italic">null</span>
    </div>
  )

  if (typeof value === "object") {
    const isArray = Array.isArray(value)
    const entries = Object.entries(value as Record<string, unknown>)
    const bracket = isArray ? ["[", "]"] : ["{", "}"]
    return (
      <div className="py-0.5">
        <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1" onClick={() => setExpanded(!expanded)}>
          <span className="text-gray-400 text-xs w-4">{expanded ? "▼" : "▶"}</span>
          <span className="text-purple-600">{name}</span>
          <span className="text-gray-400">{bracket[0]}</span>
          {!expanded && <span className="text-gray-400 text-xs">{entries.length} items{bracket[1]}</span>}
        </div>
        {expanded && (
          <div className="ml-4 border-l border-gray-200 pl-2">
            {entries.map(([k, v]) => (
              <TreeNode key={k} name={isArray ? `[${k}]` : k} value={v} path={`${path}.${k}`} defaultExpanded={false} />
            ))}
            <span className="text-gray-400 text-xs">{bracket[1]}</span>
          </div>
        )}
      </div>
    )
  }

  const typeColor = typeof value === "string" ? "text-green-700" :
    typeof value === "number" ? "text-blue-700" :
    typeof value === "boolean" ? "text-orange-600" : "text-gray-700"

  return (
    <div className="flex items-center gap-1 py-0.5">
      <span className="text-gray-500 text-xs w-4" />
      <span className="text-purple-600">{name}</span>
      <span className="text-gray-400">:</span>
      <span className={`${typeColor} text-sm`}>
        {typeof value === "string" ? `"${value}"` : String(value)}
      </span>
    </div>
  )
}

function DiffPanel() {
  const [left, setLeft] = useState("")
  const [right, setRight] = useState("")
  const [diffs, setDiffs] = useState<{ path: string; left: string; right: string }[]>([])

  const compare = () => {
    try {
      const a = JSON.parse(left)
      const b = JSON.parse(right)
      const result: { path: string; left: string; right: string }[] = []
      const walk = (objA: unknown, objB: unknown, path: string) => {
        if (typeof objA !== typeof objB || Array.isArray(objA) !== Array.isArray(objB)) {
          result.push({ path, left: JSON.stringify(objA), right: JSON.stringify(objB) })
          return
        }
        if (typeof objA !== "object" || objA === null || objB === null) {
          if (objA !== objB) result.push({ path, left: JSON.stringify(objA), right: JSON.stringify(objB) })
          return
        }
        const keys = new Set([...Object.keys(objA as Record<string, unknown>), ...Object.keys(objB as Record<string, unknown>)])
        for (const key of keys) {
          const va = (objA as Record<string, unknown>)[key]
          const vb = (objB as Record<string, unknown>)[key]
          if (va === undefined) { result.push({ path: `${path}.${key}`, left: "(不存在)", right: JSON.stringify(vb) }); continue }
          if (vb === undefined) { result.push({ path: `${path}.${key}`, left: JSON.stringify(va), right: "(不存在)" }); continue }
          walk(va, vb, `${path}.${key}`)
        }
      }
      walk(a, b, "$")
      setDiffs(result)
    } catch {
      setDiffs([{ path: "错误", left: "JSON 格式错误", right: "请检查输入" }])
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">JSON A</label>
          <textarea className="w-full h-36 p-2 border rounded-lg text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500" value={left} onChange={(e) => setLeft(e.target.value)} placeholder="粘贴第一个 JSON..." />
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">JSON B</label>
          <textarea className="w-full h-36 p-2 border rounded-lg text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500" value={right} onChange={(e) => setRight(e.target.value)} placeholder="粘贴第二个 JSON..." />
        </div>
      </div>
      <Button onClick={compare} disabled={!left.trim() || !right.trim()}>对比差异</Button>
      {diffs.length > 0 && (
        <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-2 py-1.5 font-medium text-gray-600">路径</th>
                <th className="text-left px-2 py-1.5 font-medium text-red-600">A</th>
                <th className="text-left px-2 py-1.5 font-medium text-green-600">B</th>
              </tr>
            </thead>
            <tbody>
              {diffs.map((d, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1.5 font-mono text-blue-700">{d.path}</td>
                  <td className="px-2 py-1.5 font-mono text-red-700 bg-red-50 break-all">{d.left}</td>
                  <td className="px-2 py-1.5 font-mono text-green-700 bg-green-50 break-all">{d.right}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {diffs.length === 0 && left.trim() && right.trim() && (
        <p className="text-sm text-green-600">两个 JSON 完全相同</p>
      )}
    </div>
  )
}

function jsonToTs(obj: unknown, name: string = "Root", indent: number = 0): string {
  const pad = "  ".repeat(indent)
  if (obj === null) return `${pad}${name}: null`
  if (Array.isArray(obj)) {
    if (obj.length === 0) return `${pad}${name}: unknown[]`
    const itemType = jsonToTs(obj[0], "", 0).split(": ").slice(1).join(": ")
    return `${pad}${name}: ${itemType}[]`
  }
  if (typeof obj === "object") {
    const entries = Object.entries(obj as Record<string, unknown>)
    const fields = entries.map(([k, v]) => jsonToTs(v, k, indent + 1)).join("\n")
    if (indent === 0) return `interface ${name} {\n${fields}\n}`
    return `${pad}${name}: {\n${fields}\n${pad}}`
  }
  if (typeof obj === "string") return `${pad}${name}: string`
  if (typeof obj === "number") return `${pad}${name}: number`
  if (typeof obj === "boolean") return `${pad}${name}: boolean`
  return `${pad}${name}: unknown`
}

function queryJsonPath(obj: unknown, path: string): unknown {
  const parts = path.replace(/^\$\.?/, "").split(/\.|\[|\]/).filter(Boolean)
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return current
}

export function JsonFormatterTool() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [jsonPath, setJsonPath] = useState("")
  const [pathResult, setPathResult] = useState("")

  const parsedJson = useMemo(() => {
    if (!input.trim()) return null
    try { return JSON.parse(input) } catch { return null }
  }, [input])

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
      setOutput("JSON 格式正确")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "JSON 格式错误")
      setOutput("")
    }
  }

  const toTypeScript = () => {
    try {
      const parsed = JSON.parse(input)
      setOutput(jsonToTs(parsed, "Root"))
      setError("")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "JSON 格式错误")
      setOutput("")
    }
  }

  const handlePathQuery = useCallback(() => {
    if (!parsedJson || !jsonPath.trim()) { setPathResult(""); return }
    try {
      const result = queryJsonPath(parsedJson, jsonPath)
      setPathResult(result === undefined ? "未找到" : JSON.stringify(result, null, 2))
    } catch {
      setPathResult("查询出错")
    }
  }, [parsedJson, jsonPath])

  const copyOutput = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="format">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="format">格式化</TabsTrigger>
          <TabsTrigger value="compress">压缩</TabsTrigger>
          <TabsTrigger value="validate">校验</TabsTrigger>
          <TabsTrigger value="tree">树形浏览</TabsTrigger>
          <TabsTrigger value="typescript">转 TS</TabsTrigger>
          <TabsTrigger value="path">路径查询</TabsTrigger>
          <TabsTrigger value="diff">Diff 对比</TabsTrigger>
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

        <TabsContent value="tree" className="space-y-4">
          <textarea
            className="w-full h-32 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="粘贴 JSON 数据..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {parsedJson && (
            <div className="max-h-96 overflow-auto p-3 bg-gray-50 border rounded-lg text-xs font-mono">
              <TreeNode name="root" value={parsedJson} path="$" defaultExpanded={true} />
            </div>
          )}
          {input.trim() && !parsedJson && (
            <p className="text-sm text-red-600">JSON 格式错误，无法生成树形视图</p>
          )}
        </TabsContent>

        <TabsContent value="typescript" className="space-y-4">
          <textarea
            className="w-full h-48 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="粘贴 JSON 数据..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button onClick={toTypeScript} disabled={!input.trim()}>生成 TypeScript Interface</Button>
        </TabsContent>

        <TabsContent value="path" className="space-y-4">
          <textarea
            className="w-full h-32 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="粘贴 JSON 数据..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              placeholder="输入路径，如 $.data[0].name 或 data.items"
              value={jsonPath}
              onChange={(e) => setJsonPath(e.target.value)}
              className="flex-1 text-sm font-mono"
            />
            <Button onClick={handlePathQuery} disabled={!input.trim() || !jsonPath.trim()}>查询</Button>
          </div>
          {pathResult && (
            <pre className="p-3 bg-gray-50 border rounded-lg text-sm font-mono whitespace-pre-wrap max-h-48 overflow-auto">
              {pathResult}
            </pre>
          )}
        </TabsContent>

        <TabsContent value="diff" className="space-y-4">
          <DiffPanel />
        </TabsContent>
      </Tabs>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
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
