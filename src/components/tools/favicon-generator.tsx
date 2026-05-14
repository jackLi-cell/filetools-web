"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import JSZip from "jszip"

const SIZES = [16, 32, 48, 64, 128, 180, 192, 512]

export function FaviconGeneratorTool() {
  const [text, setText] = useState("A")
  const [bgColor, setBgColor] = useState("#3b82f6")
  const [textColor, setTextColor] = useState("#ffffff")
  const [fontSize, setFontSize] = useState(60)
  const [borderRadius, setBorderRadius] = useState(20)
  const [previews, setPreviews] = useState<{ size: number; url: string }[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const generate = () => {
    const results: { size: number; url: string }[] = []
    for (const size of SIZES) {
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")!
      const r = (borderRadius / 100) * size
      ctx.beginPath()
      ctx.roundRect(0, 0, size, size, r)
      ctx.fillStyle = bgColor
      ctx.fill()
      ctx.fillStyle = textColor
      ctx.font = `bold ${Math.round(size * fontSize / 100)}px system-ui, sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(text.slice(0, 2), size / 2, size / 2 + size * 0.03)
      results.push({ size, url: canvas.toDataURL("image/png") })
    }
    setPreviews(results)
  }

  const downloadAll = async () => {
    if (previews.length === 0) return
    const zip = new JSZip()
    for (const p of previews) {
      const resp = await fetch(p.url)
      const blob = await resp.blob()
      zip.file(`favicon-${p.size}x${p.size}.png`, blob)
    }
    const icoBlob = await fetch(previews.find(p => p.size === 32)!.url).then(r => r.blob())
    zip.file("favicon.ico", icoBlob)
    const zipBlob = await zip.generateAsync({ type: "blob" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(zipBlob)
    a.download = "favicons.zip"
    a.click()
  }

  const downloadSingle = (url: string, size: number) => {
    const a = document.createElement("a")
    a.href = url
    a.download = `favicon-${size}x${size}.png`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">图标文字（1-2 字符）</label>
          <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={2} className="h-9 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">字号比例 (%)</label>
          <Input type="number" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} min={20} max={90} className="h-9 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">背景色</label>
          <div className="flex items-center gap-2">
            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer" />
            <span className="text-xs text-gray-500">{bgColor}</span>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">文字色</label>
          <div className="flex items-center gap-2">
            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer" />
            <span className="text-xs text-gray-500">{textColor}</span>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">圆角 (%)</label>
          <input type="range" min={0} max={50} value={borderRadius} onChange={(e) => setBorderRadius(Number(e.target.value))} className="w-full" />
          <div className="flex justify-between text-xs text-gray-400"><span>方形</span><span>圆形</span></div>
        </div>
      </div>

      <Button onClick={generate} className="w-full">生成全部尺寸</Button>

      {previews.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">预览（{SIZES.length} 个尺寸）</h3>
            <Button size="sm" onClick={downloadAll}>打包下载 ZIP</Button>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            {previews.map((p) => (
              <div key={p.size} className="text-center cursor-pointer" onClick={() => downloadSingle(p.url, p.size)}>
                <img src={p.url} alt={`${p.size}x${p.size}`} width={Math.min(p.size, 64)} height={Math.min(p.size, 64)} className="border rounded mx-auto" />
                <p className="text-xs text-gray-500 mt-1">{p.size}px</p>
              </div>
            ))}
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border">
            <p className="text-xs text-gray-600 font-medium mb-1">HTML 引用代码：</p>
            <code className="text-xs font-mono text-gray-800 block whitespace-pre-wrap">{`<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">\n<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180x180.png">`}</code>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
