"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface DailyStat {
  date: string
  pageViews: number
  uniqueVisitors: number
  newUsers: number
  totalTasks: number
  creditsEarned: number
  creditsSpent: number
}

interface ToolStat {
  date: string
  toolSlug: string
  useCount: number
  successCount: number
  failCount: number
  creditsConsumed: number
  avgProcessMs: number
}

export default function AdminStatsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [daily, setDaily] = useState<DailyStat[]>([])
  const [toolStats, setToolStats] = useState<ToolStat[]>([])

  useEffect(() => {
    if (!loading && !user) router.push("/admin/login?next=/admin/stats")
    else if (!loading && user?.role !== "admin") router.push("/admin/login")
  }, [loading, user, router])

  useEffect(() => {
    if (user?.role === "admin") {
      Promise.all([
        api.get<DailyStat[]>("/api/admin/stats/traffic?days=30"),
        api.get<ToolStat[]>("/api/admin/stats/tools?days=7"),
      ]).then(([d, t]) => {
        if (d.code === 0 && d.data) setDaily(d.data)
        if (t.code === 0 && t.data) setToolStats(t.data)
      })
    }
  }, [user])

  if (loading || !user || user.role !== "admin") return <div className="container mx-auto px-4 py-10">加载中...</div>

  const toolSummary = toolStats.reduce((acc, s) => {
    if (!acc[s.toolSlug]) acc[s.toolSlug] = { useCount: 0, successCount: 0, failCount: 0, creditsConsumed: 0 }
    acc[s.toolSlug].useCount += s.useCount
    acc[s.toolSlug].successCount += s.successCount
    acc[s.toolSlug].failCount += s.failCount
    acc[s.toolSlug].creditsConsumed += s.creditsConsumed
    return acc
  }, {} as Record<string, { useCount: number; successCount: number; failCount: number; creditsConsumed: number }>)

  const sortedTools = Object.entries(toolSummary).sort((a, b) => b[1].useCount - a[1].useCount)

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/admin" className="hover:text-gray-700">管理后台</Link>
        <span>/</span>
        <span className="text-gray-900">数据统计</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">数据统计</h1>

      <Card className="p-5 mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">流量趋势（近 30 天）</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">日期</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">PV</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">UV</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">新增用户</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">任务数</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">积分消耗</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {daily.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400 text-xs">暂无数据</td></tr>
              ) : daily.slice(-30).reverse().map(d => (
                <tr key={d.date}>
                  <td className="px-3 py-2 text-gray-700">{new Date(d.date).toLocaleDateString("zh-CN")}</td>
                  <td className="px-3 py-2 text-right">{d.pageViews}</td>
                  <td className="px-3 py-2 text-right">{d.uniqueVisitors}</td>
                  <td className="px-3 py-2 text-right text-green-600">+{d.newUsers}</td>
                  <td className="px-3 py-2 text-right">{d.totalTasks}</td>
                  <td className="px-3 py-2 text-right text-blue-600">{d.creditsSpent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-medium text-gray-900 mb-3">工具使用排行（近 7 天）</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">工具</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">使用次数</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">成功</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">失败</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">成功率</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">积分消耗</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedTools.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400 text-xs">暂无数据</td></tr>
              ) : sortedTools.map(([slug, s]) => (
                <tr key={slug}>
                  <td className="px-3 py-2 text-gray-900">{slug}</td>
                  <td className="px-3 py-2 text-right">{s.useCount}</td>
                  <td className="px-3 py-2 text-right text-green-600">{s.successCount}</td>
                  <td className="px-3 py-2 text-right text-red-600">{s.failCount}</td>
                  <td className="px-3 py-2 text-right">{s.useCount > 0 ? Math.round(s.successCount / s.useCount * 100) : 0}%</td>
                  <td className="px-3 py-2 text-right text-blue-600">{s.creditsConsumed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
