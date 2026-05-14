/**
 * 附件内存存储
 *
 * 设计：
 * - 单 Map<id, StoredAttachment> 存活在主进程内存
 * - 每分钟扫描一次，删除创建超过 ttl 的
 * - put 时若总字节超过全局上限，抛 StorageFullError
 * - signedToken 用 hex random，put 时生成；get blob 必须传 token 校验
 *
 * 不持久化（重启即失），符合"附件 30 分钟内存 TTL，不入 R2"的隐私要求。
 *
 * 容量限制（从 env 读）：
 * - attachmentTtlSec：默认 1800（30 分钟）
 * - attachmentTotalMb：默认 200（全局总量）
 */

import crypto from "node:crypto"
import { customAlphabet } from "nanoid"
import { env } from "../config/env.js"

const ATT_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789"
const newId = customAlphabet(ATT_ID_ALPHABET, 16)

const TTL_MS = env.ai.attachmentTtlSec * 1000
const TOTAL_LIMIT_BYTES = env.ai.attachmentTotalMb * 1024 * 1024
const SWEEP_INTERVAL_MS = 60_000

export interface StoredAttachment {
  id: string
  buffer: Buffer
  mime: string
  name: string
  size: number
  extractedText: string | null
  charCount: number
  createdAt: number
  expiresAt: number
  signedToken: string
  meta?: { pages?: number; rows?: number; truncated?: boolean; sheetName?: string }
}

export interface AttachmentInputData {
  buffer: Buffer
  mime: string
  name: string
  size: number
  extractedText: string | null
  meta?: { pages?: number; rows?: number; truncated?: boolean; sheetName?: string }
}

export class StorageFullError extends Error {
  public currentBytes: number
  public limitBytes: number
  constructor(currentBytes: number, limitBytes: number) {
    super(
      `Attachment storage full: ${(currentBytes / 1024 / 1024).toFixed(1)}MB used, limit ${(limitBytes / 1024 / 1024).toFixed(0)}MB`,
    )
    this.name = "StorageFullError"
    this.currentBytes = currentBytes
    this.limitBytes = limitBytes
  }
}

class AttachmentStore {
  private items = new Map<string, StoredAttachment>()
  private totalBytes = 0
  private sweepTimer: NodeJS.Timeout | null = null

  constructor() {
    // 启动周期清理（仅生产/开发，不在 build 阶段执行）
    if (process.env.NODE_ENV !== "test") {
      this.startSweeper()
    }
  }

  private startSweeper(): void {
    if (this.sweepTimer) return
    this.sweepTimer = setInterval(() => this.cleanup(), SWEEP_INTERVAL_MS)
    // 不阻塞进程退出
    if (typeof this.sweepTimer.unref === "function") {
      this.sweepTimer.unref()
    }
  }

  /**
   * 存入新附件，返回完整 Stored 记录（含 signedToken）。
   * 超过全局总字节上限时抛 StorageFullError。
   */
  put(data: AttachmentInputData): StoredAttachment {
    // 先清理一遍过期的，再判断容量
    this.cleanup()

    if (this.totalBytes + data.size > TOTAL_LIMIT_BYTES) {
      throw new StorageFullError(this.totalBytes, TOTAL_LIMIT_BYTES)
    }

    const now = Date.now()
    const id = `att_${newId()}`
    const signedToken = crypto.randomBytes(16).toString("hex")
    const item: StoredAttachment = {
      id,
      buffer: data.buffer,
      mime: data.mime,
      name: data.name,
      size: data.size,
      extractedText: data.extractedText,
      charCount: data.extractedText ? data.extractedText.length : 0,
      createdAt: now,
      expiresAt: now + TTL_MS,
      signedToken,
      meta: data.meta,
    }
    this.items.set(id, item)
    this.totalBytes += data.size
    return item
  }

  get(id: string): StoredAttachment | null {
    const item = this.items.get(id)
    if (!item) return null
    if (item.expiresAt <= Date.now()) {
      this.delete(id)
      return null
    }
    return item
  }

  validateToken(id: string, token: string): boolean {
    const item = this.get(id)
    if (!item) return false
    // 长度不一致直接 false（避免 timingSafeEqual 抛异常）
    if (item.signedToken.length !== token.length) return false
    try {
      const a = Buffer.from(item.signedToken, "utf8")
      const b = Buffer.from(token, "utf8")
      return crypto.timingSafeEqual(a, b)
    } catch {
      return false
    }
  }

  delete(id: string): void {
    const item = this.items.get(id)
    if (!item) return
    this.items.delete(id)
    this.totalBytes -= item.size
    if (this.totalBytes < 0) this.totalBytes = 0
  }

  /**
   * 清理过期项，返回清理数量
   */
  cleanup(): number {
    const now = Date.now()
    let removed = 0
    for (const [id, item] of this.items) {
      if (item.expiresAt <= now) {
        this.items.delete(id)
        this.totalBytes -= item.size
        removed++
      }
    }
    if (this.totalBytes < 0) this.totalBytes = 0
    return removed
  }

  getTotalBytes(): number {
    return this.totalBytes
  }

  getCount(): number {
    return this.items.size
  }

  /**
   * 测试用：销毁内部定时器（主进程退出会自动 unref，正常无需调用）
   */
  destroy(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer)
      this.sweepTimer = null
    }
    this.items.clear()
    this.totalBytes = 0
  }
}

export const attachmentStore = new AttachmentStore()
