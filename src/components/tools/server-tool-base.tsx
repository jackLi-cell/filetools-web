"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { CategoryPaymentSetting } from "@/lib/payment-settings"

interface ServerToolProps {
  toolSlug: string
  accept?: string
  maxSizeMb?: number
  creditsCost?: number
  isLimitedFree?: boolean
  paramsSchema?: { name: string; label: string; type: "number" | "text" | "select"; default?: string | number; min?: number; max?: number; options?: { value: string; label: string }[] }[]
  acceptHint?: string
}

interface TaskResult {
  taskId: string
  status: "pending" | "processing" | "completed" | "failed" | "expired"
  errorMessage?: string
  outputFileName?: string
}

export function ServerToolBase({ toolSlug, accept = "*/*", maxSizeMb = 30, creditsCost = 0, isLimitedFree = false, paramsSchema = [], acceptHint }: ServerToolProps) {
  const { user, refresh } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [task, setTask] = useState<TaskResult | null>(null)
  const [error, setError] = useState("")
  const [effectiveCreditsCost, setEffectiveCreditsCost] = useState(0)
  const [effectiveLimitedFree, setEffectiveLimitedFree] = useState(false)
  const [params, setParams] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {}
    paramsSchema.forEach(p => { if (p.default !== undefined) defaults[p.name] = p.default })
    return defaults
  })

  useEffect(() => {
    let cancelled = false

    async function fetchPaymentSetting() {
      try {
        const [toolRes, settingsRes] = await Promise.all([
          api.get<{ category: string; isFree: boolean; creditsCost: number }>(`/api/tools/${toolSlug}`),
          api.get<CategoryPaymentSetting[]>("/api/tools/category-payment-settings"),
        ])

        if (cancelled) return

        const category = toolRes.data?.category
        const paidEnabled = settingsRes.data?.find((setting) => setting.category === category)?.paidEnabled === true
        const nextCreditsCost = paidEnabled && !toolRes.data?.isFree
          ? (toolRes.data?.creditsCost ?? creditsCost)
          : 0

        setEffectiveCreditsCost(nextCreditsCost)
        setEffectiveLimitedFree(paidEnabled && nextCreditsCost > 0 ? isLimitedFree : false)
      } catch {
        if (!cancelled) {
          setEffectiveCreditsCost(0)
          setEffectiveLimitedFree(false)
        }
      }
    }

    fetchPaymentSetting()

    return () => {
      cancelled = true
    }
  }, [creditsCost, isLimitedFree, toolSlug])

  const handleFile = useCallback((f: File | null) => {
    if (!f) return
    if (f.size > maxSizeMb * 1024 * 1024) {
      setError(`文件超过 ${maxSizeMb}MB 限制`)
      return
    }
    setFile(f)
    setTask(null)
    setError("")
  }, [maxSizeMb])

  const submit = async () => {
    if (!file) return
    setUploading(true)
    setError("")
    try {
      const uploadRes = await api.post<{ uploadUrl: string; fileKey: string }>("/api/process/upload", {
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        fileSize: file.size,
        toolSlug,
      })
      if (uploadRes.code !== 0 || !uploadRes.data) {
        setError(uploadRes.message || "上传失败")
        setUploading(false)
        return
      }

      await fetch(uploadRes.data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      })

      const taskRes = await api.post<{ taskId: string }>(`/api/process/${toolSlug}`, {
        fileKey: uploadRes.data.fileKey,
        fileName: file.name,
        fileSize: file.size,
        params,
      })

      if (taskRes.code !== 0 || !taskRes.data) {
        setError(taskRes.message || "任务提交失败")
        setUploading(false)
        return
      }

      setTask({ taskId: taskRes.data.taskId, status: "pending" })
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败")
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (!task || task.status === "completed" || task.status === "failed" || task.status === "expired") return
    const timer = setTimeout(async () => {
      const res = await api.get<TaskResult>(`/api/process/status/${task.taskId}`)
      if (res.code === 0 && res.data) {
        setTask(prev => prev ? { ...prev, ...res.data } : null)
        if (res.data.status === "completed" || res.data.status === "failed") {
          await refresh()
        }
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [task, refresh])

  const download = async () => {
    if (!task) return
    const res = await api.get<{ downloadUrl: string; fileName: string }>(`/api/process/download/${task.taskId}`)
    if (res.code === 0 && res.data) {
      const a = document.createElement("a")
      a.href = res.data.downloadUrl
      a.download = res.data.fileName
      a.click()
    } else {
      setError(res.message || "下载失败")
    }
  }

  const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`

  const needLogin = !effectiveLimitedFree && effectiveCreditsCost > 0 && !user
  const insufficientCredits = user && effectiveCreditsCost > 0 && user.credits < effectiveCreditsCost

  return (
    <div className="space-y-6">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => document.getElementById(`server-tool-${toolSlug}`)?.click()}
      >
        <input id={`server-tool-${toolSlug}`} type="file" accept={accept} className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
        {file ? (
          <div className="space-y-1">
            <p className="text-sm text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
          </div>
        ) : (
          <>
            <div className="text-3xl mb-3">📁</div>
            <p className="text-sm text-gray-600 mb-1">拖拽文件到此处，或点击选择</p>
            <p className="text-xs text-gray-400">{acceptHint || `最大 ${maxSizeMb}MB`}</p>
          </>
        )}
      </div>

      {file && paramsSchema.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
          {paramsSchema.map(p => (
            <div key={p.name}>
              <label className="text-xs text-gray-600 mb-1 block">{p.label}</label>
              {p.type === "select" && p.options ? (
                <select
                  value={String(params[p.name] || p.default || "")}
                  onChange={(e) => setParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                  className="w-full h-9 px-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {p.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  type={p.type}
                  value={String(params[p.name] || "")}
                  onChange={(e) => setParams(prev => ({ ...prev, [p.name]: p.type === "number" ? Number(e.target.value) : e.target.value }))}
                  min={p.min}
                  max={p.max}
                  className="w-full h-9 px-3 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">❌ {error}</div>}

      {file && !task && (
        <>
          {needLogin && <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">⚠️ 该工具需要登录后使用</div>}
          {insufficientCredits && <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">⚠️ 积分不足（需要 {effectiveCreditsCost} 积分，当前 {user!.credits}）</div>}
          <Button onClick={submit} disabled={uploading || needLogin || !!insufficientCredits} className="w-full">
            {uploading ? "上传中..." : effectiveCreditsCost > 0 && !effectiveLimitedFree ? `开始处理（消耗 ${effectiveCreditsCost} 积分）` : "开始处理"}
          </Button>
        </>
      )}

      {task && (
        <div className="p-4 bg-gray-50 rounded-lg">
          {task.status === "pending" && <p className="text-sm text-gray-700">⏳ 等待处理中...</p>}
          {task.status === "processing" && <p className="text-sm text-blue-700">⚙️ 正在处理...</p>}
          {task.status === "completed" && (
            <div className="space-y-2">
              <p className="text-sm text-green-700">✅ 处理完成</p>
              <Button onClick={download} className="w-full">下载结果</Button>
            </div>
          )}
          {task.status === "failed" && (
            <div className="space-y-2">
              <p className="text-sm text-red-700">❌ {task.errorMessage || "处理失败"}</p>
              <Button variant="outline" onClick={() => { setTask(null); setError("") }}>重试</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
