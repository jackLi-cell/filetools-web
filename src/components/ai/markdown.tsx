"use client"

import { marked } from "marked"
import DOMPurify from "isomorphic-dompurify"
import { useMemo } from "react"

export function Markdown({ content }: { content: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(content, { gfm: true, breaks: true }) as string
    return DOMPurify.sanitize(raw, {
      ADD_ATTR: ["target", "rel"],
      FORBID_TAGS: ["style", "iframe", "object", "embed", "form"],
      FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
    })
  }, [content])
  return (
    <div
      className="prose prose-sm max-w-none text-[0.875rem] leading-relaxed text-gray-800 [&_a]:text-blue-600 [&_a]:underline [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.8125rem] [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-gray-900 [&_pre]:p-3 [&_pre]:text-gray-100 [&_pre>code]:bg-transparent [&_pre>code]:p-0 [&_pre>code]:text-gray-100 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_p]:my-2 [&_h1]:my-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:my-2 [&_h2]:text-[0.95rem] [&_h2]:font-semibold [&_h3]:my-2 [&_h3]:text-sm [&_h3]:font-semibold [&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-3 [&_blockquote]:text-gray-600 [&_table]:my-2 [&_table]:border-collapse [&_table]:text-[0.8125rem] [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-gray-200 [&_td]:px-2 [&_td]:py-1"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
