import Link from "next/link"
import { Metadata } from "next"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { tools } from "@/config/tools"
import { applyCategoryPaymentSettings } from "@/lib/payment-settings"

export const metadata: Metadata = {
  title: "定价说明 - 工具积分消耗",
  description: "灵猫转换各工具积分消耗说明，免费工具无限使用，付费工具按次消耗少量积分。",
}

export default function PricingPage() {
  const v01Tools = applyCategoryPaymentSettings(tools.filter(t => t.version === "v0.1"))
  const freeTools = v01Tools.filter(t => t.isFree)
  const paidTools = v01Tools.filter(t => !t.isFree)

  const grouped: Record<number, typeof paidTools> = {}
  paidTools.forEach(t => {
    if (!grouped[t.creditsCost]) grouped[t.creditsCost] = []
    grouped[t.creditsCost].push(t)
  })

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">定价说明</h1>
      <p className="text-sm text-gray-500 mb-8">基础工具完全免费，高级工具按次消耗少量积分</p>

      {/* 积分获取 */}
      <Card className="p-6 mb-8 bg-gradient-to-br from-blue-50 to-white border-blue-200">
        <h2 className="text-base font-semibold text-gray-900 mb-4">如何获得积分</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">+100</div>
            <div>
              <p className="font-medium text-gray-900">新用户注册</p>
              <p className="text-xs text-gray-500 mt-0.5">注册账号即送 100 积分</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs flex-shrink-0">+5</div>
            <div>
              <p className="font-medium text-gray-900">每日签到</p>
              <p className="text-xs text-gray-500 mt-0.5">每天签到送 5 积分</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs flex-shrink-0">+20</div>
            <div>
              <p className="font-medium text-gray-900">连续签到 7 天</p>
              <p className="text-xs text-gray-500 mt-0.5">额外奖励 20 积分</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs flex-shrink-0">充</div>
            <div>
              <p className="font-medium text-gray-900">积分充值</p>
              <p className="text-xs text-gray-500 mt-0.5">支付宝/微信支付即将开放</p>
            </div>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <Link href="/register"><Button size="sm">立即注册领取</Button></Link>
          <Link href="/login"><Button size="sm" variant="outline">登录签到</Button></Link>
        </div>
      </Card>

      {/* 免费工具 */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">免费工具</h2>
          <Badge className="bg-green-50 text-green-700 border-green-200">{freeTools.length} 个 · 无限使用</Badge>
        </div>
        <p className="text-sm text-gray-500 mb-4">以下工具完全免费，无需登录，无次数限制。大部分在浏览器本地处理，文件不上传服务器。</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
          {freeTools.map(t => (
            <Link key={t.slug} href={`/tools/${t.category}/${t.slug}`} className="px-2 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded text-center truncate">
              {t.name}
            </Link>
          ))}
        </div>
      </Card>

      {/* 付费工具按积分分档 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">积分消耗</h2>
          <Badge className="bg-blue-50 text-blue-700 border-blue-200">{paidTools.length} 个高级工具</Badge>
        </div>
        <p className="text-sm text-gray-500 mb-5">部分高级工具（如 Office 转换、视频处理、水印等）需要服务器算力，按次消耗少量积分。</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">积分</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">工具</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).map(cost => (
                <tr key={cost}>
                  <td className="px-3 py-3 align-top">
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200">{cost} 积分/次</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {grouped[Number(cost)].map(t => (
                        <Link key={t.slug} href={`/tools/${t.category}/${t.slug}`} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700">
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
          💡 <strong>限免规则</strong>：PDF 基础工具（转图片、合并、拆分）匿名用户每天可免费使用 3 次，注册用户每天 5 次，超出后按积分计费。
        </div>
      </Card>

      {/* 信任承诺 */}
      <div className="mt-8 p-5 border rounded-lg bg-gray-50">
        <h3 className="text-sm font-medium text-gray-900 mb-2">承诺</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>✓ 处理失败自动退还积分</li>
          <li>✓ 赠送积分 90 天有效期</li>
          <li>✓ 充值积分永不过期（后续开通充值时）</li>
          <li>✓ 文件处理完成后立即从服务器删除</li>
          <li>✓ 结果文件 2 小时后自动清理</li>
        </ul>
      </div>
    </div>
  )
}
