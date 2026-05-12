"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.push("/")
  }, [loading, user, router])

  const fetchUsers = () => {
    api.get<{ users: AdminUser[]; totalPages: number }>(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`)
      .then(res => {
        if (res.code === 0 && res.data) {
          setUsers(res.data.users)
          setTotalPages(res.data.totalPages)
        }
      })
  }

  useEffect(() => { if (user?.role === "admin") fetchUsers() }, [user, page])

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
    </div>
  )
}
