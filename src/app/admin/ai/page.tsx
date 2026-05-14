"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { UpstreamForm, type UpstreamFormValues, type UpstreamRecord } from "./upstream-form"

interface Upstream {
  id: number
  name: string
  baseUrl: string
  apiKeyMasked: string
  model: string
  visionModel?: string | null
  priority: number
  enabled: boolean
  failCount: number
  totalCalls: number
  totalErrors: number
  lastError?: string | null
  healthyAt?: string | null
}

type TestState = { running: boolean; result?: { ok: boolean; latencyMs?: number; error?: string } }

type SettingsMap = Record<string, string>

interface UsageRow {
  date: string
  upstreamName: string | null
  totalCalls: number
  anonCalls: number
  authCalls: number
  totalErrors: number
  totalDurMs: string
  inputTokens: string
  outputTokens: string
}

interface UsageData {
  rows: UsageRow[]
  summary: {
    todayTotal: number
    todayAnonymous: number
    todayLoggedIn: number
    avgLatencyMs: number
    errorRate: number
  }
}

function formatHealthAge(healthyAt: string | null | undefined): string {
  if (!healthyAt) return "—"
  const ts = new Date(healthyAt).getTime()
  if (Number.isNaN(ts)) return "—"
  const diff = Math.max(0, Date.now() - ts)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

function isHealthy(u: Upstream): boolean {
  if (!u.enabled) return false
  if (u.failCount >= 3) {
    if (!u.healthyAt) return false
    const since = Date.now() - new Date(u.healthyAt).getTime()
    if (since < 10 * 60 * 1000) return false
  }
  return true
}

export default function AdminAiPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [tab, setTab] = useState<string>("upstreams")

  // upstreams tab
  const [upstreams, setUpstreams] = useState<Upstream[]>([])
  const [loadingUpstreams, setLoadingUpstreams] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<UpstreamRecord | null>(null)
  const [testStates, setTestStates] = useState<Record<number, TestState>>({})

  // settings tab
  const [settings, setSettings] = useState<SettingsMap>({})
  const [settingsDirty, setSettingsDirty] = useState<Partial<SettingsMap>>({})
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null)

  // usage tab
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [usageDays, setUsageDays] = useState<number>(7)
  const [loadingUsage, setLoadingUsage] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/admin/ai")
    else if (!loading && user?.role !== "admin") router.push("/account")
  }, [loading, user, router])

  const fetchUpstreams = async () => {
    setLoadingUpstreams(true)
    const res = await api.get<Upstream[]>("/api/admin/ai/upstreams")
    if (res.code === 0 && res.data) setUpstreams(res.data)
    setLoadingUpstreams(false)
  }

  const fetchSettings = async () => {
    const res = await api.get<SettingsMap>("/api/admin/ai/settings")
    if (res.code === 0 && res.data) {
      setSettings(res.data)
      setSettingsDirty({})
    }
  }

  const fetchUsage = async (days: number) => {
    setLoadingUsage(true)
    const res = await api.get<UsageData>(`/api/admin/ai/usage?days=${days}`)
    if (res.code === 0 && res.data) setUsage(res.data)
    setLoadingUsage(false)
  }

  useEffect(() => {
    if (user?.role !== "admin") return
    if (tab === "upstreams") fetchUpstreams()
    if (tab === "settings") fetchSettings()
    if (tab === "usage") fetchUsage(usageDays)
  }, [user, tab, usageDays])

  const onCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const onEdit = (u: Upstream) => {
    setEditing({
      id: u.id,
      name: u.name,
      baseUrl: u.baseUrl,
      apiKey: "",
      apiKeyMasked: u.apiKeyMasked,
      model: u.model,
      visionModel: u.visionModel ?? "",
      priority: u.priority,
      enabled: u.enabled,
    })
    setFormOpen(true)
  }

  const onSubmitForm = async (values: UpstreamFormValues) => {
    if (editing) {
      const payload: Partial<UpstreamFormValues> = { ...values }
      if (!values.apiKey) delete payload.apiKey
      const res = await api.patch(`/api/admin/ai/upstreams/${editing.id}`, payload)
      if (res.code === 0) {
        await fetchUpstreams()
        return { ok: true }
      }
      return { ok: false, message: res.message || "保存失败" }
    }
    const res = await api.post("/api/admin/ai/upstreams", values)
    if (res.code === 0) {
      await fetchUpstreams()
      return { ok: true }
    }
    return { ok: false, message: res.message || "保存失败" }
  }

  const onToggleEnabled = async (u: Upstream) => {
    const res = await api.patch(`/api/admin/ai/upstreams/${u.id}`, { enabled: !u.enabled })
    if (res.code === 0) await fetchUpstreams()
    else alert(res.message)
  }

  const onDelete = async (u: Upstream) => {
    if (!confirm(`确定要删除上游"${u.name}"吗？此操作不可撤销。`)) return
    const res = await api.delete(`/api/admin/ai/upstreams/${u.id}`)
    if (res.code === 0) await fetchUpstreams()
    else alert(res.message)
  }

  const onTest = async (u: Upstream) => {
    setTestStates((prev) => ({ ...prev, [u.id]: { running: true } }))
    const res = await api.post<{ ok: boolean; latencyMs?: number; error?: string }>(
      `/api/admin/ai/upstreams/${u.id}/test`,
      {}
    )
    const result =
      res.code === 0 && res.data
        ? { ok: !!res.data.ok, latencyMs: res.data.latencyMs, error: res.data.error }
        : { ok: false, error: res.message || "请求失败" }
    setTestStates((prev) => ({ ...prev, [u.id]: { running: false, result } }))
    // refresh row stats
    fetchUpstreams()
    setTimeout(() => {
      setTestStates((prev) => {
        const next = { ...prev }
        delete next[u.id]
        return next
      })
    }, 8000)
  }

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSettingsDirty((prev) => ({ ...prev, [key]: value }))
  }

  const onSaveSettings = async () => {
    if (Object.keys(settingsDirty).length === 0) return
    setSavingSettings(true)
    setSettingsMessage(null)
    const res = await api.patch("/api/admin/ai/settings", settingsDirty)
    setSavingSettings(false)
    if (res.code === 0) {
      setSettingsDirty({})
      setSettingsMessage("已保存（最多 30 秒缓存后生效）")
      setTimeout(() => setSettingsMessage(null), 3000)
    } else {
      setSettingsMessage(res.message || "保存失败")
    }
  }

  const aiEnabled = useMemo(() => settings["ai.enabled"] === "true", [settings])
  const systemPrompt = settings["ai.system_prompt"] ?? ""

  if (loading || !user || user.role !== "admin") {
    return <div className="container mx-auto px-4 py-10">加载中...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/admin" className="hover:text-gray-700">
          管理后台
        </Link>
        <span>/</span>
        <span className="text-gray-900">AI 助手</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">AI 助手管理</h1>
      <p className="text-sm text-gray-500 mb-6">
        管理灵猫助手的 AI 上游、全局开关与系统提示词，查看用量统计
      </p>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList>
          <TabsTrigger value="upstreams">上游列表</TabsTrigger>
          <TabsTrigger value="settings">全局设置</TabsTrigger>
          <TabsTrigger value="usage">用量统计</TabsTrigger>
        </TabsList>

        <TabsContent value="upstreams">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs text-gray-500">
              按 priority 升序选择上游；连续失败 3 次后会被熔断 10 分钟
            </p>
            <Button size="sm" onClick={onCreate}>
              新增上游
            </Button>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">名称</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">模型</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">优先级</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">启用</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">健康</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">失败计数</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">总调用</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">错误数</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">最近错误</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loadingUpstreams && upstreams.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-3 py-6 text-center text-gray-400">
                        加载中...
                      </td>
                    </tr>
                  )}
                  {!loadingUpstreams && upstreams.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-3 py-6 text-center text-gray-400">
                        暂无上游配置，点击右上角「新增上游」创建
                      </td>
                    </tr>
                  )}
                  {upstreams.map((u) => {
                    const test = testStates[u.id]
                    const healthy = isHealthy(u)
                    return (
                      <tr key={u.id}>
                        <td className="px-3 py-2 text-gray-900">
                          <div className="font-medium">{u.name}</div>
                          <div className="text-[11px] text-gray-400">{u.baseUrl}</div>
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          <div>{u.model}</div>
                          {u.visionModel && (
                            <div className="text-[11px] text-gray-400">vision: {u.visionModel}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700">{u.priority}</td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={u.enabled}
                            onChange={() => onToggleEnabled(u)}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              healthy ? "bg-green-500" : "bg-red-500"
                            }`}
                            title={
                              healthy
                                ? `健康，最近成功 ${formatHealthAge(u.healthyAt)}`
                                : `异常（失败 ${u.failCount} 次）`
                            }
                          />
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700">{u.failCount}</td>
                        <td className="px-3 py-2 text-center text-gray-700">{u.totalCalls}</td>
                        <td className="px-3 py-2 text-center text-gray-700">{u.totalErrors}</td>
                        <td className="px-3 py-2 max-w-[220px]">
                          {u.lastError ? (
                            <span
                              className="block truncate text-[11px] text-red-600"
                              title={u.lastError}
                            >
                              {u.lastError}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                          <Button size="sm" variant="outline" onClick={() => onEdit(u)}>
                            编辑
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onTest(u)}
                            disabled={test?.running}
                          >
                            {test?.running ? "测试中..." : "测试"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => onDelete(u)}
                          >
                            删除
                          </Button>
                          {test?.result && (
                            <div
                              className={`mt-1 text-[11px] ${
                                test.result.ok ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {test.result.ok
                                ? `OK · ${test.result.latencyMs ?? 0}ms`
                                : `失败：${test.result.error || "-"}`}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="p-5 space-y-5">
            <div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">AI 助手开关</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    关闭后首页 AI 输入框将隐藏（最多 30 秒缓存）
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={aiEnabled}
                    onChange={(e) => updateSetting("ai.enabled", e.target.checked ? "true" : "false")}
                  />
                  {aiEnabled ? "已开启" : "已关闭"}
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">系统提示词</h3>
              <p className="text-xs text-gray-500 mb-2">
                作为对话的 system prompt 传给模型；留空将使用代码内置默认值
              </p>
              <textarea
                value={systemPrompt}
                onChange={(e) => updateSetting("ai.system_prompt", e.target.value)}
                placeholder="例如：你是灵猫助手，一个文件处理工具网站的 AI 助理..."
                rows={10}
                className="block w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-6 text-gray-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={onSaveSettings} disabled={savingSettings || Object.keys(settingsDirty).length === 0}>
                {savingSettings ? "保存中..." : "保存"}
              </Button>
              {settingsMessage && (
                <span className="text-xs text-gray-500">{settingsMessage}</span>
              )}
              <span className="ml-auto text-xs text-gray-400">修改后立即生效（最多 30 秒缓存）</span>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="usage">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500">查看最近 N 天的 AI 调用统计</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">区间</span>
              <Input
                type="number"
                min={1}
                max={90}
                value={usageDays}
                onChange={(e) => setUsageDays(Math.min(90, Math.max(1, Number(e.target.value) || 7)))}
                className="w-20 text-center"
              />
              <span className="text-xs text-gray-500">天</span>
            </div>
          </div>

          {usage && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <Card className="p-4">
                  <p className="text-xs text-gray-500 mb-1">今日总次数</p>
                  <p className="text-xl font-bold text-gray-900">{usage.summary.todayTotal}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500 mb-1">今日匿名</p>
                  <p className="text-xl font-bold text-gray-700">{usage.summary.todayAnonymous}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500 mb-1">今日登录</p>
                  <p className="text-xl font-bold text-blue-700">{usage.summary.todayLoggedIn}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500 mb-1">平均耗时</p>
                  <p className="text-xl font-bold text-gray-900">
                    {Math.round(usage.summary.avgLatencyMs)} ms
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500 mb-1">错误率</p>
                  <p className={`text-xl font-bold ${usage.summary.errorRate > 0.05 ? "text-red-600" : "text-gray-900"}`}>
                    {(usage.summary.errorRate * 100).toFixed(2)}%
                  </p>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">日期</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">上游</th>
                        <th className="text-center px-3 py-2 font-medium text-gray-600">总次数</th>
                        <th className="text-center px-3 py-2 font-medium text-gray-600">匿名</th>
                        <th className="text-center px-3 py-2 font-medium text-gray-600">登录</th>
                        <th className="text-center px-3 py-2 font-medium text-gray-600">错误</th>
                        <th className="text-center px-3 py-2 font-medium text-gray-600">平均耗时</th>
                        <th className="text-center px-3 py-2 font-medium text-gray-600">输入 Token</th>
                        <th className="text-center px-3 py-2 font-medium text-gray-600">输出 Token</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {loadingUsage && usage.rows.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-3 py-6 text-center text-gray-400">
                            加载中...
                          </td>
                        </tr>
                      )}
                      {!loadingUsage && usage.rows.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-3 py-6 text-center text-gray-400">
                            暂无数据
                          </td>
                        </tr>
                      )}
                      {usage.rows.map((row, idx) => (
                        <tr key={`${row.date}-${row.upstreamName ?? "legacy"}-${idx}`}>
                          <td className="px-3 py-2 text-gray-700">{row.date}</td>
                          <td className="px-3 py-2 text-gray-700">{row.upstreamName ?? "(legacy)"}</td>
                          <td className="px-3 py-2 text-center text-gray-900 font-medium">
                            {row.totalCalls}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-700">
                            {row.anonCalls}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-700">
                            {row.authCalls}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {row.totalErrors > 0 ? (
                              <Badge className="bg-red-100 text-red-700">{row.totalErrors}</Badge>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-700">
                            {row.totalCalls > 0
                              ? Math.round(Number(row.totalDurMs) / row.totalCalls)
                              : 0} ms
                          </td>
                          <td className="px-3 py-2 text-center text-gray-700">{row.inputTokens}</td>
                          <td className="px-3 py-2 text-center text-gray-700">{row.outputTokens}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      <UpstreamForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={onSubmitForm}
      />
    </div>
  )
}
