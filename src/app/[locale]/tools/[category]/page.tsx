import Link from "next/link"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { categories } from "@/config/tools"
import { getToolsByCategory } from "@/lib/tools-service"
import { getDictionary } from "@/i18n/get-dictionary"
import type { Locale } from "@/i18n/config"
import { localizedSeoFromHeaders } from "@/lib/seo"
import { localizeTools } from "@/lib/localized-tools"

export const dynamic = "force-dynamic"
export const runtime = "edge"

export async function generateMetadata({ params }: { params: Promise<{ locale: string; category: string }> }): Promise<Metadata> {
  const { locale, category: categorySlug } = await params
  const dict = await getDictionary(locale as Locale)
  const category = categories.find(c => c.slug === categorySlug)
  if (!category) return {}

  const catDict = dict.categories[categorySlug as keyof typeof dict.categories]
  const catName = catDict?.name || category.name
  const catDesc = catDict?.description || category.description
  const seo = await localizedSeoFromHeaders(locale, `/tools/${category.slug}`)

  return {
    title: `${catName} - ${catDesc} | ${dict.site.name}`,
    description: `${catName}: ${catDesc}`,
    alternates: {
      canonical: seo.canonical,
      languages: seo.languages,
    },
    openGraph: {
      title: `${catName} - ${catDesc} | ${dict.site.name}`,
      description: `${catName}: ${catDesc}`,
      url: seo.canonical,
      type: "website",
    },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ locale: string; category: string }> }) {
  const { locale, category: categorySlug } = await params
  const dict = await getDictionary(locale as Locale)
  const category = categories.find(c => c.slug === categorySlug)
  if (!category) notFound()

  const categoryTools = localizeTools(await getToolsByCategory(categorySlug), locale)
  const prefix = `/${locale}`
  const catDict = dict.categories[categorySlug as keyof typeof dict.categories]
  const catName = catDict?.name || category.name
  const catDesc = catDict?.description || category.description

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href={prefix} className="hover:text-gray-700">{dict.breadcrumb.home}</Link>
          <span>/</span>
          <span className="text-gray-900">{catName}</span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{category.icon}</span>
          <h1 className="text-2xl font-bold text-gray-900">{catName}</h1>
        </div>
        <p className="text-sm text-gray-600">{catDesc} - {dict.tools.toolsAvailable.replace("{count}", String(categoryTools.length))}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryTools.map((tool) => (
          <Link key={tool.slug} href={`${prefix}/tools/${categorySlug}/${tool.slug}`}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-base font-medium group-hover:text-blue-600 transition-colors">
                    {tool.name}
                  </CardTitle>
                  <div className="flex gap-1.5">
                    {tool.isFree ? (
                      <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                        {dict.tools.free}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {dict.tools.credits.replace("{count}", String(tool.creditsCost))}
                      </Badge>
                    )}
                    {tool.isLocal && (
                      <Badge variant="outline" className="text-xs text-gray-500">
                        {dict.tools.local}
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="text-sm text-gray-500">
                  {tool.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {categoryTools.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm">{dict.tools.comingSoon}</p>
        </div>
      )}
    </div>
  )
}
