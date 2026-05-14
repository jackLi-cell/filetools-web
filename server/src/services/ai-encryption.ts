import { createCipheriv, createDecipheriv, randomBytes } from "crypto"
import { env } from "../config/env.js"

/**
 * AES-256-GCM 加解密
 *
 * 用途：加密存储 AI 上游 API Key（数据库 ai_upstreams.api_key_enc）
 * 密钥来源：env.ai.encryptionKey（32 字节 hex = 64 字符）
 * 输出格式：iv:authTag:cipherText（全 hex）
 */

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12 // GCM 推荐 12 字节
const AUTH_TAG_LENGTH = 16

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey
  const hex = env.ai.encryptionKey
  if (!hex) {
    throw new Error("[ai-encryption] AI_ENCRYPTION_KEY is not configured")
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("[ai-encryption] AI_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)")
  }
  cachedKey = Buffer.from(hex, "hex")
  return cachedKey
}

export function encrypt(plain: string): string {
  if (typeof plain !== "string") {
    throw new TypeError("[ai-encryption] encrypt(plain): plain must be a string")
  }
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${enc.toString("hex")}`
}

export function decrypt(encrypted: string): string {
  if (typeof encrypted !== "string") {
    throw new TypeError("[ai-encryption] decrypt(encrypted): encrypted must be a string")
  }
  const parts = encrypted.split(":")
  if (parts.length !== 3) {
    throw new Error("[ai-encryption] Invalid encrypted format, expected iv:authTag:cipherText")
  }
  const [ivHex, authTagHex, cipherHex] = parts
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")
  const cipherBuf = Buffer.from(cipherHex, "hex")
  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("[ai-encryption] Invalid iv or authTag length")
  }
  const key = getKey()
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const dec = Buffer.concat([decipher.update(cipherBuf), decipher.final()])
  return dec.toString("utf8")
}

/**
 * 把 API Key 脱敏成 sk-xxxx****xxxx 形式，用于 admin 列表展示
 */
export function maskApiKey(plain: string): string {
  if (!plain) return ""
  if (plain.length <= 8) return "****"
  return `${plain.slice(0, 4)}****${plain.slice(-4)}`
}
