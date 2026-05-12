import { Request, Response, NextFunction } from "express"

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || ""
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export async function verifyTurnstile(req: Request, res: Response, next: NextFunction) {
  if (!TURNSTILE_SECRET) {
    next()
    return
  }

  const token = req.body?.turnstileToken || req.headers["x-turnstile-token"]
  if (!token) {
    res.status(400).json({ code: 400, message: "请完成人机验证" })
    return
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET,
        response: token as string,
        remoteip: (req.ip || "") as string,
      }),
    })

    const data = await response.json() as { success: boolean }
    if (!data.success) {
      res.status(403).json({ code: 403, message: "人机验证失败，请重试" })
      return
    }
  } catch {
    // Turnstile 服务不可用时放行，不阻断用户
    console.error("[Turnstile] Verification service unavailable, allowing request")
  }

  next()
}
