import Link from "next/link"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { tools, getToolBySlug, getCategoryBySlug } from "@/config/tools"
import { getToolSeo } from "@/config/seo"
import { siteConfig } from "@/config/site"
import { ToolRenderer } from "@/components/tools/tool-renderer"

export const runtime = "edge"

export async function generateMetadata({ params }: { params: Promise<{ category: string; slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const tool = getToolBySlug(slug)
  const seo = getToolSeo(slug)

  if (!tool) return {}

  const title = seo?.title || `${tool.name} - 在线${tool.description}`
  const description = seo?.description || `免费在线${tool.name}工具：${tool.description}。灵猫转换提供便捷的在线文件处理服务。`

  return {
    title,
    description,
    keywords: seo?.keywords?.join(","),
    openGraph: {
      title,
      description,
      url: `${siteConfig.url}/tools/${tool.category}/${tool.slug}`,
      type: "website",
    },
  }
}

export default async function ToolPage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category: categorySlug, slug } = await params
  const tool = getToolBySlug(slug)
  const category = getCategoryBySlug(categorySlug)
  const seo = getToolSeo(slug)

  if (!tool || !category) notFound()

  const relatedTools = tools
    .filter(t => t.category === tool.category && t.slug !== tool.slug && t.version === "v0.1")
    .slice(0, 4)

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
        "name": "首页",
        "item": siteConfig.url,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": category.name,
        "item": `${siteConfig.url}/tools/${category.slug}`,
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": seo?.h1 || tool.name,
        "item": `${siteConfig.url}/tools/${tool.category}/${tool.slug}`,
      },
    ],
  }

  const toolSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": seo?.h1 || tool.name,
    "description": seo?.description || tool.description,
    "url": `${siteConfig.url}/tools/${tool.category}/${tool.slug}`,
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
        <Link href="/" className="hover:text-gray-700">首页</Link>
        <span>/</span>
        <Link href={`/tools/${category.slug}`} className="hover:text-gray-700">{category.name}</Link>
        <span>/</span>
        <span className="text-gray-900">{tool.name}</span>
      </div>

      {/* 工具标题 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{seo?.h1 || tool.name}</h1>
          {tool.isFree ? (
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">免费</Badge>
          ) : (
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">{tool.creditsCost} 积分/次</Badge>
          )}
          {tool.isLocal && (
            <Badge variant="outline" className="text-gray-500">本地处理</Badge>
          )}
        </div>
        <p className="text-sm text-gray-600">{seo?.intro || tool.description}</p>
      </div>

      {/* 工具操作区 */}
      <Card className="p-6 mb-8">
        <ToolRenderer slug={tool.slug} />
      </Card>

      {/* 使用说明 */}
      <div className="mb-8">
        <h2 className="text-base font-medium text-gray-900 mb-3">使用说明</h2>
        <div className="text-sm text-gray-600 space-y-2">
          {(seo?.steps && seo.steps.length > 0 ? seo.steps : [
            "选择或拖拽文件到上方区域。",
            "根据需要调整参数设置。",
            tool.isLocal ? "点击处理按钮，等待完成后下载结果。" : "点击处理按钮，等待服务器处理完成后下载结果文件。",
          ]).map((step, index) => (
            <p key={step}>{index + 1}. {step}</p>
          ))}
          <p className={`${tool.isLocal ? "text-green-700 bg-green-50" : "text-blue-700 bg-blue-50"} px-3 py-2 rounded text-xs mt-3`}>
            {tool.isLocal
              ? "本工具在浏览器本地处理，文件不会上传到任何服务器。"
              : "文件处理完成后立即从服务器删除，结果文件 2 小时后自动清理。"}
          </p>
        </div>
      </div>

      {seo?.scenarios && seo.scenarios.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-medium text-gray-900 mb-3">适合场景</h2>
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
          <h2 className="text-base font-medium text-gray-900 mb-3">注意事项</h2>
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
          <h2 className="text-base font-medium text-gray-900 mb-3">相关工具</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {relatedTools.map((rt) => (
              <Link key={rt.slug} href={`/tools/${rt.category}/${rt.slug}`}>
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
          <h2 className="text-base font-medium text-gray-900 mb-4">常见问题</h2>
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
