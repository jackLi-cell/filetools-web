/**
 * AI 工具注册表
 *
 * open_tool：用于强前端交互工具，跳转到工具页并预填。
 * execute_tool：用于可由服务端直接执行的工具，复用现有扣费和队列链路。
 */

import { tool, type ToolSet } from "ai"
import { z } from "zod"
import { attachmentStore } from "./attachment-store.js"
import {
  executeToolThroughHarness,
  HARNESS_TOOL_DEFINITIONS,
  HARNESS_TOOL_SLUGS,
  type ToolParamValue,
} from "./tool-harness.js"

const TOOL_SLUGS = HARNESS_TOOL_SLUGS as [string, ...string[]]
const toolParamValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])

function promptSafeText(value: string, maxLength = 120): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength)
}

export function buildTools(
  allowedAttachmentIds: Set<string> = new Set(),
  userId?: number,
  ipAddress?: string,
  attachmentOwnerKey?: string,
): ToolSet {
  return {
    open_tool: tool({
      description:
        "把工具页打开并预填。用于需要强前端交互的工具，例如裁剪、取色、手写签名、二维码摄像头识别、拖拽编辑等。",
      parameters: z.object({
        slug: z.enum(TOOL_SLUGS).describe("目标工具的 slug"),
        reason: z.string().max(200).describe("简短说明为什么选这个工具"),
        params: z.record(toolParamValueSchema).optional().describe("可选工具参数"),
        attachmentId: z.string().optional().describe("附件 id（att_xxx）"),
      }),
      execute: async (args) => {
        let signedToken: string | null = null
        let expiresAt: number | null = null
        let resolvedName: string | null = null
        let resolvedMime: string | null = null
        if (args.attachmentId && allowedAttachmentIds.has(args.attachmentId)) {
          const stored = attachmentStore.get(args.attachmentId, attachmentOwnerKey)
          if (stored) {
            signedToken = stored.signedToken
            expiresAt = stored.expiresAt
            resolvedName = stored.name
            resolvedMime = stored.mime
          }
        }
        return {
          kind: "redirect" as const,
          slug: args.slug,
          reason: args.reason,
          params: args.params ?? {},
          attachmentId: args.attachmentId && allowedAttachmentIds.has(args.attachmentId) ? args.attachmentId : null,
          signedToken,
          expiresAt,
          attachmentName: resolvedName,
          attachmentMime: resolvedMime,
        }
      },
    }),
    execute_tool: tool({
      description:
        "在服务端直接执行本站已有工具。文档转换、PDF/视频/音频处理、文件安全、Markdown 导出等能走后端的工具都应优先调用它。",
      parameters: z.object({
        slug: z.enum(TOOL_SLUGS).describe("目标工具的 slug"),
        reason: z.string().max(200).describe("简短说明为什么选这个工具"),
        params: z.record(toolParamValueSchema).optional().describe("可选工具参数"),
        attachmentId: z.string().optional().describe("附件 id（att_xxx）"),
      }),
      execute: async (args) => {
        const attachments = args.attachmentId && allowedAttachmentIds.has(args.attachmentId)
          ? [attachmentStore.get(args.attachmentId, attachmentOwnerKey)].filter(Boolean) as NonNullable<ReturnType<typeof attachmentStore.get>>[]
          : Array.from(allowedAttachmentIds)
              .map((id) => attachmentStore.get(id, attachmentOwnerKey))
              .filter(Boolean) as NonNullable<ReturnType<typeof attachmentStore.get>>[]
        return executeToolThroughHarness(
          {
            slug: args.slug,
            reason: args.reason,
            params: args.params as Record<string, ToolParamValue> | undefined,
            attachmentId: args.attachmentId,
          },
          {
            attachments,
            userId,
            ipAddress,
          },
        )
      },
    }),
  }
}

export function buildToolsCatalog(): string {
  const byCategory = new Map<string, typeof HARNESS_TOOL_DEFINITIONS>()
  for (const t of HARNESS_TOOL_DEFINITIONS) {
    const arr = byCategory.get(t.category) || []
    arr.push(t)
    byCategory.set(t.category, arr)
  }
  let s = "可用工具按分类（slug: 名称 — 简介）：\n"
  for (const [cat, list] of byCategory) {
    s += `\n[${cat}]\n`
    for (const t of list) {
      s += `- ${t.slug}: ${t.name} — ${t.description}\n`
    }
  }
  if (s.length > 1500) {
    s = s.slice(0, 1500) + "\n…(更多工具略)"
  }
  return s
}

export function buildAttachmentsHint(
  attachments: Array<{ id: string; name: string; mime: string }>,
): string {
  if (attachments.length === 0) return ""
  let s = "\n\n用户本次上传了以下附件，可在工具调用里传 attachmentId：\n"
  for (const a of attachments) {
    s += `- ${a.id} (${promptSafeText(a.name)}, ${promptSafeText(a.mime, 80)})\n`
  }
  return s
}
