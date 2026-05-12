"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface Task {
  id: string
  toolSlug: string
  status: string
  inputFileName: string | null
  outputFileName: string | null
  creditsCost: number
  createdAt: string
  completedAt: string | null
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "等待中", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  processing: { label: "处理中", color: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "已完成", color: "bg-green-50 text-green-700 border-green-200" },
  failed: { label: "失败", color: "bg-red-50 text-red-700 border-red-200" },
  expired: { label: "已过期", color: "bg-gray-100 text-gray-600 border-gray-200" },
}

export default function HistoryPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [loading, user, router])

  useEffect(() => {
    if (user) {
      api.get<{ tasks: Task[]; totalPages: number }>(`/api/account/history?page=${page}`).then(res => {
        if (res.code === 0 && res.data) {
          setTasks(res.data.tasks)
          setTotalPages(res.data.totalPages)
        }
      })
    }
  }, [user, page])

  const download = async (taskId: string) => {
    const res = await api.get<{ downloadUrl: string; fileName: string }>(`/api/process/download/${taskId}`)
    if (res.code === 0 && res.data) {
      const a = document.createElement("a")
      a.href = res.data.downloadUrl
      a.download = res.data.fileName
      a.click()
    } else {
      alert(res.message || "下载失败，文件可能已过期")
    }
  }

  if (loading || !user) return <div className="container mx-auto px-4 py-10">加载中...</div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/account" className="hover:text-gray-700">个人中心</Link>
        <span>/</span>
        <span className="text-gray-900">使用历史</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">使用历史</h1>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">工具</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">文件</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">状态</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">积分</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">时间</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasks.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">暂无记录</td></tr>
              ) : tasks.map(t => {
                const status = statusLabels[t.status] || { label: t.status, color: "bg-gray-100 text-gray-600" }
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{t.toolSlug}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{t.inputFileName || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={`text-xs ${status.color}`}>{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{t.creditsCost > 0 ? `-${t.creditsCost}` : "免费"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(t.createdAt).toLocaleString("zh-CN")}</td>
                    <td className="px-4 py-3 text-right">
                      {t.status === "completed" && (
                        <Button size="sm" variant="outline" onClick={() => download(t.id)}>下载</Button>
                      )}
                    </td>
                  </tr>
                )
              })}
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
