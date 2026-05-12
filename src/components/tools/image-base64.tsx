"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function ImageBase64Tool() {
  const [mode, setMode] = useState<"toBase64" | "toImage">("toBase64")
  const [base64, setBase64] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [fileName, setFileName] = useState("")
  const [copied, setCopied] = useState(false)

  const fileToBase64 = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setBase64(result)
      setImageUrl(result)
    }
    reader.readAsDataURL(file)
  }

  const base64ToImage = () => {
    let src = base64.trim()
    if (!src.startsWith("data:")) {
      src = `data:image/png;base64,${src}`
    }
    setImageUrl(src)
  }

  const copy = async () => {
    await navigator.clipboard.writeText(base64)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    if (!imageUrl) return
    const a = document.createElement("a")
    a.href = imageUrl
    a.download = "image_from_base64.png"
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => { setMode("toBase64"); setBase64(""); setImageUrl("") }} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "toBase64" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>
          图片 → Base64
        </button>
        <button onClick={() => { setMode("toImage"); setBase64(""); setImageUrl("") }} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "toImage" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>
          Base64 → 图片
        </button>
      </div>

      {mode === "toBase64" ? (
        <div className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-gray-300"
            onClick={() => document.getElementById("b64-input")?.click()}
          >
            <input id="b64-input" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && fileToBase64(e.target.files[0])} />
            {fileName ? <p className="text-sm text-gray-700">{fileName}</p> : (
              <>
                <div className="text-3xl mb-2">🖼️</div>
                <p className="text-sm text-gray-600">点击选择图片</p>
              </>
            )}
          </div>
          {base64 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Base64 编码（{(base64.length / 1024).toFixed(1)} KB）</span>
                <Button variant="ghost" size="sm" onClick={copy}>{copied ? "已复制" : "复制"}</Button>
              </div>
              <textarea className="w-full h-32 p-3 border rounded-lg text-xs font-mono resize-y" value={base64} readOnly />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <textarea
            className="w-full h-32 p-3 border rounded-lg text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="粘贴 Base64 编码（支持带 data:image/... 前缀或纯 Base64）"
            value={base64}
            onChange={(e) => setBase64(e.target.value)}
          />
          <Button onClick={base64ToImage} disabled={!base64.trim()}>转换为图片</Button>
          {imageUrl && (
            <div className="space-y-3">
              <img src={imageUrl} alt="result" className="max-h-64 rounded border mx-auto" />
              <Button variant="outline" onClick={download} className="w-full">下载图片</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
