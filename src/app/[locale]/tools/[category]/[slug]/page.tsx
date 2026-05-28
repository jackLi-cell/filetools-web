import Link from "next/link"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { getCategoryBySlug } from "@/config/tools"
import { ToolRenderer } from "@/components/tools/tool-renderer"
import { ToolDisclaimer } from "@/components/tool-disclaimer"
import { fetchTools, getStaticToolBySlug, getToolBySlug } from "@/lib/tools-service"
import { getDictionary } from "@/i18n/get-dictionary"
import type { Locale } from "@/i18n/config"
import { localizedSeoFromHeaders, localizedUrl, getSiteUrlFromCurrentHeaders } from "@/lib/seo"
import { getLocalizedToolSeo, localizeTool, localizeTools } from "@/lib/localized-tools"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ locale: string; category: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params
  const tool = await getToolBySlug(slug) || getStaticToolBySlug(slug)

  if (!tool) return {}

  const localizedTool = localizeTool(tool, locale)
  const seo = getLocalizedToolSeo(slug, locale, tool)
  const title = seo?.title || `${localizedTool.name} - ${localizedTool.description}`
  const description = seo?.description || localizedTool.description
  const pageSeo = await localizedSeoFromHeaders(locale, `/tools/${tool.category}/${tool.slug}`)

  return {
    title,
    description,
    keywords: seo?.keywords?.join(","),
    alternates: {
      canonical: pageSeo.canonical,
      languages: pageSeo.languages,
    },
    openGraph: {
      title,
      description,
      url: pageSeo.canonical,
      type: "website",
    },
  }
}

export default async function ToolPage({ params }: { params: Promise<{ locale: string; category: string; slug: string }> }) {
  const { locale, category: categorySlug, slug } = await params
  const dict = await getDictionary(locale as Locale)
  const baseUrl = await getSiteUrlFromCurrentHeaders()
  const rawTool = await getToolBySlug(slug)
  const tool = rawTool ? localizeTool(rawTool, locale) : undefined
  const category = getCategoryBySlug(categorySlug)
  const seo = rawTool ? getLocalizedToolSeo(slug, locale, rawTool) : undefined
  const prefix = `/${locale}`

  if (!tool || !category) notFound()

  const allTools = localizeTools(await fetchTools(), locale)
  const relatedTools = allTools
    .filter(t => t.category === tool.category && t.slug !== tool.slug && t.version === "v0.1")
    .slice(0, 4)

  const catDict = dict.categories[categorySlug as keyof typeof dict.categories]
  const catName = catDict?.name || category.name

  const faqSchema = seo?.faq && seo.faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": seo.faq.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a },
    })),
  } : null

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": dict.breadcrumb.home,
        "item": localizedUrl(locale, "/", baseUrl),
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": catName,
        "item": localizedUrl(locale, `/tools/${category.slug}`, baseUrl),
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": seo?.h1 || tool.name,
        "item": localizedUrl(locale, `/tools/${tool.category}/${tool.slug}`, baseUrl),
      },
    ],
  }

  const toolSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": seo?.h1 || tool.name,
    "description": seo?.description || tool.description,
    "url": localizedUrl(locale, `/tools/${tool.category}/${tool.slug}`, baseUrl),
    "applicationCategory": "UtilityApplication",
    "operatingSystem": "Web",
    "offers": tool.isFree ? { "@type": "Offer", "price": "0", "priceCurrency": "CNY" } : undefined,
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      {/* 结构化数据 */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toolSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href={prefix} className="hover:text-gray-700">{dict.breadcrumb.home}</Link>
        <span>/</span>
        <Link href={`${prefix}/tools/${category.slug}`} className="hover:text-gray-700">{catName}</Link>
        <span>/</span>
        <span className="text-gray-900">{tool.name}</span>
      </div>

      {/* 工具标题 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{seo?.h1 || tool.name}</h1>
          {tool.isFree ? (
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">{dict.tools.free}</Badge>
          ) : (
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">{dict.tools.creditsPerUse.replace("{count}", String(tool.creditsCost))}</Badge>
          )}
          {tool.isLocal && (
            <Badge variant="outline" className="text-gray-500">{dict.tools.local}</Badge>
          )}
        </div>
        <p className="text-sm text-gray-600">{seo?.intro || tool.description}</p>
      </div>

      {/* 工具操作区 */}
      <Card className="p-6 mb-4">
        <ToolRenderer slug={tool.slug} />
      </Card>

      {/* 高风险工具免责声明 */}
      {tool.slug.includes("signature") && <div className="mb-8"><ToolDisclaimer type="signature" /></div>}
      {tool.slug.includes("ocr") && <div className="mb-8"><ToolDisclaimer type="ocr" /></div>}
      {(tool.slug.includes("steganography") || tool.slug.includes("exif")) && <div className="mb-8"><ToolDisclaimer type="privacy" /></div>}

      {/* 使用说明 */}
      <div className="mb-8">
        <h2 className="text-base font-medium text-gray-900 mb-3">{dict.tools.instructions}</h2>
        <div className="text-sm text-gray-600 space-y-2">
          {(seo?.steps && seo.steps.length > 0 ? seo.steps :
            (tool.isLocal ? dict.tools.defaultSteps : dict.tools.defaultStepsServer)
          ).map((step: string, index: number) => (
            <p key={step}>{index + 1}. {step}</p>
          ))}
          <p className={`${tool.isLocal ? "text-green-700 bg-green-50" : "text-blue-700 bg-blue-50"} px-3 py-2 rounded text-xs mt-3`}>
            {tool.isLocal ? dict.tools.localNote : dict.tools.serverNote}
          </p>
        </div>
      </div>

      {seo?.scenarios && seo.scenarios.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-medium text-gray-900 mb-3">{dict.tools.scenarios}</h2>
          <ul className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
            {seo.scenarios.map((scenario) => (
              <li key={scenario} className="rounded border border-gray-200 px-3 py-2">
                {scenario}
              </li>
            ))}
          </ul>
        </div>
      )}

      {seo?.notes && seo.notes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-medium text-gray-900 mb-3">{dict.tools.notes}</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-gray-600">
            {seo.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 相关工具 */}
      {relatedTools.length > 0 && (
        <div>
          <h2 className="text-base font-medium text-gray-900 mb-3">{dict.tools.relatedTools}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {relatedTools.map((rt) => (
              <Link key={rt.slug} href={`${prefix}/tools/${rt.category}/${rt.slug}`}>
                <Card className="p-3 hover:shadow-sm transition-shadow cursor-pointer">
                  <p className="text-sm font-medium text-gray-900">{rt.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{rt.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      {seo?.faq && seo.faq.length > 0 && (
        <div className="mt-8">
          <h2 className="text-base font-medium text-gray-900 mb-4">{dict.tools.faq}</h2>
          <div className="space-y-4">
            {seo.faq.map((item, i) => (
              <div key={i} className="border-b pb-4 last:border-0">
                <h3 className="text-sm font-medium text-gray-900 mb-2">{item.q}</h3>
                <p className="text-sm text-gray-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
