import { siteConfig } from "@/config/site"

function normalizeBaseUrl(url: string) {
  const trimmed = url.replace(/\/+$/, "")

  try {
    const parsed = new URL(trimmed)
    if (parsed.pathname === "/api") {
      parsed.pathname = ""
      parsed.search = ""
      parsed.hash = ""
      return parsed.toString().replace(/\/+$/, "")
    }
  } catch {}

  return trimmed
}

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

function isLocalHost(host: string) {
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")
}

function deriveApiBaseUrl(siteUrl: string): string | null {
  try {
    const parsed = new URL(siteUrl)
    const host = parsed.hostname.replace(/^www\./, "")

    if (isLocalHost(host)) {
      return null
    }

    const apiHost = host.startsWith("api.") ? host : `api.${host}`
    const port = parsed.port ? `:${parsed.port}` : ""
    return `${parsed.protocol}//${apiHost}${port}`
  } catch {
    return null
  }
}

export function getApiBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_API_URL?.trim()
  const explicitBaseUrl = explicit ? normalizeBaseUrl(explicit) : ""
  const explicitHost = explicitBaseUrl ? getHostname(explicitBaseUrl) : null

  if (explicitBaseUrl && (explicitHost?.startsWith("api.") || isLocalHost(explicitHost || ""))) {
    return explicitBaseUrl
  }

  if (typeof window !== "undefined") {
    const runtimeUrl = deriveApiBaseUrl(window.location.origin)
    if (runtimeUrl) return runtimeUrl
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:4000"
  }

  return deriveApiBaseUrl(siteConfig.url) || "http://localhost:4000"
}
