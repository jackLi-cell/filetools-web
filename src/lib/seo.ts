import { headers } from "next/headers"
import { siteConfig } from "@/config/site"
import { i18n, type Locale } from "@/i18n/config"

const PUBLIC_HOSTS = new Set([
  "cattools.jtlcook.com",
  "cattools.jtlcookie.com",
])

type HeaderLike = {
  get(name: string): string | null
}

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, "")
}

export function getSiteUrl() {
  return normalizeOrigin(siteConfig.url)
}

export function getSiteUrlFromHeaders(headersList: HeaderLike) {
  const forwardedHost = headersList.get("x-forwarded-host") || headersList.get("host")
  const host = forwardedHost?.split(",")[0]?.trim()

  if (!host) return getSiteUrl()

  const hostname = host.split(":")[0]
  const forwardedProto = headersList.get("x-forwarded-proto")?.split(",")[0]?.trim()
  const proto = forwardedProto || (PUBLIC_HOSTS.has(hostname) ? "https" : "http")

  return normalizeOrigin(`${proto}://${host}`)
}

export function getSiteUrlFromRequest(request: Request) {
  return getSiteUrlFromHeaders(request.headers)
}

export async function getSiteUrlFromCurrentHeaders() {
  const headersList = await headers()
  return getSiteUrlFromHeaders(headersList)
}

export function getLocaleFromPath(pathname = ""): Locale {
  const locale = i18n.locales.find(
    (item) => pathname === `/${item}` || pathname.startsWith(`/${item}/`)
  )

  return locale || i18n.defaultLocale
}

export function stripLocale(path = "/") {
  const cleanPath = path.split("?")[0].replace(/\/+$/, "") || "/"
  const locale = i18n.locales.find(
    (item) => cleanPath === `/${item}` || cleanPath.startsWith(`/${item}/`)
  )

  return locale ? cleanPath.replace(`/${locale}`, "") || "/" : cleanPath
}

export function localizedPath(locale: Locale | string, path = "/") {
  const cleanPath = stripLocale(path)
  return cleanPath === "/" ? `/${locale}` : `/${locale}${cleanPath}`
}

export function absoluteUrl(path = "/", baseUrl = getSiteUrl()) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`
  return `${normalizeOrigin(baseUrl)}${cleanPath}`
}

export function localizedUrl(locale: Locale | string, path = "/", baseUrl = getSiteUrl()) {
  return absoluteUrl(localizedPath(locale, path), baseUrl)
}

export function languageAlternates(path = "/", baseUrl = getSiteUrl()) {
  return {
    "zh-CN": localizedUrl("zh-CN", path, baseUrl),
    en: localizedUrl("en", path, baseUrl),
    "x-default": localizedUrl("zh-CN", path, baseUrl),
  }
}

export function localizedSeo(locale: Locale | string, path = "/", baseUrl = getSiteUrl()) {
  return {
    canonical: localizedUrl(locale, path, baseUrl),
    languages: languageAlternates(path, baseUrl),
  }
}

export async function localizedSeoFromHeaders(locale: Locale | string, path = "/") {
  return localizedSeo(locale, path, await getSiteUrlFromCurrentHeaders())
}
