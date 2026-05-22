import { siteConfig } from "@/config/site"

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "")
}

function deriveApiBaseUrl(siteUrl: string): string | null {
  try {
    const parsed = new URL(siteUrl)
    const host = parsed.hostname.replace(/^www\./, "")

    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local")
    ) {
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
  const explicitRuntimeUrl = explicitBaseUrl ? deriveApiBaseUrl(explicitBaseUrl) : null
  if (explicitBaseUrl && (process.env.NODE_ENV !== "production" || explicitRuntimeUrl)) {
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
