"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { DownloadFileCard } from "@/components/ai/download-file-card"

type TaskStatus = "pending" | "processing" | "completed" | "failed" | "expired"

interface TaskResult {
  taskId: string
  status: TaskStatus
  errorMessage?: string | null
  outputFileName?: string | null
}

interface ProcessTaskCardProps {
  toolSlug: string
  taskId: string
  title?: string
  description?: string
  creditsCost?: number
  fileCount?: number
}

function inferDownloadName(name?: string | null, fallback?: string): string {
  return name || fallback || "ai-result"
}

export function ProcessTaskCard({
  toolSlug,
  taskId,
  title,
  description,
  creditsCost,
  fileCount,
}: ProcessTaskCardProps) {
  const [task, setTask] = useState<TaskResult | null>(null)
  const [downloadUrl, setDownloadUrl] = useState("")
  const [downloadName, setDownloadName] = useState("")
  const taskStatus = task?.status ?? "pending"

  const statusText = useMemo(() => {
    if (taskStatus === "completed") return "已完成"
    if (taskStatus === "processing") return "处理中"
    if (taskStatus === "failed") return "处理失败"
    if (taskStatus === "expired") return "已过期"
    return "等待中"
  }, [taskStatus])

  const refresh = useCallback(async (): Promise<TaskStatus | null> => {
    const res = await api.get<TaskResult>(`/api/process/status/${taskId}`)
    if (res.code !== 0 || !res.data) return null
    setTask(res.data)
    if (res.data.status === "completed") {
      const dl = await api.get<{ downloadUrl: string; fileName: string }>(`/api/process/download/${taskId}`)
      if (dl.code === 0 && dl.data) {
        setDownloadUrl(dl.data.downloadUrl)
        setDownloadName(inferDownloadName(dl.data.fileName, res.data.outputFileName || undefined))
      }
    }
    return res.data.status
  }, [taskId])

  useEffect(() => {
    let timer: number | undefined
    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      const nextStatus = await refresh()
      if (nextStatus === "completed" || nextStatus === "failed" || nextStatus === "expired") return
      timer = window.setTimeout(tick, 2000)
    }

    void tick()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [refresh])

  return (
    <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/80 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {title || toolSlug}
          </p>
          <p className="mt-0.5 text-xs text-gray-600">
            {description || "服务端任务已提交，正在复用现有处理链路。"}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600">
          {statusText}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] text-gray-500">
        <span>任务号 {taskId.slice(0, 8)}</span>
        {typeof fileCount === "number" ? <span>{fileCount} 个文件</span> : null}
        {typeof creditsCost === "number" ? <span>{creditsCost} 积分</span> : null}
      </div>

      {taskStatus === "processing" ? (
        <p className="text-sm text-blue-700">正在执行后端文件处理流程。</p>
      ) : null}
      {taskStatus === "failed" ? (
        <p className="text-sm text-red-700">{task?.errorMessage || "处理失败"}</p>
      ) : null}
      {taskStatus === "completed" && downloadUrl ? (
        <DownloadFileCard
          name={downloadName || inferDownloadName(task?.outputFileName)}
          url={downloadUrl}
        />
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
          刷新状态
        </Button>
      </div>
    </div>
  )
}
