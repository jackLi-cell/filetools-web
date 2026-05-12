import Link from "next/link"
import { siteConfig } from "@/config/site"
import { categories } from "@/config/tools"

export function Footer() {
  return (
    <footer className="border-t bg-gray-50 mt-auto">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                🐱
              </div>
              <span className="font-semibold text-gray-900">{siteConfig.name}</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              灵猫转换（CatConvert）是一个免费在线文件处理工具箱，支持图片压缩、PDF 转换、Office 文档转换、视频处理等 50+ 实用工具。大部分工具在浏览器本地处理，文件不上传服务器。
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">工具分类</h3>
            <ul className="space-y-2">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.slug}>
                  <Link href={`/tools/${cat.slug}`} className="text-sm text-gray-500 hover:text-gray-700">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">更多分类</h3>
            <ul className="space-y-2">
              {categories.slice(6).map((cat) => (
                <li key={cat.slug}>
                  <Link href={`/tools/${cat.slug}`} className="text-sm text-gray-500 hover:text-gray-700">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">关于</h3>
            <ul className="space-y-2">
              <li><Link href="/pages/about" className="text-sm text-gray-500 hover:text-gray-700">关于我们</Link></li>
              <li><Link href="/pages/contact" className="text-sm text-gray-500 hover:text-gray-700">联系我们</Link></li>
              <li><Link href="/pages/privacy" className="text-sm text-gray-500 hover:text-gray-700">隐私政策</Link></li>
              <li><Link href="/pages/disclaimer" className="text-sm text-gray-500 hover:text-gray-700">免责声明</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} {siteConfig.name}. 文件在浏览器本地处理，不上传服务器。
          </p>
          <p className="text-xs text-gray-400">
            联系邮箱：{siteConfig.email}
          </p>
        </div>
      </div>
    </footer>
  )
}
