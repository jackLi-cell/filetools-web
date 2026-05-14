// AI prefill / attachment helpers for sharing files between AI conversation and tool pages.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
const PREFILL_KEY = "ai-prefill"

export interface PrefillPayload {
  /** Tool slug, e.g. "image-compress" */
  slug: string
  /** Optional attachment id from /api/ai/attach */
  attachmentId?: string
  /** Signed token allowing one-time blob fetch */
  signedToken?: string
  /** Pre-fill parameters for the tool (free-form, mapped to tool's params) */
  params?: Record<string, unknown>
  /** Epoch ms after which this prefill is considered stale */
  expiresAt: number
  /** Optional original file name shown to user */
  fileName?: string
}

export function prefillToolSession(payload: PrefillPayload): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify(payload))
  } catch {
    // sessionStorage may be unavailable (private mode); ignore silently
  }
}

export function consumePrefill(slug: string): PrefillPayload | null {
  if (typeof window === "undefined") return null
  let raw: string | null = null
  try {
    raw = sessionStorage.getItem(PREFILL_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PrefillPayload
    if (!parsed || parsed.slug !== slug) return null
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt < Date.now()) {
      sessionStorage.removeItem(PREFILL_KEY)
      return null
    }
    sessionStorage.removeItem(PREFILL_KEY)
    return parsed
  } catch {
    return null
  }
}

export function peekPrefill(slug: string): PrefillPayload | null {
  if (typeof window === "undefined") return null
  let raw: string | null = null
  try {
    raw = sessionStorage.getItem(PREFILL_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PrefillPayload
    if (!parsed || parsed.slug !== slug) return null
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt < Date.now()) return null
    return parsed
  } catch {
    return null
  }
}

export interface FetchedAttachment {
  blob: Blob
  name: string
}

export async function fetchAttachmentBlob(
  id: string,
  token: string
): Promise<FetchedAttachment> {
  const url = `${API_URL}/api/ai/attach/${encodeURIComponent(id)}/blob?token=${encodeURIComponent(token)}`
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) {
    let detail = ""
    try {
      detail = await res.text()
    } catch {
      // ignore
    }
    throw new Error(`Fetch attachment failed: ${res.status}${detail ? ` ${detail}` : ""}`)
  }
  const blob = await res.blob()
  const cd = res.headers.get("content-disposition") || ""
  let name = "file"
  const match = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  if (match) {
    try {
      name = decodeURIComponent(match[1])
    } catch {
      name = match[1]
    }
  }
  return { blob, name }
}
