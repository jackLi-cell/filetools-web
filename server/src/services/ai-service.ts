import { createOpenAI } from "@ai-sdk/openai"
import { streamText, type CoreMessage, type StreamTextResult, type ToolSet } from "ai"
import { PrismaClient } from "@prisma/client"
import { env } from "../config/env.js"
import {
  getUpstreams,
  markFail,
  markSuccess,
  isInCooldown,
  type Upstream,
} from "./ai-upstream-manager.js"
import { attachmentStore, type StoredAttachment } from "./attachment-store.js"
import { buildTools, buildToolsCatalog, buildAttachmentsHint } from "./tool-registry.js"

/**
 * 所有上游都失败时抛出，路由层捕获后返回 503
 */
export class AllUpstreamsFailedError extends Error {
  public attempts: Array<{ name: string; error: string }>
  constructor(attempts: Array<{ name: string; error: string }>) {
    super(`All ${attempts.length} AI upstream(s) failed`)
    this.name = "AllUpstreamsFailedError"
    this.attempts = attempts
  }
}

/**
 * AI 总开关关闭时抛出，路由层捕获后返回 503
 */
export class AiDisabledError extends Error {
  constructor() {
    super("AI assistant is disabled")
    this.name = "AiDisabledError"
  }
}

export interface StreamChatParams {
  messages: CoreMessage[]
  abortSignal?: AbortSignal
  userId?: number
  /**
   * 用户附带的附件 id 列表（来自 POST /api/ai/attach 的返回）。
   * 服务端会按 id 拉取已提取的文本，拼到 user message 之前。
   */
  attachmentIds?: string[]
}

const prisma = new PrismaClient()

const SYSTEM_PROMPT_CACHE_TTL_MS = 60_000
const ENABLED_CACHE_TTL_MS = 30_000

let systemPromptCache: { value: string; ts: number } | null = null
let enabledCache: { value: boolean; ts: number } | null = null

/**
 * 读取 system prompt：优先从 ai_settings 表 key='ai.system_prompt' 读取，否则用 env 默认值
 */
export async function getSystemPrompt(): Promise<string> {
  if (systemPromptCache && Date.now() - systemPromptCache.ts < SYSTEM_PROMPT_CACHE_TTL_MS) {
    return systemPromptCache.value
  }
  let value = env.ai.systemPromptDefault
  try {
    const row = await prisma.aiSetting.findUnique({ where: { key: "ai.system_prompt" } })
    if (row && row.value && row.value.trim().length > 0) {
      value = row.value
    }
  } catch (e) {
    console.warn("[ai-service] read ai.system_prompt failed, falling back to env:", e instanceof Error ? e.message : e)
  }
  systemPromptCache = { value, ts: Date.now() }
  return value
}

export function invalidateSystemPromptCache(): void {
  systemPromptCache = null
}

/**
 * 读取 AI 总开关：ai_settings 表 key='ai.enabled' 取 'true' 视为启用，缺省视为启用
 */
export async function isAiEnabled(): Promise<boolean> {
  if (enabledCache && Date.now() - enabledCache.ts < ENABLED_CACHE_TTL_MS) {
    return enabledCache.value
  }
  let value = true
  try {
    const row = await prisma.aiSetting.findUnique({ where: { key: "ai.enabled" } })
    if (row) {
      value = row.value === "true"
    }
  } catch (e) {
    // DB 不可用时不影响 AI 服务
    console.warn("[ai-service] read ai.enabled failed, defaulting to enabled:", e instanceof Error ? e.message : e)
  }
  enabledCache = { value, ts: Date.now() }
  return value
}

export function invalidateEnabledCache(): void {
  enabledCache = null
}

/**
 * 异步写入 AiUsageDaily（按 date+upstreamId 维度 upsert）。失败只记 warn，不阻塞。
 */
