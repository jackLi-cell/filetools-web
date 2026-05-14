"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { filterTools } from "@/lib/tool-filter"
import { cn } from "@/lib/utils"

export function HeaderToolSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const router = useRouter()

  const results = useMemo(() => filterTools(query), [query])

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Reset query when closed
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setQuery(""), 150)
      return () => clearTimeout(t)
    }
  }, [open])

  const handleSelect = useCallback(
    (category: string, slug: string) => {
      setOpen(false)
      router.push(`/tools/${category}/${slug}`)
    },
    [router]
  )

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="搜索工具"
        title="搜索工具 (⌘K)"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="top-[20%] max-w-xl translate-y-0 gap-3 p-0 sm:max-w-xl"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">搜索工具</DialogTitle>
          <DialogDescription className="sr-only">
            输入关键字快速搜索网站上的工具
          </DialogDescription>

          <div className="flex items-center gap-2 border-b px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <Input
              autoFocus
              type="search"
              placeholder="搜索工具，如：图片压缩、PDF 合并、JSON 格式化..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
            />
            <kbd className="hidden rounded border bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 sm:inline">
              Esc
            </kbd>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-1 pb-2">
            {!query.trim() ? (
              <p className="px-4 py-6 text-center text-xs text-gray-500">
                输入关键词查找工具
              </p>
            ) : results.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-gray-500">
                未找到匹配的工具
              </p>
            ) : (
              <ul className="flex flex-col">
                {results.map((tool) => (
                  <li key={tool.slug}>
                    <button
                      type="button"
                      onClick={() => handleSelect(tool.category, tool.slug)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors",
                        "hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {tool.name}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {tool.description}
                        </p>
                      </div>
                      {tool.isFree ? (
                        <span className="shrink-0 rounded bg-green-50 px-1.5 py-0.5 text-[10px] text-green-700">
                          免费
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Inline search input for mobile Sheet — clicking it routes to the tools index
 * with a query param (or opens the same Dialog if nothing is typed).
 */
export function MobileToolSearchTrigger({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState("")
  const router = useRouter()
  const results = useMemo(() => filterTools(query, 6), [query])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5">
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <Input
          type="search"
          placeholder="搜索工具..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-7 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
        />
      </div>
      {query.trim() ? (
        <div className="max-h-72 overflow-y-auto rounded-md border bg-white">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-gray-500">
              未找到匹配的工具
            </p>
          ) : (
            <ul>
              {results.map((tool) => (
                <li key={tool.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      onClose?.()
                      router.push(`/tools/${tool.category}/${tool.slug}`)
                    }}
                    className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left last:border-b-0 hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {tool.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {tool.description}
                      </p>
                    </div>
                    {tool.isFree ? (
                      <span className="shrink-0 rounded bg-green-50 px-1.5 py-0.5 text-[10px] text-green-700">
                        免费
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
