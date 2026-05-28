import { tools } from "@/config/tools"
import { i18n } from "@/i18n/config"
import { getSiteUrlFromRequest, localizedUrl, languageAlternates } from "@/lib/seo"

const HIGH_VALUE_TOOLS = new Set([
  "image-compress",
  "image-convert",
  "image-resize",
  "image-crop",
  "image-watermark",
  "image-svg-convert",
  "image-exif",
  "pdf-to-image",
  "image-to-pdf",
  "pdf-merge",
  "pdf-split",
  "pdf-compress",
  "word-to-pdf",
  "pdf-to-word",
  "excel-to-pdf",
  "ppt-to-pdf",
  "video-compress",
  "video-convert",
  "video-to-gif",
  "video-extract-audio",
  "json-formatter",
  "regex-tester",
  "timestamp-converter",
  "qrcode-generate",
  "qrcode-decode",
  "word-counter",
  "color-converter",
  "audio-convert",
  "audio-trim",
])

const HIGH_VALUE_CATEGORIES = new Set([
  "image",
  "pdf",
  "convert",
  "video",
  "dev",
  "qrcode",
  "text",
])

const STATIC_PAGES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/tools", changefreq: "weekly", priority: "0.8" },
  { path: "/pricing", changefreq: "monthly", priority: "0.6" },
  { path: "/pages/about", changefreq: "monthly", priority: "0.5" },
  { path: "/pages/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/pages/privacy", changefreq: "monthly", priority: "0.4" },
  { path: "/pages/disclaimer", changefreq: "monthly", priority: "0.4" },
]

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function buildAlternateLinks(baseUrl: string, path: string) {
  const alternates = languageAlternates(path, baseUrl)
  return Object.entries(alternates)
    .map(
      ([hreflang, href]) =>
        `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(href)}"/>`
    )
    .join("\n")
}

function buildUrlEntry({
  baseUrl,
  locale,
  path,
  changefreq,
  priority,
}: {
  baseUrl: string
  locale: string
  path: string
  changefreq: string
  priority: string
}) {
  return `  <url>
    <loc>${escapeXml(localizedUrl(locale, path, baseUrl))}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${buildAlternateLinks(baseUrl, path)}
  </url>`
}

export function GET(request: Request) {
  const baseUrl = getSiteUrlFromRequest(request)

  const entries = [
    ...i18n.locales.flatMap((locale) =>
      STATIC_PAGES.map((page) =>
        buildUrlEntry({
          baseUrl,
          locale,
          path: page.path,
          changefreq: page.changefreq,
          priority: page.priority,
        })
      )
    ),
    ...i18n.locales.flatMap((locale) =>
      Array.from(HIGH_VALUE_CATEGORIES).map((slug) =>
        buildUrlEntry({
          baseUrl,
          locale,
          path: `/tools/${slug}`,
          changefreq: "weekly",
          priority: "0.8",
        })
      )
    ),
    ...i18n.locales.flatMap((locale) =>
      tools
        .filter((tool) => tool.version === "v0.1" && HIGH_VALUE_TOOLS.has(tool.slug))
        .map((tool) =>
          buildUrlEntry({
            baseUrl,
            locale,
            path: `/tools/${tool.category}/${tool.slug}`,
            changefreq: "monthly",
            priority: "0.7",
          })
        )
    ),
  ].join("\n")

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>`

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
