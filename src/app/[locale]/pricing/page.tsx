import Link from "next/link"
import { Metadata } from "next"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { fetchTools } from "@/lib/tools-service"
import type { Locale } from "@/i18n/config"
import { localizedSeoFromHeaders } from "@/lib/seo"
import { localizeTools } from "@/lib/localized-tools"

export const dynamic = "force-dynamic"
export const runtime = "edge"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const seo = await localizedSeoFromHeaders(locale, "/pricing")
  const isEn = locale === "en"

  return {
    title: isEn ? "Pricing - Tool Credit Usage" : "定价说明 - 工具积分消耗",
    description: isEn
      ? "CatConvert credit usage for advanced tools. Basic tools are free, while server-side tools use a small number of credits per run."
      : "灵猫转换各工具积分消耗说明，免费工具无限使用，付费工具按次消耗少量积分。",
    alternates: {
      canonical: seo.canonical,
      languages: seo.languages,
    },
    openGraph: {
      title: isEn ? "Pricing - Tool Credit Usage" : "定价说明 - 工具积分消耗",
      description: isEn
        ? "CatConvert free tools and advanced tool credit usage."
        : "灵猫转换免费工具和高级工具积分消耗说明。",
      url: seo.canonical,
      type: "website",
    },
  }
}

export default async function PricingPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const prefix = `/${locale}`
  const isEn = locale === "en"
  const v01Tools = localizeTools(await fetchTools(), locale)
  const freeTools = v01Tools.filter(t => t.isFree)
  const paidTools = v01Tools.filter(t => !t.isFree)
  const copy = isEn
    ? {
        h1: "Pricing",
        intro: "Basic tools are free. Advanced server-side tools use a small number of credits per run.",
        getCredits: "How to Get Credits",
        signup: "New user signup",
        signupDesc: "Get 100 credits when you create an account",
        checkin: "Daily check-in",
        checkinDesc: "Earn 5 credits once per day",
        streak: "7-day streak",
        streakDesc: "Earn 20 extra credits after 7 consecutive days",
        recharge: "Credit top-up",
        rechargeDesc: "Around 1 CNY = 10 credits; larger packages may include bonus credits",
        signupButton: "Sign Up",
        loginButton: "Log In",
        rechargeButton: "Top Up",
        freeTools: "Free Tools",
        freeBadge: `${freeTools.length} tools · unlimited use`,
        freeDesc: "These tools are free to use and usually run locally in your browser without uploading files.",
        paidTools: "Credit Usage",
        paidBadge: `${paidTools.length} advanced tools`,
        paidDesc: "Some advanced tools use server-side processing such as Office conversion, media processing, and watermarking.",
        creditsHeader: "Credits",
        toolsHeader: "Tools",
        creditsPerUse: "credits/use",
        rulesTitle: "Usage Rules",
        rules: "Free tools do not require login. Tools that use credits require sign-in and enough balance before processing starts.",
        promiseTitle: "Service Notes",
        promises: [
          "Credits are refunded automatically when processing fails.",
          "Gift credits are valid for 90 days.",
          "Purchased credits remain valid long term.",
          "Source files are deleted after server-side processing.",
          "Result files are cleaned up automatically after 2 hours.",
        ],
      }
    : {
        h1: "定价说明",
        intro: "基础工具完全免费，高级工具按次消耗少量积分",
        getCredits: "如何获得积分",
        signup: "新用户注册",
        signupDesc: "注册账号即送 100 积分",
        checkin: "每日签到",
        checkinDesc: "每天签到送 5 积分",
        streak: "连续签到 7 天",
        streakDesc: "额外奖励 20 积分",
        recharge: "积分充值",
        rechargeDesc: "约 1 元 = 10 积分，大额套餐含赠送积分",
        signupButton: "立即注册领取",
        loginButton: "登录签到",
        rechargeButton: "积分充值",
        freeTools: "免费工具",
        freeBadge: `${freeTools.length} 个 · 无限使用`,
        freeDesc: "以下工具完全免费，无需登录，无次数限制。大部分在浏览器本地处理，文件不上传服务器。",
        paidTools: "积分消耗",
        paidBadge: `${paidTools.length} 个高级工具`,
        paidDesc: "部分高级工具（如 Office 转换、视频处理、水印等）需要服务器算力，按次消耗少量积分。",
        creditsHeader: "积分",
        toolsHeader: "工具",
        creditsPerUse: "积分/次",
        rulesTitle: "使用规则",
        rules: "免费工具无需登录；需要积分的工具请先登录后使用，余额充足时会自动扣除对应积分。",
        promiseTitle: "承诺",
        promises: [
          "处理失败自动退还积分",
          "赠送积分 90 天有效期",
          "充值积分长期有效",
          "文件处理完成后立即从服务器删除",
          "结果文件 2 小时后自动清理",
        ],
      }

  const grouped: Record<number, typeof paidTools> = {}
  paidTools.forEach(t => {
    if (!grouped[t.creditsCost]) grouped[t.creditsCost] = []
    grouped[t.creditsCost].push(t)
  })

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{copy.h1}</h1>
      <p className="text-sm text-gray-500 mb-8">{copy.intro}</p>

      {/* 积分获取 */}
      <Card className="p-6 mb-8 bg-gradient-to-br from-blue-50 to-white border-blue-200">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{copy.getCredits}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">+100</div>
            <div>
              <p className="font-medium text-gray-900">{copy.signup}</p>
              <p className="text-xs text-gray-500 mt-0.5">{copy.signupDesc}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs flex-shrink-0">+5</div>
            <div>
              <p className="font-medium text-gray-900">{copy.checkin}</p>
              <p className="text-xs text-gray-500 mt-0.5">{copy.checkinDesc}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs flex-shrink-0">+20</div>
            <div>
              <p className="font-medium text-gray-900">{copy.streak}</p>
              <p className="text-xs text-gray-500 mt-0.5">{copy.streakDesc}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs flex-shrink-0">{isEn ? "$" : "充"}</div>
            <div>
              <p className="font-medium text-gray-900">{copy.recharge}</p>
              <p className="text-xs text-gray-500 mt-0.5">{copy.rechargeDesc}</p>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`${prefix}/register`}><Button size="sm">{copy.signupButton}</Button></Link>
          <Link href={`${prefix}/login`}><Button size="sm" variant="outline">{copy.loginButton}</Button></Link>
          <Link href={`${prefix}/account/recharge`}><Button size="sm" variant="outline">{copy.rechargeButton}</Button></Link>
        </div>
      </Card>

      {/* 免费工具 */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">{copy.freeTools}</h2>
          <Badge className="bg-green-50 text-green-700 border-green-200">{copy.freeBadge}</Badge>
        </div>
        <p className="text-sm text-gray-500 mb-4">{copy.freeDesc}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
          {freeTools.map(t => (
            <Link key={t.slug} href={`${prefix}/tools/${t.category}/${t.slug}`} className="px-2 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded text-center truncate">
              {t.name}
            </Link>
          ))}
        </div>
      </Card>

      {/* 付费工具按积分分档 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">{copy.paidTools}</h2>
          <Badge className="bg-blue-50 text-blue-700 border-blue-200">{copy.paidBadge}</Badge>
        </div>
        <p className="text-sm text-gray-500 mb-5">{copy.paidDesc}</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">{copy.creditsHeader}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">{copy.toolsHeader}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).map(cost => (
                <tr key={cost}>
                  <td className="px-3 py-3 align-top">
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200">{cost} {copy.creditsPerUse}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {grouped[Number(cost)].map(t => (
                        <Link key={t.slug} href={`${prefix}/tools/${t.category}/${t.slug}`} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700">
                          {t.name}
                        </Link>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 p-4 bg-blue-50 rounded-lg text-xs text-blue-800">
          <strong>{copy.rulesTitle}</strong>: {copy.rules}
        </div>
      </Card>

      {/* 信任承诺 */}
      <div className="mt-8 p-5 border rounded-lg bg-gray-50">
        <h3 className="text-sm font-medium text-gray-900 mb-2">{copy.promiseTitle}</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          {copy.promises.map((item) => <li key={item}>✓ {item}</li>)}
        </ul>
      </div>
    </div>
  )
}
