"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useAuth, type User } from "@/lib/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { refresh } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [nextPath, setNextPath] = useState<string | null>(null)

  useEffect(() => {
    setNextPath(new URLSearchParams(window.location.search).get("next"))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await api.post("/api/auth/login", { email, password })
      if (res.code === 0) {
        await refresh()
        const session = await api.get<User | null>("/api/auth/session")
        const safeNext = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : null
        if (session.code === 0 && session.data?.role === "admin") {
          router.push(safeNext || "/admin")
        } else {
          router.push(safeNext || "/account")
        }
      } else {
        setError(res.message || "登录失败")
      }
    } catch {
      setError("网络错误，请重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card className="p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">登录</h1>
        <p className="text-sm text-gray-500 mb-6">登录后可使用高级功能并管理账户积分</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-700 mb-1.5 block">邮箱</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-1.5 block">密码</label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 8 位" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "登录中..." : "登录"}</Button>
        </form>

        <p className="text-sm text-gray-500 mt-6 text-center">
          还没有账号？<Link href="/register" className="text-blue-600 hover:underline">立即注册</Link>
        </p>
      </Card>
    </div>
  )
}
