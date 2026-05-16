import Link from "next/link"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { categories, tools } from "@/config/tools"
import { applyCategoryPaymentSettings } from "@/lib/payment-settings"
import { siteConfig } from "@/config/site"

export function generateStaticParams() {
  return categories.map((cat) => ({ category: cat.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category: categorySlug } = await params
  const category = categories.find(c => c.slug === categorySlug)
  if (!category) return {}

  const categoryDescriptions: Record<string, string> = {
    image: "免费在线图片处理工具：压缩、格式转换、裁剪、缩放、加水印、去背景。浏览器本地处理，图片不上传服务器。",
    pdf: "免费在线 PDF 工具：转图片、合并、拆分、压缩、加密、解密、旋转、提取页面。支持批量处理。",
    convert: "在线文档格式转换：Word 转 PDF、Excel 转 PDF、PPT 转 PDF、PDF 转 Word。支持 Office 全系列格式互转。",
    video: "在线视频处理工具：视频压缩、格式转换、转 GIF、提取音频、截取片段。支持 MP4、MOV、WebM 等格式。",
    audio: "在线音频处理工具：格式转换、压缩、裁剪、合并、变速、降噪。支持 MP3、WAV、FLAC、AAC 等格式。",
    markdown: "在线 Markdown 工具：实时预览、转 HTML、转 PDF。分屏编辑器，支持代码高亮和表格。",
    dev: "开发者在线工具箱：JSON 格式化、正则测试、时间戳转换、URL 编码、哈希计算、UUID 生成、JWT 解码。",
    qrcode: "在线二维码工具：生成二维码（支持 Logo 和颜色）、识别二维码、生成条形码。免费无限使用。",
    text: "在线文本处理工具：字数统计、文本去重、大小写转换、颜色格式转换。浏览器本地处理，即开即用。",
    security: "文件安全工具：文件哈希校验（MD5/SHA256）、图片元数据清除、PDF 元数据清除。保护隐私安全。",
    signature: "在线电子签名工具：手写板生成签名图片，支持 PNG 透明背景和 SVG 格式导出。",
  }

  return {
    title: `${category.name} - 在线${category.description}工具 | 灵猫转换`,
    description: categoryDescriptions[categorySlug] || `免费在线${category.name}工具：${category.description}。灵猫转换提供便捷的在线文件处理服务。`,
    alternates: {
      canonical: `${siteConfig.url}/tools/${category.slug}`,
    },
    openGraph: {
      title: `${category.name} - 在线${category.description}工具 | 灵猫转换`,
      description: categoryDescriptions[categorySlug] || `免费在线${category.name}工具：${category.description}。灵猫转换提供便捷的在线文件处理服务。`,
      url: `${siteConfig.url}/tools/${category.slug}`,
      type: "website",
    },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: categorySlug } = await params
  const category = categories.find(c => c.slug === categorySlug)
  if (!category) notFound()

  const categoryTools = applyCategoryPaymentSettings(tools.filter(t => t.category === categorySlug && t.version === "v0.1"))

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-700">首页</Link>
          <span>/</span>
          <span className="text-gray-900">{category.name}</span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{category.icon}</span>
          <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
        </div>
        <p className="text-sm text-gray-600">{category.description}，共 {categoryTools.length} 个工具可用。</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryTools.map((tool) => (
          <Link key={tool.slug} href={`/tools/${categorySlug}/${tool.slug}`}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-base font-medium group-hover:text-blue-600 transition-colors">
                    {tool.name}
                  </CardTitle>
                  <div className="flex gap-1.5">
                    {tool.isFree ? (
                      <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                        免费
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {tool.creditsCost} 积分
                      </Badge>
                    )}
                    {tool.isLocal && (
                      <Badge variant="outline" className="text-xs text-gray-500">
                        本地处理
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
          <p className="text-gray-500 text-sm">该分类下的工具正在开发中，敬请期待。</p>
        </div>
      )}
    </div>
  )
}