async function recordUsage(opts: {
  upstreamId: string
  dbId: number | null
  isAuth: boolean
  durationMs: number
  inputTokens: number
  outputTokens: number
  success: boolean
}): Promise<void> {
  // 只对 DB 上游记账（legacy 不入库）
  if (opts.dbId == null) return
  const today = new Date()
  // 取 UTC 日期
  const dateOnly = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  try {
    await prisma.aiUsageDaily.upsert({
      where: { date_upstreamId: { date: dateOnly, upstreamId: opts.dbId } },
      update: {
        totalCalls: { increment: 1 },
        totalErrors: { increment: opts.success ? 0 : 1 },
        anonCalls: { increment: opts.isAuth ? 0 : 1 },
        authCalls: { increment: opts.isAuth ? 1 : 0 },
        totalDurMs: { increment: BigInt(Math.max(0, Math.round(opts.durationMs))) },
        inputTokens: { increment: BigInt(Math.max(0, opts.inputTokens)) },
        outputTokens: { increment: BigInt(Math.max(0, opts.outputTokens)) },
      },
      create: {
        date: dateOnly,
        upstreamId: opts.dbId,
        totalCalls: 1,
        totalErrors: opts.success ? 0 : 1,
        anonCalls: opts.isAuth ? 0 : 1,
        authCalls: opts.isAuth ? 1 : 0,
        totalDurMs: BigInt(Math.max(0, Math.round(opts.durationMs))),
        inputTokens: BigInt(Math.max(0, opts.inputTokens)),
        outputTokens: BigInt(Math.max(0, opts.outputTokens)),
      },
    })
  } catch (e) {
    console.warn("[ai-service] recordUsage failed:", e instanceof Error ? e.message : e)
  }
}

function truncateMessages(messages: CoreMessage[], maxChars: number): CoreMessage[] {
  if (messages.length === 0) return messages
  const sizes = messages.map((m) => estimateMessageChars(m))
  let total = sizes.reduce((a, b) => a + b, 0)
  if (total <= maxChars) return messages

  const out = [...messages]
  while (total > maxChars && out.length > 1) {
    const removedSize = sizes.shift() ?? 0
    out.shift()
    total -= removedSize
    if (out.length === 1) break
  }
  return out
}

function estimateMessageChars(m: CoreMessage): number {
  const content = m.content as unknown
  if (typeof content === "string") return content.length
  if (Array.isArray(content)) {
    return content.reduce<number>((acc, part: unknown) => {
      if (typeof part === "string") return acc + part.length
      if (
        part &&
        typeof part === "object" &&
        "text" in part &&
        typeof (part as { text: unknown }).text === "string"
      ) {
        return acc + ((part as { text: string }).text).length
      }
      return acc
    }, 0)
  }
  return 0
}

/**
 * 提取错误对象上的细节字段（Vercel AI SDK / OpenAI provider 错误通常带这些）
 */
function describeError(err: unknown): {
  name?: string
  message: string
  status?: number
  url?: string
  responseBody?: string
  cause?: string
} {
  if (err == null) return { message: "unknown" }
  if (typeof err === "string") return { message: err }
  if (!(err instanceof Error) && typeof err === "object") {
    return { message: JSON.stringify(err).slice(0, 800) }
  }
  const e = err as Error & {
    statusCode?: number
    status?: number
    url?: string
    responseBody?: unknown
    cause?: unknown
  }
  const out: ReturnType<typeof describeError> = {
    name: e.name,
    message: e.message || String(e),
  }
  if (typeof e.statusCode === "number") out.status = e.statusCode
  else if (typeof e.status === "number") out.status = e.status
  if (typeof e.url === "string") out.url = e.url
  if (e.responseBody !== undefined) {
    try {
      out.responseBody =
        typeof e.responseBody === "string"
          ? e.responseBody.slice(0, 1500)
          : JSON.stringify(e.responseBody).slice(0, 1500)
    } catch {
      out.responseBody = "(unserializable)"
    }
  }
  if (e.cause) {
    try {
      out.cause = e.cause instanceof Error ? `${e.cause.name}: ${e.cause.message}` : String(e.cause).slice(0, 400)
    } catch {
      /* ignore */
    }
  }
  return out
}

/**
 * 流式聊天：按 priority 依次尝试上游，遇到失败 markFail 后试下一个。
 * 全部失败抛 AllUpstreamsFailedError。
 *
 * 总开关检查：在路由层之前已经做（路由层）
 */
