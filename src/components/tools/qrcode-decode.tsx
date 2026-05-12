"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"

export function QrCodeDecodeTool() {
  const [result, setResult] = useState("")
  const [error, setError] = useState("")
  const [fileName, setFileName] = useState("")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const decodeFromImage = async (file: File) => {
    setFileName(file.name)
    setResult("")
    setError("")

    const img = new Image()
    img.onload = async () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      try {
        const jsQR = (await import("jsqr")).default
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code) {
          setResult(code.data)
        } else {
          setError("未检测到二维码，请确保图片中包含清晰的二维码")
        }
      } catch {
        setError("解码失败，请尝试其他图片")
      }
    }
    img.src = URL.createObjectURL(file)
  }

  return (
    <div className="space-y-6">
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-gray-300"
        onClick={() => document.getElementById("qr-decode-input")?.click()}
      >
        <input
          id="qr-decode-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && decodeFromImage(e.target.files[0])}
        />
        {fileName ? (
          <p className="text-sm text-gray-700">{fileName}</p>
        ) : (
          <>
            <div className="text-3xl mb-3">📷</div>
            <p className="text-sm text-gray-600 mb-1">点击上传包含二维码的图片</p>
            <p className="text-xs text-gray-400">支持 PNG、JPG、WebP 等格式</p>
          </>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">❌ {error}</div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">识别结果</span>
            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(result)}>复制</Button>
          </div>
          <div className="p-3 bg-gray-50 border rounded-lg">
            <p className="text-sm font-mono break-all">{result}</p>
          </div>
          {result.startsWith("http") && (
            <a href={result} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
              打开链接 →
            </a>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
