import { Router, type Request, type Response } from "express"
import { z } from "zod"
import busboy from "busboy"
import { fileTypeFromBuffer } from "file-type"
import sharp from "sharp"
import { softAuth } from "../middleware/auth.js"
import { aiRateLimit, acquireFlowLock, aiAttachRateLimit } from "../middleware/ai-rate-limit.js"
import { streamChat, AllUpstreamsFailedError, isAiEnabled } from "../services/ai-service.js"
import { getUpstreamSnapshot } from "../services/ai-upstream-manager.js"
import { extractText, UnsupportedFileTypeError, ExtractionFailedError } from "../services/file-extractor.js"
import { attachmentStore, StorageFullError, type AttachmentMeta } from "../services/attachment-store.js"
import { env } from "../config/env.js"
import type { CoreMessage } from "ai"

const router = Router()

/**
 * 聊天消息体（兼容 Vercel AI SDK useChat 的 messages 格式）
 */
const messagePartSchema = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("image"), image: z.union([z.string(), z.instanceof(Uint8Array)]) }),
])

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.union([z.string(), z.array(messagePartSchema)]),
})

const chatBodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
  attachmentIds: z.array(z.string().regex(/^att_[a-z0-9]{16}$/)).max(env.ai.maxFilesPerTurn).optional(),
})

/**
 * AI 总开关检查中间件（缓存 30 秒，详见 ai-service.isAiEnabled）
 */
async function checkAiEnabled(_req: Request, res: Response, next: () => void): Promise<void> {
  const enabled = await isAiEnabled()
  if (!enabled) {
    res.status(503).json({
      code: 503,
      message: "AI 助手暂未开放",
    })
    return
  }
  next()
}

/**
 * POST /api/ai/chat
 * 流式聊天，使用 Vercel AI SDK 的 data stream 协议（SSE）
 */
router.post("/chat", softAuth, checkAiEnabled, aiRateLimit, async (req: Request, res: Response) => {
  // 1. 解析 body
  const parsed = chatBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      code: 400,
      message: parsed.error.errors[0]?.message || "参数校验失败",
    })
    return
  }

  // 2. 抢占单 IP 并发锁
  const lock = await acquireFlowLock(req)
  if (!lock.acquired) {
    res.status(429).json({
      code: 429,
      message: "已有正在进行的对话，请等待结束后再发起",
    })
    return
  }

  // 3. 创建 AbortController，绑定客户端关闭事件
  const controller = new AbortController()
  const onClose = () => {
    controller.abort()
  }
  req.on("close", onClose)

  // 释放并发锁的统一清理函数
  let released = false
  const release = async () => {
    if (released) return
    released = true
    req.off("close", onClose)
    await lock.release()
  }

  // 双重保险：无论流式响应如何结束（正常完成 / 客户端关闭 / 错误中断），都释放锁
  // res 'finish' = 响应正常结束；res 'close' = 连接关闭（不论是否完成）
  res.on("finish", () => { void release() })
  res.on("close", () => { void release() })

  try {
    const userId = (req as { userId?: number }).userId

    const result = await streamChat({
      messages: parsed.data.messages as CoreMessage[],
      attachmentIds: parsed.data.attachmentIds,
      abortSignal: controller.signal,
      userId,
    })

    // 流式写出（Vercel AI SDK 4 的 data stream 协议）
    result.pipeDataStreamToResponse(res, {
      headers: {
        "X-Accel-Buffering": "no", // 禁用 nginx 缓冲
        "Cache-Control": "no-cache, no-transform",
      },
    })

    // 等到流真正完成（或 abort）后再释放锁（最早的释放路径）
    result.usage
      .finally(() => {
        void release()
      })
      .catch(() => {
        // 已记录在 ai-service 里，这里只做兜底
      })
  } catch (err) {
    await release()
    if (err instanceof AllUpstreamsFailedError) {
      console.warn("[ai/chat] all upstreams failed:", JSON.stringify(err.attempts))
      if (!res.headersSent) {
        const debugMode = process.env.AI_DEBUG_ERRORS === "true"
        const body: Record<string, unknown> = {
          code: 503,
          message: "AI 助手暂时不可用，请稍后重试",
        }
        if (debugMode) {
          body.attempts = err.attempts
        }
        res.status(503).json(body)
      }
      return
    }
    console.error("[ai/chat] unexpected error:", err)
    if (!res.headersSent) {
      res.status(500).json({ code: 500, message: "服务器内部错误" })
    }
  }
})