export async function streamChat(
  params: StreamChatParams,
): Promise<StreamTextResult<ToolSet, never>> {
  const { messages, abortSignal, userId, attachmentIds } = params
  const isAuth = typeof userId === "number"

  const upstreams = await getUpstreams()
  if (upstreams.length === 0) {
    console.warn("[ai-service] streamChat called but no upstreams configured")
    throw new AllUpstreamsFailedError([{ name: "(none)", error: "未配置任何 AI 上游" }])
  }

  const candidates = upstreams
    .filter((u) => u.enabled)
    .sort((a, b) => a.priority - b.priority)

  console.log(
    `[ai-service] streamChat start: userId=${userId ?? "anon"}, messages=${messages.length}, ` +
      `attachments=${attachmentIds?.length ?? 0}, candidates=${candidates.length} ` +
      `(${candidates.map((u) => `${u.name}@${u.priority}`).join(", ")})`,
  )

  const baseSystemPrompt = await getSystemPrompt()

  // 1) 解析附件并拼到最后一条 user message 之前
  const attachments = resolveAttachments(attachmentIds)
  const messagesWithAttachments = injectAttachmentsIntoMessages(messages, attachments)

  // 2) 组装 system prompt（基础 + 工具目录 + 附件清单）
  const toolsCatalog = buildToolsCatalog()
  const attachmentsHint = buildAttachmentsHint(
    attachments.map((a) => ({ id: a.id, name: a.name, mime: a.mime })),
  )
  const systemPrompt = `${baseSystemPrompt}\n\n${toolsCatalog}${attachmentsHint}`

  // 3) 总长度截断（system 不参与，messages 历史按 maxContextChars 截断）
  const truncated = truncateMessages(messagesWithAttachments, env.ai.maxContextChars)

  const attempts: Array<{ name: string; error: string }> = []

  for (const upstream of candidates) {
    if (isInCooldown(upstream)) {
      console.warn(
        `[ai-service] upstream "${upstream.name}" in cooldown ` +
          `(failCount=${upstream.failCount}, lastError=${upstream.lastError ?? "-"})`,
      )
      attempts.push({ name: upstream.name, error: "cooldown" })
      continue
    }

    const startedAt = Date.now()
    try {
      const result = await tryStream({
        upstream,
        systemPrompt,
        messages: truncated,
        abortSignal,
      })

      // 流成功创建后，等 usage 完成（onFinish）再 markSuccess + 记账
      result.usage
        .then((usage) => {
          const durationMs = Date.now() - startedAt
          console.log(
            `[ai-service] upstream "${upstream.name}" stream done: ` +
              `dur=${durationMs}ms, prompt=${usage.promptTokens ?? 0}, completion=${usage.completionTokens ?? 0}`,
          )
          void markSuccess(upstream.id).catch((e) => {
            console.warn("[ai-service] markSuccess failed:", e)
          })
          void recordUsage({
            upstreamId: upstream.id,
            dbId: upstream.dbId,
            isAuth,
            durationMs,
            inputTokens: usage.promptTokens ?? 0,
            outputTokens: usage.completionTokens ?? 0,
            success: true,
          })
        })
        .catch((err) => {
          const durationMs = Date.now() - startedAt
          const detail = describeError(err)
          console.error(
            `[ai-service] upstream "${upstream.name}" stream FAILED after pipe started: ` +
              `dur=${durationMs}ms, status=${detail.status ?? "-"}, msg=${detail.message}, ` +
              `body=${detail.responseBody ?? "-"}`,
          )
          void markFail(upstream.id, err).catch((e) => {
            console.warn("[ai-service] markFail failed:", e)
          })
          void recordUsage({
            upstreamId: upstream.id,
            dbId: upstream.dbId,
            isAuth,
            durationMs,
            inputTokens: 0,
            outputTokens: 0,
            success: false,
          })
        })

      return result
    } catch (err) {
      const detail = describeError(err)
      console.error(
        `[ai-service] upstream "${upstream.name}" call FAILED before stream: ` +
          `status=${detail.status ?? "-"}, msg=${detail.message}, ` +
          `url=${detail.url ?? "-"}, body=${detail.responseBody ?? "-"}, ` +
          `cause=${detail.cause ?? "-"}`,
      )
      attempts.push({
        name: upstream.name,
        error: detail.responseBody
          ? `${detail.message} | upstream said: ${detail.responseBody.slice(0, 300)}`
          : detail.message,
      })
      const durationMs = Date.now() - startedAt
      try {
        await markFail(upstream.id, err)
      } catch (e) {
        console.warn("[ai-service] markFail failed:", e)
      }
      void recordUsage({
        upstreamId: upstream.id,
        dbId: upstream.dbId,
        isAuth,
        durationMs,
        inputTokens: 0,
        outputTokens: 0,
        success: false,
      })
    }
  }

  console.error(
    `[ai-service] all ${candidates.length} upstreams failed: ${JSON.stringify(attempts)}`,
  )
  throw new AllUpstreamsFailedError(attempts)
}

