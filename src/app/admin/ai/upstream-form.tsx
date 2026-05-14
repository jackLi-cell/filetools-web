"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface UpstreamFormValues {
  name: string
  baseUrl: string
  apiKey: string
  model: string
  visionModel?: string
  priority: number
  enabled: boolean
}

export interface UpstreamRecord extends UpstreamFormValues {
  id: number
  apiKeyMasked?: string
}

interface UpstreamFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: UpstreamRecord | null
  onSubmit: (values: UpstreamFormValues) => Promise<{ ok: boolean; message?: string }>
}

const DEFAULT_VALUES: UpstreamFormValues = {
  name: "",
  baseUrl: "",
  apiKey: "",
  model: "",
  visionModel: "",
  priority: 1,
  enabled: true,
}

interface FieldError {
  name?: string
  baseUrl?: string
  apiKey?: string
  model?: string
  priority?: string
}

function validate(values: UpstreamFormValues, isEdit: boolean): FieldError {
  const errs: FieldError = {}
  const trimmedName = values.name.trim()
  if (trimmedName.length < 1 || trimmedName.length > 50) {
    errs.name = "name 长度需 1-50"
  }
  try {
    if (!values.baseUrl) throw new Error()
    const url = new URL(values.baseUrl)
    if (!url.protocol.startsWith("http")) throw new Error()
  } catch {
    errs.baseUrl = "请输入合法的 http(s) URL"
  }
  if (!isEdit && !values.apiKey.trim()) {
    errs.apiKey = "新增时 apiKey 必填"
  }
  if (!values.model.trim()) {
    errs.model = "model 必填"
  }
  if (!Number.isFinite(values.priority) || values.priority < 1 || values.priority > 999) {
    errs.priority = "priority 范围 1-999"
  }
  return errs
}

export function UpstreamForm({ open, onOpenChange, initial, onSubmit }: UpstreamFormProps) {
  const isEdit = !!initial
  const [values, setValues] = useState<UpstreamFormValues>(DEFAULT_VALUES)
  const [errors, setErrors] = useState<FieldError>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (initial) {
        setValues({
          name: initial.name,
          baseUrl: initial.baseUrl,
          apiKey: "",
          model: initial.model,
          visionModel: initial.visionModel ?? "",
          priority: initial.priority ?? 1,
          enabled: initial.enabled ?? true,
        })
      } else {
        setValues(DEFAULT_VALUES)
      }
      setErrors({})
      setServerError(null)
    }
  }, [open, initial])

  const update = <K extends keyof UpstreamFormValues>(key: K, val: UpstreamFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  const handleSubmit = async () => {
    const v = validate(values, isEdit)
    setErrors(v)
    if (Object.keys(v).length > 0) return
    setSubmitting(true)
    setServerError(null)
    try {
      const res = await onSubmit({
        ...values,
        name: values.name.trim(),
        baseUrl: values.baseUrl.trim(),
        model: values.model.trim(),
        visionModel: values.visionModel?.trim() || undefined,
      })
      if (res.ok) {
        onOpenChange(false)
      } else {
        setServerError(res.message || "保存失败")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑上游" : "新增上游"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "修改 AI 上游配置。apiKey 留空表示不修改。"
              : "新增一个 AI 上游配置（OpenAI 兼容协议）"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">名称</label>
            <Input
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="例如：openrouter-deepseek"
              maxLength={50}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Base URL</label>
            <Input
              value={values.baseUrl}
              onChange={(e) => update("baseUrl", e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
            {errors.baseUrl && <p className="text-xs text-red-600 mt-1">{errors.baseUrl}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
            <Input
              type="password"
              value={values.apiKey}
              onChange={(e) => update("apiKey", e.target.value)}
              placeholder={
                isEdit
                  ? initial?.apiKeyMasked
                    ? `当前：${initial.apiKeyMasked}（留空不修改）`
                    : "留空表示不修改"
                  : "sk-..."
              }
            />
            {errors.apiKey && <p className="text-xs text-red-600 mt-1">{errors.apiKey}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">主模型</label>
            <Input
              value={values.model}
              onChange={(e) => update("model", e.target.value)}
              placeholder="gpt-4o-mini"
            />
            {errors.model && <p className="text-xs text-red-600 mt-1">{errors.model}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Vision 模型 <span className="text-gray-400">（可选）</span>
            </label>
            <Input
              value={values.visionModel ?? ""}
              onChange={(e) => update("visionModel", e.target.value)}
              placeholder="gpt-4o（留空表示不支持图片识别）"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">优先级</label>
              <Input
                type="number"
                min={1}
                max={999}
                value={values.priority}
                onChange={(e) => update("priority", Number(e.target.value))}
              />
              {errors.priority && <p className="text-xs text-red-600 mt-1">{errors.priority}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">启用</label>
              <label className="inline-flex items-center gap-2 h-8 px-2.5 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={values.enabled}
                  onChange={(e) => update("enabled", e.target.checked)}
                />
                启用此上游
              </label>
            </div>
          </div>

          {serverError && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {serverError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
