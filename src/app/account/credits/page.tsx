"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface Transaction {
  id: number
  type: string
  amount: number
  balanceAfter: number
  source: string
  note: string | null
  createdAt: string
}

const sourceLabels: Record<string, string> = {
  register_bonus: "注册赠送",
  checkin: "每日签到",
  streak: "连续签到奖励",
  share: "分享奖励",
  tool_use: "工具使用",
  recharge: "充值",
  admin: "管理员调整",
  refund: "失败退还",
}

export default function CreditsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [loading, user, router])

  useEffect(() => {
    if (user) {
      api.get<{ transactions: Transaction[]; totalPages: number }>(`/api/account/credits?page=${page}`).then(res => {
        if (res.code === 0 && res.data) {
          setTransactions(res.data.transactions)
          setTotalPages(res.data.totalPages)
        }
      })
    }
  }, [user, page])

  if (loading || !user) return <div className="container mx-auto px-4 py-10">加载中...</div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/account" className="hover:text-gray-700">个人中心</Link>
        <span>/</span>
        <span className="text-gray-900">积分明细</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">积分明细</h1>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">类型</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">变动</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">余额</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">备注</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">暂无记录</td></tr>
              ) : transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{sourceLabels[t.source] || t.source}</td>
                  <td className="px-4 py-3">
                    <span className={t.amount > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                      {t.amount > 0 ? "+" : ""}{t.amount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{t.balanceAfter}</td>
                  <td className="px-4 py-3 text-gray-500">{t.note || "-"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(t.createdAt).toLocaleString("zh-CN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
        </div>
      )}
    </div>
  )
}
