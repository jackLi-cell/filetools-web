/**
 * AI 工具注册表
 *
 * Phase 4 只实现 open_tool（把用户路由到具体工具页面并预填）。
 * summarize_document / render_chart / describe_image 留到 Phase 5+6。
 *
 * 模型决策规则会在 system prompt 里告诉它：
 * - 用户要求转换/压缩/合并 → emit open_tool({slug, params, attachmentId})，**不要**自己尝试
 * - 用户提问/聊天 → 直接回答
 */

import { tool, type ToolSet } from "ai"
import { z } from "zod"
import { tools as TOOLS } from "../shared/tools.js"
import { attachmentStore } from "./attachment-store.js"

// 把所有工具 slug 抽出来给 zod enum 校验
const TOOL_SLUGS = TOOLS.map((t) => t.slug) as [string, ...string[]]
const toolParamValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])

function promptSafeText(value: string, maxLength = 120): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength)
}

/**
 * 构建 streamText 的 tools 对象
 */
export function buildTools(allowedAttachmentIds: Set<string> = new Set()): ToolSet {
  return {
    open_tool: tool({
      description:
        "把已上传的文件路由到具体工具页面进行处理，并预填参数。当用户的请求与某个工具明显对应时使用（如压缩图片、合并 PDF、Word 转 PDF、提取 EXIF 等）。如果用户只是问问题、要求总结/分析文件内容，**不要**调用本工具，直接用文字回答。",
      parameters: z.object({
        slug: z
          .enum(TOOL_SLUGS)
          .describe("目标工具的 slug，必须是工具列表里存在的值"),
        reason: z
          .string()
          .max(200)
          .describe("简短说明为什么选这个工具，1-2 句中文"),
        params: z
          .record(toolParamValueSchema)
          .optional()
          .describe("可选的工具参数，只传简单标量值，例如 { targetKb: 200 } / { format: 'pdf' } / { quality: 80 }"),
        attachmentId: z
          .string()
          .optional()
          .describe("对应附件 id（att_xxx 格式），由用户已上传的附件提供；用户没上传时省略"),
      }),
      execute: async (args) => {
        // 服务端从 attachment-store 注入真实 signedToken / expiresAt，
        // 让前端 ToolCallCard 能拉 blob 预填到工具页面。
        let signedToken: string | null = null
        let expiresAt: number | null = null
        let resolvedName: string | null = null
        let resolvedMime: string | null = null
        if (args.attachmentId && allowedAttachmentIds.has(args.attachmentId)) {
          const stored = attachmentStore.get(args.attachmentId)
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
  }
}

/**
 * 生成附在 system prompt 后面的工具目录文本（按分类聚合，控制在 1500 字内）。
 * 只列 v0.1 已上线的工具。
 */
export function buildToolsCatalog(): string {
  const byCategory = new Map<string, typeof TOOLS>()
  for (const t of TOOLS) {
    if (t.version !== "v0.1") continue
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
  // 截断到 1500 字以防超长（v0.1 当前 ~45 个工具，约 1400 字以内）
  if (s.length > 1500) {
    s = s.slice(0, 1500) + "\n…(更多工具略)"
  }
  return s
}

/**
 * 生成附件清单文本（附在 system prompt 末尾，提示模型可在 open_tool 里引用）
 */
export function buildAttachmentsHint(
  attachments: Array<{ id: string; name: string; mime: string }>,
): string {
  if (attachments.length === 0) return ""
  let s = "\n\n用户本次上传了以下附件，可在 open_tool 调用时传 attachmentId 字段：\n"
  for (const a of attachments) {
    s += `- ${a.id} (${promptSafeText(a.name)}, ${promptSafeText(a.mime, 80)})\n`
  }
  return s
}
