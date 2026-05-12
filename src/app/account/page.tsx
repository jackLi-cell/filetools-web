"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface Profile {
  id: number
  email: string
  name: string | null
  credits: number
  totalEarned: number
  totalSpent: number
  consecutiveCheckin: number
  createdAt: string
}

export default function AccountPage() {
  const router = useRouter()
  const { user, loading, refresh } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [checkinMsg, setCheckinMsg] = useState("")
  const [checkinLoading, setCheckinLoading] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [loading, user, router])

  useEffect(() => {
    if (user) {
      api.get<Profile>("/api/account/profile").then(res => {
        if (res.code === 0 && res.data) setProfile(res.data)
      })
    }
  }, [user])

  const handleCheckin = async () => {
    setCheckinLoading(true)
    setCheckinMsg("")
    const res = await api.post<{ bonus: number; streak: number; credits: number }>("/api/account/checkin")
    if (res.code === 0 && res.data) {
      setCheckinMsg(`签到成功，获得 ${res.data.bonus} 积分！连续签到 ${res.data.streak} 天`)
      await refresh()
      const updated = await api.get<Profile>("/api/account/profile")
      if (updated.code === 0 && updated.data) setProfile(updated.data)
    } else {
      setCheckinMsg(res.message || "签到失败")
    }
    setCheckinLoading(false)
  }

  if (loading || !profile) return <div className="container mx-auto px-4 py-10">加载中...</div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">个人中心</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 bg-blue-50 border-blue-200">
          <p className="text-xs text-blue-600 mb-1">当前积分</p>
          <p className="text-2xl font-bold text-blue-900">{profile.credits}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 mb-1">累计获得</p>
          <p className="text-xl font-semibold text-gray-900">{profile.totalEarned}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 mb-1">累计消耗</p>
          <p className="text-xl font-semibold text-gray-900">{profile.totalSpent}</p>
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">每日签到</h3>
            <p className="text-xs text-gray-500">每天签到送 5 积分，连续 7 天额外 +20 积分</p>
            {profile.consecutiveCheckin > 0 && <p className="text-xs text-green-600 mt-1">已连续签到 {profile.consecutiveCheckin} 天</p>}
            {checkinMsg && <p className="text-xs text-blue-600 mt-1">{checkinMsg}</p>}
          </div>
          <Button onClick={handleCheckin} disabled={checkinLoading}>{checkinLoading ? "签到中..." : "立即签到"}</Button>
        </div>
      </Card>

      <Card className="p-5 mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">账号信息</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-gray-500">邮箱</dt><dd className="text-gray-900">{profile.email}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">昵称</dt><dd className="text-gray-900">{profile.name || "-"}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">注册时间</dt><dd className="text-gray-900">{new Date(profile.createdAt).toLocaleString("zh-CN")}</dd></div>
        </dl>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/account/credits">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-sm font-medium text-gray-900 mb-1">积分明细</h3>
            <p className="text-xs text-gray-500">查看积分收支记录</p>
          </Card>
        </Link>
        <Link href="/account/history">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-sm font-medium text-gray-900 mb-1">使用历史</h3>
            <p className="text-xs text-gray-500">查看文件处理记录</p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
