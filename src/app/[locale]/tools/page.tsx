import Link from "next/link"
import { Metadata } from "next"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { categories } from "@/config/tools"
import { fetchTools } from "@/lib/tools-service"
import { siteConfig } from "@/config/site"
import { getDictionary } from "@/i18n/get-dictionary"
import type { Locale } from "@/i18n/config"

export const dynamic = "force-dynamic"
export const runtime = "edge"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const dict = await getDictionary(locale as Locale)
  return {
    title: `${dict.tools.allTools} - 50+ ${dict.tools.allToolsDesc}`,
    description: dict.tools.allToolsDesc,
    alternates: {
      canonical: `${siteConfig.url}/${locale}/tools`,
    },
  }
}

export default async function AllToolsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const dict = await getDictionary(locale as Locale)
  const v01Tools = await fetchTools()
  const prefix = `/${locale}`

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{dict.tools.allTools}</h1>
        <p className="text-sm text-gray-500">{dict.tools.totalTools.replace("{count}", String(v01Tools.length))}</p>
      </div>

      {categories.map(cat => {
        const catTools = v01Tools.filter(t => t.category === cat.slug)
        if (catTools.length === 0) return null
        return (
          <section key={cat.slug} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{cat.icon}</span>
              <h2 className="text-base font-semibold text-gray-900">
                {dict.categories[cat.slug as keyof typeof dict.categories]?.name || cat.name}
              </h2>
              <span className="text-xs text-gray-400">({catTools.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catTools.map(tool => (
                <Link key={tool.slug} href={`${prefix}/tools/${tool.category}/${tool.slug}`}>
                  <Card className="h-full p-4 hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex items-start justify-between mb-1.5">
                      <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">{tool.name}</h3>
                      {tool.isFree
                        ? <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200 flex-shrink-0">{dict.tools.free}</Badge>
                        : <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200 flex-shrink-0">{dict.tools.credits.replace("{count}", String(tool.creditsCost))}</Badge>}
                    </div>
                    <p className="text-xs text-gray-500">{tool.description}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
