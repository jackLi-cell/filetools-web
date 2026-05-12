"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import QRCode from "qrcode"

export function QrCodeGenerateTool() {
  const [text, setText] = useState("")
  const [size, setSize] = useState(256)
  const [color, setColor] = useState("#000000")
  const [bgColor, setBgColor] = useState("#ffffff")
  const [qrUrl, setQrUrl] = useState("")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!text.trim()) {
      setQrUrl("")
      return
    }
    const generate = async () => {
      try {
        const url = await QRCode.toDataURL(text, {
          width: size,
          margin: 2,
          color: { dark: color, light: bgColor },
          errorCorrectionLevel: "M",
        })
        setQrUrl(url)
      } catch {
        setQrUrl("")
      }
    }
    generate()
  }, [text, size, color, bgColor])

  const handleDownload = () => {
    if (!qrUrl) return
    const a = document.createElement("a")
    a.href = qrUrl
    a.download = "qrcode.png"
    a.click()
  }

  const handleCopy = async () => {
    if (!qrUrl) return
    const res = await fetch(qrUrl)
    const blob = await res.blob()
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm text-gray-700 mb-2 block">输入内容（文本、网址、WiFi 信息等）</label>
        <textarea
          className="w-full h-24 p-3 border rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="输入要生成二维码的内容，如网址 https://example.com"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">尺寸（px）</label>
          <Input
            type="number"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            min={64}
            max={1024}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">前景色</label>
          <div className="flex items-center gap-2">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer" />
            <span className="text-xs text-gray-500">{color}</span>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">背景色</label>
          <div className="flex items-center gap-2">
            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer" />
            <span className="text-xs text-gray-500">{bgColor}</span>
          </div>
        </div>
      </div>

      {qrUrl && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-white border rounded-lg shadow-sm">
            <img src={qrUrl} alt="QR Code" width={size > 300 ? 300 : size} height={size > 300 ? 300 : size} />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleDownload}>下载 PNG</Button>
            <Button variant="outline" onClick={handleCopy}>复制图片</Button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
