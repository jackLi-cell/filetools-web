import { MetadataRoute } from "next"
import { siteConfig } from "@/config/site"
import { tools } from "@/config/tools"
import { i18n } from "@/i18n/config"

// Only include high-search-volume tools in sitemap for better crawl efficiency
const HIGH_VALUE_TOOLS = new Set([
  // Image - core high-volume tools
  "image-compress",
  "image-convert",
  "image-resize",
  "image-crop",
  "image-watermark",
  "image-svg-convert",
  "image-exif",
  // PDF - all high volume
  "pdf-to-image",
  "image-to-pdf",
  "pdf-merge",
  "pdf-split",
  "pdf-compress",
  // Document conversion - top queries only
  "word-to-pdf",
  "pdf-to-word",
  "excel-to-pdf",
  "ppt-to-pdf",
  // Video - all popular
  "video-compress",
  "video-convert",
  "video-to-gif",
  "video-extract-audio",
  // Dev tools - top 3
  "json-formatter",
  "regex-tester",
  "timestamp-converter",
  // QR code - main one
  "qrcode-generate",
  "qrcode-decode",
  // Text - top query
  "word-counter",
  "color-converter",
  // Audio - top 2
  "audio-convert",
  "audio-trim",
])

// Only include categories that have multiple high-value tools
const HIGH_VALUE_CATEGORIES = new Set([
  "image",
  "pdf",
  "convert",
  "video",
  "dev",
  "qrcode",
  "text",
])

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url
  const locales = i18n.locales

  const entries: MetadataRoute.Sitemap = []

  for (const locale of locales) {
    const prefix = `${baseUrl}/${locale}`

    entries.push(
      { url: prefix, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 1 },
      { url: `${prefix}/pages/about`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 },
      { url: `${prefix}/pages/contact`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 },
      { url: `${prefix}/pages/privacy`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.4 },
      { url: `${prefix}/pages/disclaimer`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.4 },
    )

    for (const slug of HIGH_VALUE_CATEGORIES) {
      entries.push({
        url: `${prefix}/tools/${slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })
    }

    for (const tool of tools) {
      if (tool.version === "v0.1" && HIGH_VALUE_TOOLS.has(tool.slug)) {
        entries.push({
          url: `${prefix}/tools/${tool.category}/${tool.slug}`,
          lastModified: new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.7,
        })
      }
    }
  }

  return entries
}
