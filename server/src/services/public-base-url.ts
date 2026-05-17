import { lookup } from "node:dns/promises"

function isBlockedPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "")
  if (host === "localhost" || host.endsWith(".localhost")) return true
  if (host === "metadata.google.internal") return true
  if (host === "169.254.169.254") return true

  if (host.startsWith("::ffff:")) {
    return isBlockedPrivateHost(host.slice("::ffff:".length))
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const parts = host.split(".").map(Number)
    if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true
    const [a, b] = parts
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true
  }

  if (host === "::1") return true
  if (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return true
  return false
}

export async function validatePublicBaseUrl(value: string | undefined): Promise<string | null> {
  if (!value) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return "Base URL 格式无效"
  }
  if (url.protocol !== "https:") return "Base URL 必须使用 https"
  if (url.username || url.password) return "Base URL 不能包含用户名或密码"
  if (isBlockedPrivateHost(url.hostname)) return "Base URL 不能指向本机、内网或云元数据地址"

  try {
    const resolved = await lookup(url.hostname, { all: true, verbatim: true })
    if (resolved.some((entry) => isBlockedPrivateHost(entry.address))) {
      return "Base URL 解析到了本机、内网或云元数据地址"
    }
  } catch {
    return "Base URL 域名解析失败"
  }

  return null
}