/**
 * 解析 attachmentIds → StoredAttachment[]，过滤掉不存在/过期的。
 * 保持顺序与传入一致。
 */
function resolveAttachments(ids?: string[]): StoredAttachment[] {
  if (!ids || ids.length === 0) return []
  const out: StoredAttachment[] = []
  for (const id of ids) {
    const item = attachmentStore.get(id)
    if (item) out.push(item)
  }
  return out
}

/**
 * 把附件提取的文本拼到 user message 之前（作为单独 system message 注入）。
 *
 * 截断策略：
 * - 给附件区一个总预算 = maxContextChars × 0.7（剩 30% 给对话历史）
 * - 单附件按比例分配（按原始文本长度），并标注 [已截取 X%]
 * - 不切割单 token，按字符截断
 */
function injectAttachmentsIntoMessages(
  messages: CoreMessage[],
  attachments: StoredAttachment[],
): CoreMessage[] {
  if (attachments.length === 0) return messages

  const budget = Math.floor(env.ai.maxContextChars * 0.7)
  const sections: string[] = []

  // 计算每个附件文本可用字符数
  const totalChars = attachments.reduce((s, a) => s + (a.extractedText ?? "").length, 0)

  for (let i = 0; i < attachments.length; i++) {
    const a = attachments[i]!
    const raw = a.extractedText ?? ""
    if (!raw) {
      sections.push(`===== ${a.name} (${a.mime}) =====\n[此附件无可提取的文本内容]`)
      continue
    }
    let allowed: number
    if (totalChars <= budget) {
      allowed = raw.length
    } else {
      // 按比例分配
      allowed = Math.max(200, Math.floor((raw.length / totalChars) * budget))
    }
    const used = Math.min(allowed, raw.length)
    const cut = raw.slice(0, used)
    const truncated = used < raw.length
    const pct = raw.length > 0 ? Math.round((used / raw.length) * 100) : 100

    const metaParts: string[] = []
    if (a.meta?.pages != null) metaParts.push(`${a.meta.pages} 页`)
    if (a.meta?.rows != null) metaParts.push(`${a.meta.rows} 行`)
    if (a.meta?.truncated) metaParts.push("已按规则截取")
    const metaStr = metaParts.length > 0 ? `, ${metaParts.join(", ")}` : ""

    const header = `===== ${a.name} (${a.mime}${metaStr}) =====`
    const footer = truncated ? `\n[本附件已截取至 ${pct}%]` : ""
    sections.push(`${header}\n${cut}${footer}`)
  }

  const attachmentBlock = `[系统] 用户上传了以下附件（仅供本轮回答参考）：\n\n${sections.join("\n\n")}`

  // 作为独立 system message 注入到最后一条 user message 之前
  // 寻找最后一条 user 的位置
  let lastUserIdx = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]!.role === "user") {
      lastUserIdx = i
      break
    }
  }
  const out = [...messages]
  const sysMsg: CoreMessage = { role: "system", content: attachmentBlock }
  if (lastUserIdx < 0) {
    out.unshift(sysMsg)
  } else {
    out.splice(lastUserIdx, 0, sysMsg)
  }
  return out
}

