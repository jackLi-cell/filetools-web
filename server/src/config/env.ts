function required(key: string, fallback?: string): string {
  const value = process.env[key]
  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback
    if (process.env.NODE_ENV === "production") {
      throw new Error(`[env] Missing required environment variable: ${key}`)
    }
    return ""
  }
  return value
}

const DEFAULT_AI_SYSTEM_PROMPT = `你是"灵猫助手"，一个专为本工具站用户提供文件处理建议与文档问答的 AI 助手。

服务边界（请严格遵守）：
1. 用户的目标是处理文件（PDF / 图片 / Excel / Word 等）。当用户没有上传任何文件、也没有具体的文件处理意图时，请礼貌地引导用户上传文件或描述具体需求，不要展开做通用聊天/翻译/写作等任务。
2. 如果用户的请求显然对应站内某个工具（压缩、合并、转换、加密等），请简洁说明应该使用哪个工具，并把用户引导到具体工具页面，而不要尝试自己执行。
3. 如果用户上传了文件并提出问答/总结/数据分析，正常回答即可。
4. 回答风格：中文为主，简洁、结构化、可执行。避免冗长前言。

当前你只能进行纯对话，不具备文件读取、工具调用、联网等能力（这些将由后续阶段开放）。`

export const env = {
  port: Number(process.env.PORT) || 4000,
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  sessionSecret: process.env.SESSION_SECRET || "dev-secret",
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucketName: process.env.R2_BUCKET_NAME || "filetools",
    publicUrl: process.env.R2_PUBLIC_URL || "",
  },
  ai: {
    encryptionKey: required("AI_ENCRYPTION_KEY"),
    systemPromptDefault: process.env.AI_SYSTEM_PROMPT || DEFAULT_AI_SYSTEM_PROMPT,
    maxOutputTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS || 1500),
    maxInputTokens: Number(process.env.AI_MAX_INPUT_TOKENS || 6000),
    maxContextChars: Number(process.env.AI_MAX_CONTEXT_CHARS || 24000),
    maxFileMb: Number(process.env.AI_MAX_FILE_MB || 20),
    maxTotalMb: Number(process.env.AI_MAX_TOTAL_MB || 30),
    maxFilesPerTurn: Number(process.env.AI_MAX_FILES_PER_TURN || 5),
    attachmentTtlSec: Number(process.env.AI_ATTACHMENT_TTL_SECONDS || 1800),
    attachmentTotalMb: Number(process.env.AI_ATTACHMENT_TOTAL_MB || 200),
    rateLimitAnonPerMinute: Number(process.env.AI_RATE_LIMIT_ANON_PER_MINUTE || 10),
    rateLimitAuthPerMinute: Number(process.env.AI_RATE_LIMIT_AUTH_PER_MINUTE || 20),
    anonDailyFree: Number(process.env.AI_ANON_DAILY_FREE || 20),
    authDailyFree: Number(process.env.AI_AUTH_DAILY_FREE || 100),
    upstreamFailThreshold: Number(process.env.AI_UPSTREAM_FAIL_THRESHOLD || 3),
    upstreamCooldownMs: Number(process.env.AI_UPSTREAM_COOLDOWN_MS || 600000),
    // Phase 1 stub fallback：从环境变量读单上游
    legacyApiKey: process.env.AI_API_KEY || "",
    legacyBaseUrl: process.env.AI_BASE_URL || "",
    legacyModel: process.env.AI_MODEL || "gpt-4o-mini",
  },
} as const
