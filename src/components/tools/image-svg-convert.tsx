"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ImageSvgConvertTool() {
  const [svgContent, setSvgContent] = useState("")
  const [svgUrl, setSvgUrl] = useState("")
  const [width, setWidth] = useState(800)
  const [height, setHeight] = useState(600)
  const [format, setFormat] = useState<"png" | "jpeg">("png")
  const [result, setResult] = useState("")
  const [bgColor, setBgColor] = useState("#ffffff")

  const handleFile = (f: File | null) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      setSvgContent(content)
      setSvgUrl(URL.createObjectURL(f))
      setResult("")

      const parser = new DOMParser()
      const doc = parser.parseFromString(content, "image/svg+xml")
      const svg = doc.querySelector("svg")
      if (svg) {
        const vb = svg.getAttribute("viewBox")?.split(/\s+/)
        const w = svg.getAttribute("width") || (vb ? vb[2] : null)
        const h = svg.getAttribute("height") || (vb ? vb[3] : null)
        if (w) setWidth(parseInt(w))
        if (h) setHeight(parseInt(h))
      }
    }
    reader.readAsText(f)
  }

  const convert = () => {
    if (!svgContent) return

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")!

    if (format === "jpeg") {
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, width, height)
    }

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height)
      const mimeType = format === "png" ? "image/png" : "image/jpeg"
      setResult(canvas.toDataURL(mimeType, 0.92))
    }
    img.onerror = () => {
      const blob = new Blob([svgContent], { type: "image/svg+xml" })
      const url = URL.createObjectURL(blob)
      const img2 = new Image()
      img2.onload = () => {
        ctx.drawImage(img2, 0, 0, width, height)
        const mimeType = format === "png" ? "image/png" : "image/jpeg"
        setResult(canvas.toDataURL(mimeType, 0.92))
        URL.revokeObjectURL(url)
      }
      img2.src = url
    }
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`
  }

  const download = () => {
    if (!result) return
    const a = document.createElement("a")
    a.href = result
    a.download = `converted.${format}`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-gray-300"
        onClick={() => document.getElementById("svg-input")?.click()}
      >
        <input id="svg-input" type="file" accept=".svg,image/svg+xml" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
        {svgUrl ? (
          <div className="space-y-2">
            <img src={svgUrl} alt="SVG preview" className="max-h-40 mx-auto" />
            <p className="text-xs text-gray-500">SVG 原始尺寸检测：{width} × {height}</p>
          </div>
        ) : (
          <>
            <div className="text-3xl mb-3">🎨</div>
            <p className="text-sm text-gray-600 mb-1">点击选择 SVG 文件</p>
            <p className="text-xs text-gray-400">将 SVG 矢量图转为 PNG 或 JPG 位图</p>
          </>
        )}
      </div>

      {svgContent && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">宽度（px）</label>
            <Input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} min={1} max={4096} className="h-9 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">高度（px）</label>
            <Input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} min={1} max={4096} className="h-9 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">格式</label>
            <div className="flex gap-1">
              <button onClick={() => setFormat("png")} className={`px-3 py-1.5 rounded text-xs ${format === "png" ? "bg-blue-600 text-white" : "bg-white border text-gray-700"}`}>PNG</button>
              <button onClick={() => setFormat("jpeg")} className={`px-3 py-1.5 rounded text-xs ${format === "jpeg" ? "bg-blue-600 text-white" : "bg-white border text-gray-700"}`}>JPG</button>
            </div>
          </div>
          {format === "jpeg" && (
            <div>
              <label className="text-xs text-gray-600 mb-1 block">背景色</label>
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer" />
            </div>
          )}
        </div>
      )}

      {svgContent && !result && (
        <Button onClick={convert} className="w-full">转换为 {format.toUpperCase()}（{width} × {height}）</Button>
      )}

      {result && (
        <div className="space-y-3">
          <img src={result} alt="result" className="max-h-48 mx-auto rounded border" />
          <div className="flex gap-2 justify-center">
            <Button onClick={download}>下载 {format.toUpperCase()}</Button>
            <Button variant="outline" onClick={() => setResult("")}>重新转换</Button>
          </div>
        </div>
      )}
    </div>
  )
}
