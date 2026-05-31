import { i18n } from "@/i18n/config"

function normalizePathname(pathname: string | null | undefined): string {
  const clean = (pathname || "/").split(/[?#]/)[0] || "/"
  const withSlash = clean.startsWith("/") ? clean : `/${clean}`
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash
}

export function getLocalePath(pathname: string | null | undefined) {
  const normalized = normalizePathname(pathname)
  const segments = normalized.split("/")
  const maybeLocale = segments[1]
  const hasLocale = i18n.locales.includes(maybeLocale as (typeof i18n.locales)[number])
  const locale = hasLocale ? maybeLocale : i18n.defaultLocale
  const pathWithoutLocale = hasLocale ? normalizePathname(`/${segments.slice(2).join("/")}`) : normalized

  return {
    locale,
    localePrefix: `/${locale}`,
    pathWithoutLocale,
  }
}

export function localizePath(pathname: string, locale: string): string {
  const { pathWithoutLocale } = getLocalePath(pathname)
  return pathWithoutLocale === "/" ? `/${locale}` : `/${locale}${pathWithoutLocale}`
}

export function normalizeAdminNextPath(next: string | null | undefined, locale: string): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null

  const { pathWithoutLocale } = getLocalePath(next)
  if (!pathWithoutLocale.startsWith("/admin")) return null
  if (pathWithoutLocale === "/admin/login") return null

  return localizePath(pathWithoutLocale, locale)
}
