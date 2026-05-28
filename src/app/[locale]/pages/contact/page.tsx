import { Metadata } from "next"
import { siteConfig } from "@/config/site"
import type { Locale } from "@/i18n/config"
import { localizedSeoFromHeaders } from "@/lib/seo"

const copy = {
  "zh-CN": {
    title: "联系我们",
    description: `联系 ${siteConfig.name}：反馈问题、功能建议、隐私问题或合作咨询。`,
    h1: "联系我们",
    emailLabel: "联系邮箱",
    issuesTitle: "可反馈的问题类型",
    issues: ["页面错误或显示异常", "工具功能异常或结果不正确", "内容修正或信息补充", "功能建议或新工具需求", "隐私和数据安全问题", "合作咨询"],
    safetyTitle: "安全提醒",
    safetyIntro: "请勿通过邮件发送以下敏感信息：",
    safetyItems: ["密码或 API 密钥", "身份证号或护照号", "完整合同或财务凭证", "银行卡号或支付信息", "客户资料或医疗信息"],
    reply: "我们会在 1-3 个工作日内回复您的邮件。",
  },
  en: {
    title: "Contact Us",
    description: `Contact ${siteConfig.nameEn} for bug reports, feature suggestions, privacy questions, content corrections, or partnership inquiries.`,
    h1: "Contact Us",
    emailLabel: "Contact Email",
    issuesTitle: "What You Can Send Us",
    issues: ["Page errors or display problems", "Tool bugs or incorrect results", "Content corrections or missing information", "Feature suggestions or new tool requests", "Privacy and data security questions", "Partnership inquiries"],
    safetyTitle: "Safety Reminder",
    safetyIntro: "Do not send the following sensitive information by email:",
    safetyItems: ["Passwords or API keys", "ID or passport numbers", "Complete contracts or financial documents", "Bank card or payment information", "Customer data or medical information"],
    reply: "We usually reply within 1-3 business days.",
  },
} satisfies Record<Locale, {
  title: string
  description: string
  h1: string
  emailLabel: string
  issuesTitle: string
  issues: string[]
  safetyTitle: string
  safetyIntro: string
  safetyItems: string[]
  reply: string
}>

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const page = copy[locale]
  const seo = await localizedSeoFromHeaders(locale, "/pages/contact")

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: seo.canonical,
      languages: seo.languages,
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url: seo.canonical,
      type: "website",
    },
  }
}

export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const page = copy[locale]

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{page.h1}</h1>
      <div className="text-sm text-gray-700 space-y-6">
        <div className="p-5 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-medium text-blue-900 mb-2">{page.emailLabel}</p>
          <p className="text-blue-800 text-base font-mono">{siteConfig.email}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">{page.issuesTitle}</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            {page.issues.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="font-medium text-amber-900 mb-2">{page.safetyTitle}</p>
          <p className="text-amber-800 text-xs">{page.safetyIntro}</p>
          <ul className="list-disc pl-5 text-xs text-amber-700 mt-2 space-y-1">
            {page.safetyItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>

        <p className="text-xs text-gray-500">{page.reply}</p>
      </div>
    </div>
  )
}
