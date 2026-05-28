import Link from "next/link"
import { Metadata } from "next"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { categories } from "@/config/tools"
import { AiHero } from "@/components/ai/ai-hero"
import { fetchTools } from "@/lib/tools-service"
import { getDictionary } from "@/i18n/get-dictionary"
import type { Locale } from "@/i18n/config"
import { localizedSeoFromHeaders } from "@/lib/seo"
import { localizeTools } from "@/lib/localized-tools"

export const dynamic = "force-dynamic"
export const runtime = "edge"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const seo = await localizedSeoFromHeaders(locale, "/")
  return {
    alternates: {
      canonical: seo.canonical,
      languages: seo.languages,
    },
  }
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const dict = await getDictionary(locale as Locale)
  const popularTools = localizeTools((await fetchTools()).slice(0, 8), locale)
  const prefix = `/${locale}`

  return (
    <div className="home-page flex flex-col" data-page="home">
      <section className="home-ai-shell border-b bg-gradient-to-b from-blue-50/50 to-white py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="ai-landing-copy text-center mb-8 md:mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {dict.home.heroTitle}
            </h1>
            <p className="text-base text-gray-600 max-w-xl mx-auto">
              {dict.home.heroDesc}
            </p>
          </div>
          <AiHero />
        </div>
      </section>

      <section className="home-after-ai py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{dict.home.categories}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`${prefix}/tools/${cat.slug}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-gray-200">
                  <CardHeader className="p-4">
                    <div className="text-2xl mb-2">{cat.icon}</div>
                    <CardTitle className="text-sm font-medium">
                      {dict.categories[cat.slug as keyof typeof dict.categories]?.name || cat.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {dict.categories[cat.slug as keyof typeof dict.categories]?.description || cat.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-after-ai py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{dict.home.popular}</h2>
            <Link href={`${prefix}/tools`} className="text-sm text-blue-600 hover:text-blue-700">
              {dict.home.viewAll}
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularTools.map((tool) => (
              <Link key={tool.slug} href={`${prefix}/tools/${tool.category}/${tool.slug}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <CardTitle className="text-sm font-medium">{tool.name}</CardTitle>
                      {tool.isFree && (
                        <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                          {dict.home.free}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs">{tool.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-after-ai py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">{dict.home.privacyTitle}</h3>
              <p className="text-xs text-gray-500">{dict.home.privacyDesc}</p>
            </div>
            <div className="text-center p-6">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">{dict.home.instantTitle}</h3>
              <p className="text-xs text-gray-500">{dict.home.instantDesc}</p>
            </div>
            <div className="text-center p-6">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">{dict.home.freeTitle}</h3>
              <p className="text-xs text-gray-500">{dict.home.freeDesc}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
