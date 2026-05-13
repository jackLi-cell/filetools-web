import Link from "next/link"
import { Metadata } from "next"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { categories, tools } from "@/config/tools"
import { applyCategoryPaymentSettings } from "@/lib/payment-settings"

export const metadata: Metadata = {
  title: "全部工具 - 50+ 在线文件处理工具",
  description: "灵猫转换全部工具列表，按分类浏览所有图片、PDF、视频、音频、Markdown、开发者等在线工具。",
}

export default function AllToolsPage() {
  const v01Tools = applyCategoryPaymentSettings(tools.filter(t => t.version === "v0.1"))

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">全部工具</h1>
        <p className="text-sm text-gray-500">共 {v01Tools.length} 个工具，按分类整理</p>
      </div>

      {categories.map(cat => {
        const catTools = v01Tools.filter(t => t.category === cat.slug)
        if (catTools.length === 0) return null
        return (
          <section key={cat.slug} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{cat.icon}</span>
              <h2 className="text-base font-semibold text-gray-900">{cat.name}</h2>
              <span className="text-xs text-gray-400">({catTools.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catTools.map(tool => (
                <Link key={tool.slug} href={`/tools/${tool.category}/${tool.slug}`}>
                  <Card className="h-full p-4 hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex items-start justify-between mb-1.5">
                      <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">{tool.name}</h3>
                      {tool.isFree
                        ? <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200 flex-shrink-0">免费</Badge>
                        : <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200 flex-shrink-0">{tool.creditsCost} 积分</Badge>}
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