/**
 * GET /api/ai/health
 * 上游健康检查（公开端点，不需要鉴权）
 */
router.get("/health", async (_req: Request, res: Response) => {
  try {
    const upstreams = await getUpstreamSnapshot()
    const ok = upstreams.some((u) => u.healthy)
    res.json({ ok, upstreams })
  } catch (err) {
    console.error("[ai/health] error:", err)
    res.json({ ok: false, upstreams: [] })
  }
})

// ─────────────────────────────────────────────────────────────────────
// Phase 3：附件
// ─────────────────────────────────────────────────────────────────────

const MAX_FILE_BYTES = env.ai.maxFileMb * 1024 * 1024
const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])

function isSupportedImageMime(mime: string): boolean {
  return IMAGE_MIMES.has(mime.toLowerCase())
}

function isSupportedImageName(name: string): boolean {
  return /\.(png|jpe?g|webp|gif)$/i.test(name)
}

function normalizeUploadedFileName(name: string | undefined): string {
  const fallback = "unnamed"
  if (!name) return fallback
  const trimmed = name.trim()
  if (!trimmed) return fallback

  try {
    const decoded = Buffer.from(trimmed, "latin1").toString("utf8")
    const hasMojibake = /[ÃÂ¤åæçèéä»�ï¿½]/.test(trimmed)
    if (hasMojibake && decoded && !decoded.includes("\uFFFD")) {
      return decoded
    }
  } catch {
    // keep original
  }

  return trimmed
}

/**
 * POST /api/ai/attach (multipart/form-data)
 *
 * 用 busboy 流式接收**单个文件**字段（field name 任意，取第一个 file 部分）。
 * - 超过单文件 20MB → 413
 * - 不支持类型 → 400
 * - 提取超时/失败 → 500
 * - 全局存储超过 200MB → 503
 *
 * 客户端如需上传多个文件，请连续调用本接口。
 */
