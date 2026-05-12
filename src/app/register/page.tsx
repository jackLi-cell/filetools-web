"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

export default function RegisterPage() {
  const router = useRouter()
  const { refresh } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) { setError("请先阅读并同意服务条款"); return }
    setError("")
    setLoading(true)
    try {
      const res = await api.post("/api/auth/register", { email, password, name: name || undefined })
      if (res.code === 0) {
        await refresh()
        router.push("/account")
      } else {
        setError(res.message || "注册失败")
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
        <h1 className="text-xl font-semibold text-gray-900 mb-2">注册账号</h1>
        <p className="text-sm text-gray-500 mb-6">注册即送 100 积分，可使用全部高级工具</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-700 mb-1.5 block">邮箱</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-1.5 block">密码</label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 8 位，包含字母和数字" minLength={8} />
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-1.5 block">昵称（可选）</label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="显示名称" maxLength={50} />
          </div>
          <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 rounded" />
            <span>
              我已阅读并同意
              <Link href="/pages/privacy" target="_blank" className="text-blue-600 hover:underline mx-1">《隐私政策》</Link>
              和
              <Link href="/pages/disclaimer" target="_blank" className="text-blue-600 hover:underline mx-1">《免责声明》</Link>
            </span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "注册中..." : "注册"}</Button>
        </form>

        <p className="text-sm text-gray-500 mt-6 text-center">
          已有账号？<Link href="/login" className="text-blue-600 hover:underline">立即登录</Link>
        </p>
      </Card>
    </div>
  )
}
