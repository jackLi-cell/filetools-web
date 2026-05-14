"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { tools } from "@/config/tools"

export function ToolSearch() {
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return tools
      .filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.slug.includes(q))
      .slice(0, 8)
  }, [query])

  return (
    <div className="relative max-w-md mx-auto">
      <Input
        type="search"
        placeholder="搜索工具，如：图片压缩、PDF 合并、JSON 格式化..."
        className="h-11 text-sm"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
      />
      {focused && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.map((tool) => (
            <Link
              key={tool.slug}
              href={`/tools/${tool.category}/${tool.slug}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{tool.name}</p>
                <p className="text-xs text-gray-500">{tool.description}</p>
              </div>
              {tool.isFree && (
                <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">免费</span>
              )}
            </Link>
          ))}
        </div>
      )}
      {focused && query.trim() && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 p-4 text-center">
          <p className="text-sm text-gray-500">未找到匹配的工具</p>
          <Link href="/tools" className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block">
            浏览全部工具 →
          </Link>
        </div>
      )}
    </div>
  )
}
