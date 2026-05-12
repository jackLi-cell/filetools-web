"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ImageResizeTool() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState("")
  const [origWidth, setOrigWidth] = useState(0)
  const [origHeight, setOrigHeight] = useState(0)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [keepRatio, setKeepRatio] = useState(true)
  const [result, setResult] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const ratioRef = useRef(1)

  const handleFile = useCallback((f: File | null) => {
    if (!f || !f.type.startsWith("image/")) return
    setFile(f)
    setResult("")
    const img = new Image()
    img.onload = () => {
      setOrigWidth(img.width)
      setOrigHeight(img.height)
      setWidth(img.width)
      setHeight(img.height)
      ratioRef.current = img.width / img.height
    }
    const url = URL.createObjectURL(f)
    img.src = url
    setPreview(url)
  }, [])

  const handleWidthChange = (w: number) => {
    setWidth(w)
    if (keepRatio) setHeight(Math.round(w / ratioRef.current))
  }

  const handleHeightChange = (h: number) => {
    setHeight(h)
    if (keepRatio) setWidth(Math.round(h * ratioRef.current))
  }

  const resize = () => {
    if (!file) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (!blob) return
        setResult(URL.createObjectURL(blob))
      }, file.type === "image/png" ? "image/png" : "image/jpeg", 0.92)
    }
    img.src = URL.createObjectURL(file)
  }

  const download = () => {
    if (!result) return
    const a = document.createElement("a")
    a.href = result
    a.download = `resized_${width}x${height}_${file?.name || "image.png"}`
    a.click()
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
        onClick={() => document.getElementById("resize-input")?.click()}
      >
        <input id="resize-input" type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
        {preview ? (
          <div className="space-y-2">
            <img src={preview} alt="preview" className="max-h-40 mx-auto rounded" />
            <p className="text-sm text-gray-600">原始尺寸：{origWidth} × {origHeight} px</p>
          </div>
        ) : (
          <>
            <div className="text-3xl mb-3">📐</div>
            <p className="text-sm text-gray-600 mb-1">拖拽图片到此处，或点击选择</p>
          </>
        )}
      </div>

      {file && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">宽度（px）</label>
              <Input type="number" value={width} onChange={(e) => handleWidthChange(Number(e.target.value))} min={1} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">高度（px）</label>
              <Input type="number" value={height} onChange={(e) => handleHeightChange(Number(e.target.value))} min={1} className="h-9 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={keepRatio} onChange={(e) => setKeepRatio(e.target.checked)} className="rounded" />
            保持宽高比
          </label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { handleWidthChange(Math.round(origWidth * 0.5)) }}>50%</Button>
            <Button variant="outline" size="sm" onClick={() => { handleWidthChange(Math.round(origWidth * 0.75)) }}>75%</Button>
            <Button variant="outline" size="sm" onClick={() => { handleWidthChange(origWidth) }}>原始</Button>
            <Button variant="outline" size="sm" onClick={() => { handleWidthChange(origWidth * 2) }}>200%</Button>
          </div>
        </div>
      )}

      {file && !result && (
        <Button onClick={resize} className="w-full">缩放为 {width} × {height} px</Button>
      )}

      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <p className="text-sm text-green-800">缩放完成：{width} × {height} px</p>
          <Button size="sm" onClick={download}>下载</Button>
        </div>
      )}
    </div>
  )
}
