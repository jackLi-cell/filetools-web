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

interface ToolConfig {
  id: number
  toolSlug: string
  name: string
  category: string
  enabled: boolean
  isFree: boolean
  creditsCost: number
  maxFileSizeMb: number
}

interface CategoryPaymentSetting {
  id: number
  category: string
  name: string
  paidEnabled: boolean
}

export default function AdminToolsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [tools, setTools] = useState<ToolConfig[]>([])
  const [categoryPaymentSettings, setCategoryPaymentSettings] = useState<CategoryPaymentSetting[]>([])
  const [editing, setEditing] = useState<Record<string, Partial<ToolConfig>>>({})

  useEffect(() => {
    if (!loading && !user) router.push("/admin/login?next=/admin/tools")
    else if (!loading && user?.role !== "admin") router.push("/admin/login")
  }, [loading, user, router])

  const fetchTools = () => {
    api.get<ToolConfig[]>("/api/admin/tools-config").then(res => {
      if (res.code === 0 && res.data) setTools(res.data)
    })
  }

  const fetchCategoryPaymentSettings = () => {
    api.get<CategoryPaymentSetting[]>("/api/admin/category-payment-settings").then(res => {
      if (res.code === 0 && res.data) setCategoryPaymentSettings(res.data)
    })
  }

  useEffect(() => {
    if (user?.role === "admin") {
      fetchTools()
      fetchCategoryPaymentSettings()
    }
  }, [user])

  const updateField = (slug: string, field: keyof ToolConfig, value: unknown) => {
    setEditing(prev => ({ ...prev, [slug]: { ...prev[slug], [field]: value } }))
  }

  const save = async (slug: string) => {
    const updates = editing[slug]
    if (!updates) return
    const res = await api.put(`/api/admin/tools-config/${slug}`, updates)
    if (res.code === 0) {
      setEditing(prev => { const next = { ...prev }; delete next[slug]; return next })
      fetchTools()
    } else {
      alert(res.message)
    }
  }

  const updateCategoryPaymentSetting = async (category: string, paidEnabled: boolean) => {
    const previous = categoryPaymentSettings
    setCategoryPaymentSettings(prev => prev.map(setting => (
      setting.category === category ? { ...setting, paidEnabled } : setting
    )))

    const res = await api.put(`/api/admin/category-payment-settings/${category}`, { paidEnabled })
    if (res.code !== 0) {
      setCategoryPaymentSettings(previous)
      alert(res.message)
    } else {
      fetchCategoryPaymentSettings()
    }
  }

  const getValue = <K extends keyof ToolConfig>(tool: ToolConfig, field: K): ToolConfig[K] => {
    const edit = editing[tool.toolSlug]
    return (edit?.[field] !== undefined ? edit[field] : tool[field]) as ToolConfig[K]
  }

  if (loading || !user || user.role !== "admin") return <div className="container mx-auto px-4 py-10">加载中...</div>

  const categories = Array.from(new Set(tools.map(t => t.category)))

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/admin" className="hover:text-gray-700">管理后台</Link>
        <span>/</span>
        <span className="text-gray-900">工具配置</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">工具配置</h1>
      <p className="text-sm text-gray-500 mb-6">调整后立即生效（缓存 60 秒后刷新）</p>

      <Card className="p-5 mb-8">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">模块付费开关</h2>
          <p className="text-xs text-gray-500 mt-1">默认关闭。关闭后该模块所有工具按免费处理，前端不显示积分，后端也不记录积分消耗。</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categoryPaymentSettings.map(setting => (
            <div key={setting.category} className="rounded border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{setting.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{setting.category}</p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={setting.paidEnabled}
                    onChange={(e) => updateCategoryPaymentSetting(setting.category, e.target.checked)}
                  />
                  收费
                </label>
              </div>
              <Badge className={setting.paidEnabled ? "mt-3 bg-blue-50 text-blue-700 border-blue-200" : "mt-3 bg-green-50 text-green-700 border-green-200"}>
                {setting.paidEnabled ? "按工具积分收费" : "免费模式"}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {categories.map(category => (
        <div key={category} className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-3 capitalize">{category}</h2>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">工具</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">启用</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">免费</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">积分</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">最大MB</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tools.filter(t => t.category === category).map(tool => {
                    const hasEdit = !!editing[tool.toolSlug]
                    return (
                      <tr key={tool.toolSlug} className={hasEdit ? "bg-yellow-50" : ""}>
                        <td className="px-3 py-2 text-gray-900">{tool.name}</td>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" checked={getValue(tool, "enabled")} onChange={(e) => updateField(tool.toolSlug, "enabled", e.target.checked)} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {tool.isFree ? <Badge className="bg-green-100 text-green-700">是</Badge> : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" value={getValue(tool, "creditsCost")} onChange={(e) => updateField(tool.toolSlug, "creditsCost", Number(e.target.value))} className="h-8 text-xs w-16 mx-auto" disabled={tool.isFree} />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" value={getValue(tool, "maxFileSizeMb")} onChange={(e) => updateField(tool.toolSlug, "maxFileSizeMb", Number(e.target.value))} className="h-8 text-xs w-16 mx-auto" />
                        </td>
                        <td className="px-3 py-2 text-right">
                          {hasEdit && <Button size="sm" onClick={() => save(tool.toolSlug)}>保存</Button>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ))}
    </div>
  )
}
