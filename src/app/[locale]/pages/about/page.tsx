import { Metadata } from "next"
import { siteConfig } from "@/config/site"
import type { Locale } from "@/i18n/config"
import { localizedSeoFromHeaders } from "@/lib/seo"

const copy = {
  "zh-CN": {
    title: "关于我们",
    description: `${siteConfig.name} 是一个免费在线文件处理工具箱，提供图片压缩、PDF 转换、格式转换等实用工具。`,
    h1: `关于 ${siteConfig.name}`,
    intro: `${siteConfig.name}（CatConvert）是一个面向个人用户、自由职业者和小团队的在线文件处理工具箱。我们提供图片压缩、PDF 转换、Office 文档转换、视频/音频处理、二维码生成、Markdown 预览等 50+ 实用工具。`,
    featuresTitle: "核心特点",
    features: [
      "隐私优先：大部分工具在浏览器本地处理，需要服务器处理的文件会按规则自动清理。",
      "免费为主：基础工具完全免费，高级工具按次消耗少量积分。",
      "即开即用：无需下载安装软件，打开浏览器即可使用，支持电脑和手机。",
      "持续更新：我们会根据用户需求持续新增和优化工具。",
    ],
    categoriesTitle: "工具分类",
    categories: [
      "图片处理：压缩、格式转换、裁剪、缩放、水印",
      "PDF 工具：转换、合并、拆分、压缩、加密",
      "文档转换：Word、Excel、PPT 格式互转",
      "视频/音频处理：压缩、格式转换、裁剪",
      "开发者工具：JSON、正则、时间戳、编码",
      "二维码/条形码：生成、识别",
      "Markdown：预览、转 HTML、转 PDF",
      "文本工具：字数统计、去重、大小写转换",
    ],
    contactTitle: "联系我们",
    contactText: "如有问题、建议或合作咨询，请联系：",
  },
  en: {
    title: "About Us",
    description: `${siteConfig.nameEn} is an online file processing toolbox for image compression, PDF conversion, format conversion, and practical browser-based utilities.`,
    h1: `About ${siteConfig.nameEn}`,
    intro: `${siteConfig.nameEn} is an online file processing toolbox for individuals, freelancers, and small teams. It provides image compression, PDF conversion, Office document conversion, video and audio processing, QR code tools, Markdown preview, and other practical utilities.`,
    featuresTitle: "Core Features",
    features: [
      "Privacy first: many tools run locally in your browser, and server-processed files are cleaned up automatically.",
      "Mostly free: basic tools are free, while advanced server-side tools use a small number of credits.",
      "Ready to use: no desktop installation is required, and the site works on desktop and mobile browsers.",
      "Actively maintained: tools and workflows are improved based on real user needs.",
    ],
    categoriesTitle: "Tool Categories",
    categories: [
      "Image tools: compression, conversion, cropping, resizing, and watermarking",
      "PDF tools: conversion, merge, split, compression, and encryption",
      "Document conversion: Word, Excel, PowerPoint, and PDF workflows",
      "Video and audio tools: compression, conversion, trimming, and extraction",
      "Developer tools: JSON, regular expressions, timestamps, encoding, and hashes",
      "QR code and barcode tools: generation and decoding",
      "Markdown tools: preview, HTML export, and PDF export",
      "Text tools: word count, deduplication, case conversion, and cleanup",
    ],
    contactTitle: "Contact",
    contactText: "For questions, suggestions, or partnership inquiries, contact:",
  },
} satisfies Record<Locale, Record<string, string | string[]>>

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const page = copy[locale]
  const seo = await localizedSeoFromHeaders(locale, "/pages/about")

  return {
    title: page.title as string,
    description: page.description as string,
    alternates: {
      canonical: seo.canonical,
      languages: seo.languages,
    },
    openGraph: {
      title: page.title as string,
      description: page.description as string,
      url: seo.canonical,
      type: "website",
    },
  }
}

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const page = copy[locale]

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{page.h1}</h1>
      <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
        <p>{page.intro}</p>

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">{page.featuresTitle}</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm">
          {(page.features as string[]).map((item) => <li key={item}>{item}</li>)}
        </ul>

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">{page.categoriesTitle}</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          {(page.categories as string[]).map((item) => <li key={item}>{item}</li>)}
        </ul>

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">{page.contactTitle}</h2>
        <p className="text-sm">
          {page.contactText}{" "}
          <a href={`mailto:${siteConfig.email}`} className="text-blue-600 hover:underline">{siteConfig.email}</a>
        </p>
      </div>
    </div>
  )
}