async function tryStream(opts: {
  upstream: Upstream
  systemPrompt: string
  messages: CoreMessage[]
  abortSignal?: AbortSignal
}): Promise<StreamTextResult<ToolSet, never>> {
  const { upstream, systemPrompt, messages, abortSignal } = opts

  // 入参摘要（API key 脱敏）
  const lastUser = messages.slice().reverse().find((m) => m.role === "user")
  const lastUserText =
    lastUser && typeof lastUser.content === "string"
      ? lastUser.content.slice(0, 200)
      : "(non-text content)"
  const apiKeyMasked = upstream.apiKey
    ? `${upstream.apiKey.slice(0, 6)}...${upstream.apiKey.slice(-4)}`
    : "(empty)"
  console.log(
    `[ai-service] -> upstream "${upstream.name}" ` +
      `baseUrl=${upstream.baseUrl} model=${upstream.model} apiKey=${apiKeyMasked} ` +
      `systemLen=${systemPrompt.length} msgs=${messages.length} maxTokens=${env.ai.maxOutputTokens} ` +
      `lastUser="${lastUserText.replace(/\n/g, "\\n")}"`,
  )

  const provider = createOpenAI({
    baseURL: upstream.baseUrl,
    apiKey: upstream.apiKey,
    compatibility: "compatible",
  })

  const result = streamText({
    model: provider(upstream.model),
    system: systemPrompt,
    tools: buildTools(),
    maxSteps: 3,
    messages,
    maxTokens: env.ai.maxOutputTokens,
    // 工具调用需要更稳定的输出，从 0.7 降到 0.5
    temperature: 0.5,
    abortSignal,
    onError: ({ error }) => {
      const detail = describeError(error)
      console.error(
        `[ai-service] streamText onError "${upstream.name}": ` +
          `status=${detail.status ?? "-"}, msg=${detail.message}, ` +
          `url=${detail.url ?? "-"}, body=${detail.responseBody ?? "-"}, ` +
          `cause=${detail.cause ?? "-"}`,
      )
    },
  })

  return result
}

/**
 * 调用上游做一次最小测试（用于 admin /test 接口）
 * 直接走 OpenAI provider，不走 streamText，便于精确捕获错误。
 */
export async function testUpstream(opts: {
  baseUrl: string
  apiKey: string
  model: string
}): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const startedAt = Date.now()
  const apiKeyMasked = opts.apiKey
    ? `${opts.apiKey.slice(0, 6)}...${opts.apiKey.slice(-4)}`
    : "(empty)"
  console.log(
    `[ai-service] testUpstream -> baseUrl=${opts.baseUrl} model=${opts.model} apiKey=${apiKeyMasked}`,
  )
  try {
    const provider = createOpenAI({
      baseURL: opts.baseUrl,
      apiKey: opts.apiKey,
      compatibility: "compatible",
    })
    // 用最小化的 streamText 拉一次完成（小 token），等 usage 完成代表全链路 OK
    const result = streamText({
      model: provider(opts.model),
      system: "You are a connectivity test. Respond with the single word: ok",
      messages: [{ role: "user", content: "ping" }],
      maxTokens: 5,
      temperature: 0,
      onError: ({ error }) => {
        const detail = describeError(error)
        console.error(
          `[ai-service] testUpstream streamText onError: ` +
            `status=${detail.status ?? "-"}, msg=${detail.message}, ` +
            `body=${detail.responseBody ?? "-"}`,
        )
      },
    })
    await result.usage
    const latencyMs = Date.now() - startedAt
    console.log(`[ai-service] testUpstream OK: ${latencyMs}ms`)
    return { ok: true, latencyMs }
  } catch (e) {
    const detail = describeError(e)
    const latencyMs = Date.now() - startedAt
    console.error(
      `[ai-service] testUpstream FAILED: ${latencyMs}ms, ` +
        `status=${detail.status ?? "-"}, msg=${detail.message}, ` +
        `body=${detail.responseBody ?? "-"}`,
    )
    return {
      ok: false,
      latencyMs,
      error: detail.responseBody
        ? `${detail.message} | upstream said: ${detail.responseBody.slice(0, 300)}`
        : detail.message,
    }
  }
}
