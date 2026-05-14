"use client"

import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { categories, getToolBySlug } from "@/config/tools"
import { prefillToolSession } from "@/lib/ai-client"

export interface ToolCallCardProps {
  /** Tool slug returned by the model. */
  slug: string
  /** Free-form params the model wants to pre-fill. */
  params?: Record<string, unknown>
  /** Optional attachment id from /api/ai/attach (set when AI knows we have a file). */
  attachmentId?: string
  /** Signed token from /api/ai/attach response (paired with attachmentId). */
  signedToken?: string
  /** Token expiry (epoch ms) — passed through to prefill payload. */
  expiresAt?: number
  /** One-line reason explaining why the tool was chosen. */
  reason?: string
  /** Optional callback fired after navigation prep, parents may override default behaviour. */
  onOpen?: (slug: string) => void
}

function categoryFor(slug: string): string {
  const tool = getToolBySlug(slug)
  return tool?.category ?? "tools"
}

function toolHrefFor(slug: string): string {
  const tool = getToolBySlug(slug)
  if (!tool) return `/tools`
  return `/tools/${tool.category}/${tool.slug}?prefill=1`
}

function categoryIconFor(slug: string): string {
  const tool = getToolBySlug(slug)
  if (!tool) return "🛠️"
  const category = categories.find((c) => c.slug === tool.category)
  return category?.icon ?? "🛠️"
}

export function ToolCallCard({
  slug,
  params,
  attachmentId,
  signedToken,
  expiresAt,
  reason,
  onOpen,
}: ToolCallCardProps) {
  const router = useRouter()
  const tool = getToolBySlug(slug)
  const displayName = tool?.name ?? slug
  const description = tool?.description
  const icon = categoryIconFor(slug)
  const category = categoryFor(slug)
  const known = !!tool

  const handleOpen = () => {
    if (!known) return
    if (onOpen) {
      onOpen(slug)
      return
    }
    prefillToolSession({
      slug,
      attachmentId,
      signedToken,
      params,
      // default 30 minute window aligns with attachment TTL
      expiresAt: expiresAt ?? Date.now() + 30 * 60 * 1000,
    })
    router.push(toolHrefFor(slug))
  }

  return (
    <div
      className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/40 px-4 py-3"
      role="group"
      aria-label={`AI 推荐使用工具：${displayName}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-base shadow-sm">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{displayName}</span>
            <span className="text-[10px] uppercase tracking-wide text-blue-700/70">{category}</span>
            {!known && (
              <span className="text-[10px] text-amber-700">未识别工具</span>
            )}
          </div>
          {description && (
            <p className="mt-0.5 text-xs text-gray-600 line-clamp-1">{description}</p>
          )}
          {reason && (
            <p className="mt-1 text-xs text-gray-700 line-clamp-2">{reason}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[11px] text-gray-500">
          {attachmentId ? "已携带 AI 上传的附件" : "无附件，按当前对话上下文打开工具"}
        </span>
        <Button
          type="button"
          size="sm"
          onClick={handleOpen}
          disabled={!known}
          aria-label={`打开 ${displayName} 并预填`}
        >
          打开工具并预填
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
