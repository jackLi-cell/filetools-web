import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { i18n, type Locale } from "@/i18n/config"
import { getDictionary } from "@/i18n/get-dictionary"
import { AppShell } from "@/components/layout/app-shell"
import { AuthProvider } from "@/lib/auth-context"
import { HtmlLangSetter } from "@/components/html-lang-setter"
import { getSiteUrlFromCurrentHeaders, localizedSeoFromHeaders } from "@/lib/seo"

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = await getDictionary(locale as Locale)
  const baseUrl = await getSiteUrlFromCurrentHeaders()
  const seo = await localizedSeoFromHeaders(locale, "/")

  return {
    title: {
      default: dict.site.title,
      template: `%s | ${dict.site.name}`,
    },
    description: dict.site.description,
    keywords: dict.site.keywords,
    metadataBase: new URL(baseUrl),
    openGraph: {
      title: dict.site.title,
      description: dict.site.description,
      url: seo.canonical,
      siteName: dict.site.name,
      locale: locale,
      type: "website",
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: seo.canonical,
      languages: seo.languages,
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!i18n.locales.includes(locale as Locale)) {
    notFound()
  }

  const dict = await getDictionary(locale as Locale)

  return (
    <AuthProvider>
      <HtmlLangSetter locale={locale} />
      <AppShell locale={locale} dict={dict}>
        {children}
      </AppShell>
    </AuthProvider>
  )
}
