"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LockKeyhole, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { useAuth, type User } from "@/lib/auth-context"
import { getLocalePath, localizePath, normalizeAdminNextPath } from "@/lib/locale-path"

export default function AdminLoginPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, refresh, logout } = useAuth()
  const { locale, localePrefix } = getLocalePath(pathname)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nextPath, setNextPath] = useState(() => localizePath("/admin", locale))
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next")
    setNextPath(normalizeAdminNextPath(next, locale) || localizePath("/admin", locale))
  }, [locale])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const res = await api.post("/api/auth/login", { email, password })
      if (res.code !== 0) {
        setError(res.message || "登录失败")
        return
      }

      await refresh()
      const session = await api.get<User | null>("/api/auth/session")
      if (session.code === 0 && session.data?.role === "admin") {
        router.push(nextPath)
        return
      }

      await logout()
      setError("当前账号不是管理员账号，不能进入后台。")
    } catch {
      setError("网络错误，请重试")
    } finally {
      setSubmitting(false)
    }
  }

  const switchAccount = async () => {
    await logout()
    setError("")
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10">
        <div className="grid w-full gap-8 md:grid-cols-[1fr_420px] md:items-center">
          <div className="hidden md:block">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="max-w-xl text-3xl font-semibold leading-tight text-gray-950">
              灵猫后台管理系统
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-gray-600">
              用于管理用户、积分、工具配置、AI 上游和站点运行数据。后台与前台用户页面完全隔离。
            </p>
          </div>

          <Card className="rounded-lg border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold text-gray-950">管理员登录</h2>
              <p className="mt-1 text-sm text-gray-500">请输入管理员账号继续访问后台。</p>
            </div>

            {!loading && user && user.role !== "admin" ? (
              <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">当前登录账号无后台权限</p>
                <p className="text-xs leading-5 text-amber-800">
                  当前账号：{user.email}。请退出后使用管理员账号登录。
                </p>
                <Button type="button" variant="outline" className="w-full" onClick={switchAccount}>
                  切换账号
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-700">邮箱</label>
                  <Input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-700">密码</label>
                  <Input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                  />
                </div>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <Button type="submit" className="w-full" disabled={submitting || loading}>
                  {submitting ? "登录中..." : "进入后台"}
                </Button>
              </form>
            )}

            <div className="mt-6 border-t border-gray-100 pt-4 text-center">
              <Link href={localePrefix} className="text-xs text-gray-500 hover:text-gray-900">
                返回前台
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}