router.post("/attach", softAuth, checkAiEnabled, aiAttachRateLimit, (req: Request, res: Response) => {
  // 必须是 multipart
  const contentType = req.headers["content-type"] || ""
  if (!contentType.includes("multipart/form-data")) {
    res.status(400).json({ code: 400, message: "请使用 multipart/form-data 上传" })
    return
  }

  let bb: ReturnType<typeof busboy>
  try {
    bb = busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fileSize: MAX_FILE_BYTES,
        fields: 0,
      },
    })
  } catch (e) {
    res.status(400).json({
      code: 400,
      message: `请求头解析失败: ${e instanceof Error ? e.message : String(e)}`,
    })
    return
  }

  let responded = false
  const sendError = (status: number, message: string) => {
    if (responded) return
    responded = true
    try {
      req.unpipe(bb)
    } catch {
      // ignore
    }
    if (!res.headersSent) {
      res.status(status).json({ code: status, message })
    }
  }

  let fileHandled = false

  bb.on("file", (_name, stream, info) => {
    if (fileHandled) {
      // 多余的文件直接丢弃
      stream.resume()
      return
    }
    fileHandled = true

    const chunks: Buffer[] = []
    let total = 0
    let limitHit = false

    stream.on("data", (chunk: Buffer) => {
      if (limitHit) return
      total += chunk.length
      if (total > MAX_FILE_BYTES) {
        limitHit = true
        // busboy 会在 fileSize 限制后自动 emit "limit"，但我们提早 destroy 防止内存堆积
        try {
          stream.destroy()
        } catch {
          /* ignore */
        }
        return
      }
      chunks.push(chunk)
    })

    stream.on("limit", () => {
      limitHit = true
      sendError(413, `文件超过 ${env.ai.maxFileMb}MB 上限`)
      try {
        stream.destroy()
      } catch {
        /* ignore */
      }
    })

    stream.on("error", (err) => {
      sendError(500, `读取上传流失败: ${err instanceof Error ? err.message : String(err)}`)
    })

    stream.on("end", async () => {
      if (limitHit || responded) return
      const buffer = Buffer.concat(chunks, total)
      const fileName = normalizeUploadedFileName(info.filename)
      try {
        const detected = await fileTypeFromBuffer(buffer)
        const uploadedMime = info.mimeType || "application/octet-stream"
        const finalMime =
          detected?.mime && (isSupportedImageMime(detected.mime) || uploadedMime === "application/octet-stream")
            ? detected.mime
            : uploadedMime

        let extracted: { text: string; meta: AttachmentMeta }
        if (isSupportedImageMime(finalMime) || isSupportedImageName(fileName)) {
          if (!detected?.mime || !isSupportedImageMime(detected.mime)) {
            sendError(400, "图片文件格式校验失败，请上传 PNG、JPG、WebP 或 GIF")
            return
          }
          const meta = await sharp(buffer, { animated: detected.mime === "image/gif" }).metadata()
          extracted = {
            text: "",
            meta: {
              kind: "image",
              width: meta.width,
              height: meta.height,
              format: meta.format,
              animated: Boolean(meta.pages && meta.pages > 1),
            },
          }
        } else {
          extracted = await extractText(buffer, finalMime, fileName)
        }
        let stored
        try {
          stored = attachmentStore.put({
            buffer,
            mime: finalMime,
            name: fileName,
            size: total,
            extractedText: extracted.text,
            meta: extracted.meta,
          })
        } catch (storeErr) {
          if (storeErr instanceof StorageFullError) {
            sendError(503, "附件存储已满，请稍后再试")
            return
          }
          throw storeErr
        }
        if (responded) return
        responded = true
        res.status(200).json({
          attachmentId: stored.id,
          id: stored.id,
          name: stored.name,
          size: stored.size,
          mime: stored.mime,
          charCount: stored.charCount,
          signedToken: stored.signedToken,
          expiresAt: stored.expiresAt,
          meta: stored.meta ?? null,
        })
      } catch (err) {
        if (err instanceof UnsupportedFileTypeError) {
          sendError(400, `不支持的文件类型：${err.mime || err.fileName}`)
          return
        }
        if (err instanceof ExtractionFailedError) {
          console.warn("[ai/attach] extract failed:", err.message)
          sendError(500, "文件解析失败，请尝试其他文件或换格式")
          return
        }
        console.error("[ai/attach] unexpected error:", err)
        sendError(500, "上传处理失败")
      }
    })
  })

  bb.on("filesLimit", () => {
    sendError(400, "只支持单次上传一个文件")
  })

  bb.on("error", (err) => {
    sendError(500, `上传解析失败: ${err instanceof Error ? err.message : String(err)}`)
  })

  // 客户端中途断开
  req.on("aborted", () => {
    if (!responded) {
      responded = true
      try {
        req.unpipe(bb)
      } catch {
        /* ignore */
      }
    }
  })

  req.pipe(bb)
})

/**
 * GET /api/ai/attach/:id
 * 返回元信息（无 buffer / 无 token），软鉴权。
 */
router.get("/attach/:id", softAuth, (req: Request, res: Response) => {
  const id = req.params.id as string | undefined
  if (!id) {
    res.status(400).json({ code: 400, message: "缺少 id" })
    return
  }
  const item = attachmentStore.get(id)
  if (!item) {
    res.status(404).json({ code: 404, message: "附件不存在或已过期" })
    return
  }
  res.json({
    id: item.id,
    name: item.name,
    size: item.size,
    mime: item.mime,
    charCount: item.charCount,
    expiresAt: item.expiresAt,
    meta: item.meta ?? null,
  })
})

/**
 * GET /api/ai/attach/:id/blob?token=xxx
 * 凭 token 拉取原始 buffer，供工具页面预填使用。
 */
router.get("/attach/:id/blob", (req: Request, res: Response) => {
  const id = req.params.id as string | undefined
  const token = (req.query.token as string | undefined) || ""
  if (!id) {
    res.status(400).json({ code: 400, message: "缺少 id" })
    return
  }
  if (!token) {
    res.status(400).json({ code: 400, message: "缺少 token" })
    return
  }
  const item = attachmentStore.get(id)
  if (!item) {
    res.status(404).json({ code: 404, message: "附件不存在或已过期" })
    return
  }
  if (!attachmentStore.validateToken(id, token)) {
    res.status(403).json({ code: 403, message: "token 不匹配" })
    return
  }
  res.setHeader("Content-Type", item.mime || "application/octet-stream")
  res.setHeader("Content-Length", String(item.buffer.byteLength))
  // 用 RFC 5987 编码 filename 防止中文等被截断
  const encoded = encodeURIComponent(item.name)
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${item.name.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encoded}`,
  )
  res.setHeader("Cache-Control", "no-store")
  res.end(item.buffer)
})

export default router
