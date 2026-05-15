"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface AdminUser {
  id: number
  email: string
  name: string | null
  role: string
  credits: number
  status: string
  createdAt: string
}

interface AdminUserDetail {
  user: AdminUser & {
    emailVerified: boolean
    totalEarned: number
    totalSpent: number
    lastCheckinDate: string | null
    consecutiveCheckin: number
    updatedAt: string
  }
  sessions: {
    activeCount: number
    last: {
      id: string
      ipAddress: string | null
      userAgent: string | null
      createdAt: string
      expiresAt: string
    } | null
  }
  taskSummary: Record<string, number>
  recentTasks: Array<{
    id: string
    toolSlug: string
    status: string
    inputFileName: string | null
    outputFileName: string | null
    creditsCost: number
    errorMessage: string | null
    createdAt: string
    completedAt: string | null
  }>
  recentCredits: Array<{
    id: number
    type: string
    amount: number
    balanceAfter: number
    source: string
    toolSlug: string | null
    note: string | null
    createdAt: string
  }>
  orders: Array<{
    id: number
    orderNo: string
    packageName: string
    creditsAmount: number
    priceCents: number
    paymentMethod: string
    paymentChannel: string
    paymentStatus: string
    paidAt: string | null
    createdAt: string
  }>
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-"
  const ts = new Date(value)
  if (Number.isNaN(ts.getTime())) return "-"
  return ts.toLocaleString("zh-CN", { hour12: false })
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [creditAmount, setCreditAmount] = useState("")
  const [creditReason, setCreditReason] = useState("")
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push("/admin/login?next=/admin/users")
    else if (!loading && user?.role !== "admin") router.push("/admin/login")
  }, [loading, user, router])

  const fetchUsers = useCallback(() => {
    api.get<{ users: AdminUser[]; totalPages: number }>(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`)
      .then(res => {
        if (res.code === 0 && res.data) {
          setUsers(res.data.users)
          setTotalPages(res.data.totalPages)
        }
      })
  }, [page, search])

  useEffect(() => { if (user?.role === "admin") fetchUsers() }, [user, fetchUsers])

  const adjustCredits = async (userId: number) => {
    const amount = Number(creditAmount)
    if (!amount || !creditReason) { alert("请填写积分数量和原因"); return }
    const res = await api.put(`/api/admin/users/${userId}/credits`, { amount, reason: creditReason })
    if (res.code === 0) {
      setEditingId(null)
      setCreditAmount("")
      setCreditReason("")
      fetchUsers()
    } else {
      alert(res.message)
    }
  }

  const toggleBan = async (u: AdminUser) => {
    const newStatus = u.status === "banned" ? "active" : "banned"
    if (!confirm(`确定要${newStatus === "banned" ? "封禁" : "解封"}用户 ${u.email} 吗？`)) return
    await api.put(`/api/admin/users/${u.id}/status`, { status: newStatus })
    fetchUsers()
  }

  const openDetail = async (userId: number) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetail(null)
    const res = await api.get<AdminUserDetail>(`/api/admin/users/${userId}`)
    if (res.code === 0 && res.data) {
      setDetail(res.data)
    } else {
      alert(res.message || "读取用户详情失败")
      setDetailOpen(false)
    }
    setDetailLoading(false)
  }

  if (loading || !user || user.role !== "admin") return <div className="container mx-auto px-4 py-10">加载中...</div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/admin" className="hover:text-gray-700">管理后台</Link>
        <span>/</span>
        <span className="text-gray-900">用户管理</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">用户管理</h1>

      <div className="flex gap-2 mb-4">
        <Input placeholder="搜索邮箱..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Button onClick={() => { setPage(1); fetchUsers() }}>搜索</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">邮箱</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">昵称</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">角色</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">积分</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">状态</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.id} className={u.status === "banned" ? "bg-red-50" : ""}>
                  <td className="px-4 py-3 text-gray-500">{u.id}</td>
                  <td className="px-4 py-3 text-gray-900">{u.email}</td>
                  <td className="px-4 py-3 text-gray-700">{u.name || "-"}</td>
                  <td className="px-4 py-3">
                    {u.role === "admin" ? <Badge className="bg-purple-100 text-purple-700">管理员</Badge> : <span className="text-gray-500 text-xs">用户</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{u.credits}</td>
                  <td className="px-4 py-3">
                    {u.status === "banned"
                      ? <Badge className="bg-red-100 text-red-700">已封禁</Badge>
                      : <Badge className="bg-green-100 text-green-700">正常</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openDetail(u.id)}>详情</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(editingId === u.id ? null : u.id); setCreditAmount(""); setCreditReason("") }}>调整积分</Button>
                    <Button size="sm" variant={u.status === "banned" ? "outline" : "ghost"} className={u.status !== "banned" ? "text-red-600 hover:bg-red-50" : ""} onClick={() => toggleBan(u)}>
                      {u.status === "banned" ? "解封" : "封禁"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editingId !== null && (
        <Card className="p-5 mt-4 border-blue-200 bg-blue-50">
          <h3 className="text-sm font-medium text-gray-900 mb-3">调整积分（用户 ID: {editingId}）</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input type="number" placeholder="积分变动（正数加，负数减）" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} />
            <Input placeholder="操作原因（必填）" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} />
            <Button onClick={() => adjustCredits(editingId)}>确认调整</Button>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
            <DialogDescription>账号、积分、会话、任务和订单的完整视图。</DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-10 text-center text-sm text-gray-500">加载中...</div>
          ) : detail ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  ["用户 ID", detail.user.id],
                  ["邮箱", detail.user.email],
                  ["昵称", detail.user.name || "-"],
                  ["角色", detail.user.role],
                  ["状态", detail.user.status],
                  ["邮箱验证", detail.user.emailVerified ? "已验证" : "未验证"],
                  ["当前积分", detail.user.credits],
                  ["累计获得", detail.user.totalEarned],
                  ["累计消耗", detail.user.totalSpent],
                  ["连续签到", `${detail.user.consecutiveCheckin} 天`],
                  ["注册时间", formatDate(detail.user.createdAt)],
                  ["更新时间", formatDate(detail.user.updatedAt)],
                  ["最近签到", formatDate(detail.user.lastCheckinDate)],
                  ["活跃会话", detail.sessions.activeCount],
                  ["最近登录 IP", detail.sessions.last?.ipAddress || "-"],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-[11px] text-gray-500">{label}</p>
                    <p className="mt-1 break-words text-sm font-medium text-gray-900">{value}</p>
                  </div>
                ))}
              </div>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">任务汇总</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(detail.taskSummary).length === 0 ? (
                    <span className="text-xs text-gray-500">暂无任务</span>
                  ) : (
                    Object.entries(detail.taskSummary).map(([status, count]) => (
                      <Badge key={status} className="bg-gray-100 text-gray-700">
                        {status}: {count}
                      </Badge>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">最近任务</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-3 py-2 text-left">工具</th>
                        <th className="px-3 py-2 text-left">状态</th>
                        <th className="px-3 py-2 text-left">输入文件</th>
                        <th className="px-3 py-2 text-left">积分</th>
                        <th className="px-3 py-2 text-left">创建时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {detail.recentTasks.length === 0 ? (
                        <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-400">暂无任务</td></tr>
                      ) : detail.recentTasks.map((task) => (
                        <tr key={task.id}>
                          <td className="px-3 py-2 text-gray-900">{task.toolSlug}</td>
                          <td className="px-3 py-2 text-gray-700">{task.status}</td>
                          <td className="max-w-[220px] truncate px-3 py-2 text-gray-700" title={task.inputFileName || ""}>{task.inputFileName || "-"}</td>
                          <td className="px-3 py-2 text-gray-700">{task.creditsCost}</td>
                          <td className="px-3 py-2 text-gray-700">{formatDate(task.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">最近积分流水</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-3 py-2 text-left">类型</th>
                        <th className="px-3 py-2 text-right">变动</th>
                        <th className="px-3 py-2 text-right">余额</th>
                        <th className="px-3 py-2 text-left">来源</th>
                        <th className="px-3 py-2 text-left">备注</th>
                        <th className="px-3 py-2 text-left">时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {detail.recentCredits.length === 0 ? (
                        <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-400">暂无流水</td></tr>
                      ) : detail.recentCredits.map((row) => (
                        <tr key={row.id}>
                          <td className="px-3 py-2 text-gray-900">{row.type}</td>
                          <td className={row.amount >= 0 ? "px-3 py-2 text-right text-green-600" : "px-3 py-2 text-right text-red-600"}>{row.amount}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{row.balanceAfter}</td>
                          <td className="px-3 py-2 text-gray-700">{row.source}</td>
                          <td className="max-w-[220px] truncate px-3 py-2 text-gray-700" title={row.note || ""}>{row.note || "-"}</td>
                          <td className="px-3 py-2 text-gray-700">{formatDate(row.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">最近订单</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-3 py-2 text-left">订单号</th>
                        <th className="px-3 py-2 text-left">套餐</th>
                        <th className="px-3 py-2 text-right">积分</th>
                        <th className="px-3 py-2 text-right">金额</th>
                        <th className="px-3 py-2 text-left">渠道</th>
                        <th className="px-3 py-2 text-left">状态</th>
                        <th className="px-3 py-2 text-left">创建时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {detail.orders.length === 0 ? (
                        <tr><td colSpan={7} className="px-3 py-4 text-center text-gray-400">暂无订单</td></tr>
                      ) : detail.orders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-3 py-2 text-gray-900">{order.orderNo}</td>
                          <td className="px-3 py-2 text-gray-700">{order.packageName}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{order.creditsAmount}</td>
                          <td className="px-3 py-2 text-right text-gray-700">¥{(order.priceCents / 100).toFixed(2)}</td>
                          <td className="px-3 py-2 text-gray-700">{order.paymentChannel || order.paymentMethod}</td>
                          <td className="px-3 py-2 text-gray-700">{order.paymentStatus}</td>
                          <td className="px-3 py-2 text-gray-700">{formatDate(order.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
