"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface Overview {
  userCount: number
  todayTasks: number
  todayUsers: number
  queue: { waiting: number; active: number }
}

interface System {
  queue: { waiting: number; active: number; completed: number; failed: number }
  memory: { rss: number; heapUsed: number; heapTotal: number }
  uptime: number
}

export default function AdminPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [system, setSystem] = useState<System | null>(null)

  useEffect(() => {
    if (!loading) {
      if (!user) router.push("/login?next=/admin")
      else if (user?.role !== "admin") router.push("/account")
    }
  }, [loading, user, router])

  useEffect(() => {
    if (user?.role === "admin") {
      Promise.all([
        api.get<Overview>("/api/admin/stats/overview"),
        api.get<System>("/api/admin/system"),
      ]).then(([o, s]) => {
        if (o.code === 0 && o.data) setOverview(o.data)
        if (s.code === 0 && s.data) setSystem(s.data)
      })
    }
  }, [user])

  if (loading || !user || user.role !== "admin") return <div className="container mx-auto px-4 py-10">加载中...</div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">管理后台</h1>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-5">
            <p className="text-xs text-gray-500 mb-1">总用户数</p>
            <p className="text-2xl font-bold text-gray-900">{overview.userCount}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-gray-500 mb-1">今日新增</p>
            <p className="text-2xl font-bold text-green-600">+{overview.todayUsers}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-gray-500 mb-1">今日任务</p>
            <p className="text-2xl font-bold text-blue-600">{overview.todayTasks}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-gray-500 mb-1">队列状态</p>
            <p className="text-sm font-semibold text-gray-900">等待 {overview.queue.waiting} / 处理 {overview.queue.active}</p>
          </Card>
        </div>
      )}

      {system && (
        <Card className="p-5 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">系统状态</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><dt className="text-xs text-gray-500">运行时间</dt><dd className="text-gray-900">{Math.floor(system.uptime / 3600)} 小时</dd></div>
            <div><dt className="text-xs text-gray-500">内存（RSS）</dt><dd className="text-gray-900">{system.memory.rss} MB</dd></div>
            <div><dt className="text-xs text-gray-500">堆内存</dt><dd className="text-gray-900">{system.memory.heapUsed}/{system.memory.heapTotal} MB</dd></div>
            <div><dt className="text-xs text-gray-500">完成/失败</dt><dd className="text-gray-900">{system.queue.completed} / <span className="text-red-600">{system.queue.failed}</span></dd></div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/users">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-sm font-medium text-gray-900 mb-1">用户管理</h3>
            <p className="text-xs text-gray-500">查看用户列表、调整积分、封禁账号</p>
          </Card>
        </Link>
        <Link href="/admin/tools">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-sm font-medium text-gray-900 mb-1">工具配置</h3>
            <p className="text-xs text-gray-500">动态调整工具积分、启用状态、限制</p>
          </Card>
        </Link>
        <Link href="/admin/stats">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-sm font-medium text-gray-900 mb-1">数据统计</h3>
            <p className="text-xs text-gray-500">流量、工具使用、积分收支</p>
          </Card>
        </Link>
        <Link href="/admin/ai">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-sm font-medium text-gray-900 mb-1">AI 助手</h3>
            <p className="text-xs text-gray-500">管理 AI 上游、全局开关、用量统计</p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
