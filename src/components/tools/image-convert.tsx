"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"

export function ImageConvertTool() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState("")
  const [format, setFormat] = useState("image/png")
  const [result, setResult] = useState("")
  const [resultSize, setResultSize] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  const formats = [
    { value: "image/png", label: "PNG", ext: "png" },
    { value: "image/jpeg", label: "JPG", ext: "jpg" },
    { value: "image/webp", label: "WebP", ext: "webp" },
    { value: "image/bmp", label: "BMP", ext: "bmp" },
  ]

  const handleFile = useCallback((f: File | null) => {
    if (!f || !f.type.startsWith("image/")) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult("")
  }, [])

  const convert = () => {
    if (!file) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (!blob) return
        setResult(URL.createObjectURL(blob))
        setResultSize(blob.size)
      }, format, format === "image/jpeg" ? 0.92 : undefined)
    }
    img.src = URL.createObjectURL(file)
  }

  const download = () => {
    if (!result) return
    const ext = formats.find(f => f.value === format)?.ext || "png"
    const a = document.createElement("a")
    a.href = result
    a.download = `converted.${ext}`
    a.click()
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div className="space-y-6">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => document.getElementById("convert-input")?.click()}
      >
        <input
          id="convert-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />
        {preview ? (
          <div className="space-y-2">
            <img src={preview} alt="preview" className="max-h-48 mx-auto rounded" />
            <p className="text-sm text-gray-600">{file?.name} ({formatSize(file?.size || 0)})</p>
          </div>
        ) : (
          <>
            <div className="text-3xl mb-3">🖼️</div>
            <p className="text-sm text-gray-600 mb-1">拖拽图片到此处，或点击选择</p>
            <p className="text-xs text-gray-400">支持 PNG、JPG、WebP、GIF、BMP</p>
          </>
        )}
      </div>

      {file && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="text-xs text-gray-600 mb-2 block">目标格式</label>
          <div className="flex gap-2 flex-wrap">
            {formats.map((f) => (
              <button
                key={f.value}
                onClick={() => { setFormat(f.value); setResult("") }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  format === f.value
                    ? "bg-blue-600 text-white"
                    : "bg-white border text-gray-700 hover:bg-gray-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {file && !result && (
        <Button onClick={convert} className="w-full">转换为 {formats.find(f => f.value === format)?.label}</Button>
      )}

      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-green-800">转换完成 ({formatSize(resultSize)})</p>
            <Button size="sm" onClick={download}>下载</Button>
          </div>
        </div>
      )}
    </div>
  )
}
