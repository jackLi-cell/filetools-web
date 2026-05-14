import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { categories, tools } from "@/config/tools"
import { ToolSearch } from "@/components/tool-search"

const popularTools = tools.filter(t => t.version === "v0.1").slice(0, 8)

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <section className="border-b bg-gradient-to-b from-blue-50/50 to-white py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            灵猫转换 · 在线文件处理工具箱
          </h1>
          <p className="text-base text-gray-600 mb-8 max-w-xl mx-auto">
            图片压缩、PDF 转换、Office 文档转换、视频处理等 50+ 实用工具，大部分在浏览器本地处理，文件不上传服务器。
          </p>
          <div className="max-w-md mx-auto">
            <ToolSearch />
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">工具分类</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/tools/${cat.slug}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-gray-200">
                  <CardHeader className="p-4">
                    <div className="text-2xl mb-2">{cat.icon}</div>
                    <CardTitle className="text-sm font-medium">{cat.name}</CardTitle>
                    <CardDescription className="text-xs">{cat.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">热门工具</h2>
            <Link href="/tools" className="text-sm text-blue-600 hover:text-blue-700">
              查看全部 →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularTools.map((tool) => (
              <Link key={tool.slug} href={`/tools/${tool.category}/${tool.slug}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <CardTitle className="text-sm font-medium">{tool.name}</CardTitle>
                      {tool.isFree && (
                        <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                          免费
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

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">隐私安全</h3>
              <p className="text-xs text-gray-500">大部分工具在浏览器本地处理，文件不离开你的设备。需要服务器处理的文件，处理完成后立即删除。</p>
            </div>
            <div className="text-center p-6">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">即开即用</h3>
              <p className="text-xs text-gray-500">无需下载安装任何软件，打开浏览器即可使用。支持电脑和手机。</p>
            </div>
            <div className="text-center p-6">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">免费为主</h3>
              <p className="text-xs text-gray-500">29 个基础工具完全免费、无限使用。高级工具按次消耗少量积分，注册即送 100 积分。</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
