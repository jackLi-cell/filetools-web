"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { i18n } from "@/i18n/config"
import type { Dictionary } from "@/i18n/get-dictionary"

interface LanguageSwitcherProps {
  locale: string
  dict: Dictionary
}

export function LanguageSwitcher({ locale, dict }: LanguageSwitcherProps) {
  const pathname = usePathname()

  function getLocalePath(targetLocale: string) {
    // Replace current locale in path with target locale
    const segments = pathname.split("/")
    if (segments[1] && i18n.locales.includes(segments[1] as typeof i18n.locales[number])) {
      segments[1] = targetLocale
    }
    return segments.join("/")
  }

  const otherLocale = locale === "zh-CN" ? "en" : "zh-CN"
  const otherLabel = dict.langSwitcher[otherLocale as keyof typeof dict.langSwitcher]

  return (
    <Link
      href={getLocalePath(otherLocale)}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      title={dict.langSwitcher.label}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{otherLabel}</span>
    </Link>
  )
}
