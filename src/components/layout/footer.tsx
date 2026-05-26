import Link from "next/link"
import { siteConfig } from "@/config/site"
import { categories } from "@/config/tools"
import type { Dictionary } from "@/i18n/get-dictionary"

interface FooterProps {
  locale: string
  dict: Dictionary
}

export function Footer({ locale, dict }: FooterProps) {
  const prefix = `/${locale}`

  return (
    <footer className="border-t bg-gray-50 mt-auto">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                🐱
              </div>
              <span className="font-semibold text-gray-900">{dict.site.name}</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              {dict.footer.description}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">{dict.footer.toolCategories}</h3>
            <ul className="space-y-2">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.slug}>
                  <Link href={`${prefix}/tools/${cat.slug}`} className="text-sm text-gray-500 hover:text-gray-700">
                    {dict.categories[cat.slug as keyof typeof dict.categories]?.name || cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">{dict.footer.moreCategories}</h3>
            <ul className="space-y-2">
              {categories.slice(6).map((cat) => (
                <li key={cat.slug}>
                  <Link href={`${prefix}/tools/${cat.slug}`} className="text-sm text-gray-500 hover:text-gray-700">
                    {dict.categories[cat.slug as keyof typeof dict.categories]?.name || cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">{dict.footer.about}</h3>
            <ul className="space-y-2">
              <li><Link href={`${prefix}/pages/about`} className="text-sm text-gray-500 hover:text-gray-700">{dict.footer.aboutUs}</Link></li>
              <li><Link href={`${prefix}/pages/contact`} className="text-sm text-gray-500 hover:text-gray-700">{dict.footer.contactUs}</Link></li>
              <li><Link href={`${prefix}/pages/privacy`} className="text-sm text-gray-500 hover:text-gray-700">{dict.footer.privacy}</Link></li>
              <li><Link href={`${prefix}/pages/disclaimer`} className="text-sm text-gray-500 hover:text-gray-700">{dict.footer.disclaimer}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} {dict.site.name}. {dict.footer.copyright}
          </p>
          <p className="text-xs text-gray-400">
            {dict.footer.contactEmail}: {siteConfig.email}
          </p>
        </div>
      </div>
    </footer>
  )
}
