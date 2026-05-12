"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface ImageFile {
  file: File
  url: string
  width: number
  height: number
}

export function ImageCollageTool() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [direction, setDirection] = useState<"vertical" | "horizontal">("vertical")
  const [gap, setGap] = useState(0)
  const [result, setResult] = useState("")
  const [dragOver, setDragOver] = useState(false)

  const addFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).filter(f => f.type.startsWith("image/")).forEach(file => {
      const img = new Image()
      img.onload = () => {
        setImages(prev => [...prev, { file, url: URL.createObjectURL(file), width: img.width, height: img.height }])
      }
      img.src = URL.createObjectURL(file)
    })
    setResult("")
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setResult("")
  }

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return
    setImages(prev => {
      const arr = [...prev]
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return arr
    })
    setResult("")
  }

  const collage = () => {
    if (images.length < 2) return

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!

    if (direction === "vertical") {
      const maxWidth = Math.max(...images.map(i => i.width))
      const totalHeight = images.reduce((sum, i) => sum + Math.round(i.height * (maxWidth / i.width)), 0) + gap * (images.length - 1)
      canvas.width = maxWidth
      canvas.height = totalHeight

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      let y = 0
      const draws = images.map(img => {
        const scale = maxWidth / img.width
        const h = Math.round(img.height * scale)
        const currentY = y
        y += h + gap
        return { img, y: currentY, w: maxWidth, h }
      })

      let loaded = 0
      draws.forEach(({ img, y, w, h }) => {
        const el = new Image()
        el.onload = () => {
          ctx.drawImage(el, 0, y, w, h)
          loaded++
          if (loaded === draws.length) {
            setResult(canvas.toDataURL("image/png"))
          }
        }
        el.src = img.url
      })
    } else {
      const maxHeight = Math.max(...images.map(i => i.height))
      const totalWidth = images.reduce((sum, i) => sum + Math.round(i.width * (maxHeight / i.height)), 0) + gap * (images.length - 1)
      canvas.width = totalWidth
      canvas.height = maxHeight

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      let x = 0
      const draws = images.map(img => {
        const scale = maxHeight / img.height
        const w = Math.round(img.width * scale)
        const currentX = x
        x += w + gap
        return { img, x: currentX, w, h: maxHeight }
      })

      let loaded = 0
      draws.forEach(({ img, x, w, h }) => {
        const el = new Image()
        el.onload = () => {
          ctx.drawImage(el, x, 0, w, h)
          loaded++
          if (loaded === draws.length) {
            setResult(canvas.toDataURL("image/png"))
          }
        }
        el.src = img.url
      })
    }
  }

  const download = () => {
    if (!result) return
    const a = document.createElement("a")
    a.href = result
    a.download = `collage_${images.length}pics.png`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
        onClick={() => document.getElementById("collage-input")?.click()}
      >
        <input id="collage-input" type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <div className="text-3xl mb-2">🖼️</div>
        <p className="text-sm text-gray-600">拖拽或点击添加图片（至少 2 张）</p>
      </div>

      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">已添加 {images.length} 张图片</p>
            <Button variant="ghost" size="sm" onClick={() => { setImages([]); setResult("") }}>清空</Button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                <img src={img.url} alt="" className="w-full h-16 object-cover rounded border" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); moveImage(i, i - 1) }} className="text-white text-xs px-1">←</button>
                  <button onClick={(e) => { e.stopPropagation(); removeImage(i) }} className="text-red-300 text-xs px-1">✕</button>
                  <button onClick={(e) => { e.stopPropagation(); moveImage(i, i + 1) }} className="text-white text-xs px-1">→</button>
                </div>
                <span className="absolute top-0 left-0 bg-black/60 text-white text-xs px-1 rounded-br">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {images.length >= 2 && (
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg items-center">
          <div className="flex gap-2">
            <button onClick={() => setDirection("vertical")} className={`px-3 py-1.5 rounded text-sm ${direction === "vertical" ? "bg-blue-600 text-white" : "bg-white border text-gray-700"}`}>
              竖向拼接
            </button>
            <button onClick={() => setDirection("horizontal")} className={`px-3 py-1.5 rounded text-sm ${direction === "horizontal" ? "bg-blue-600 text-white" : "bg-white border text-gray-700"}`}>
              横向拼接
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">间距（px）</label>
            <input type="number" value={gap} onChange={(e) => setGap(Number(e.target.value))} min={0} max={50} className="w-16 h-8 px-2 border rounded text-sm" />
          </div>
        </div>
      )}

      {images.length >= 2 && !result && (
        <Button onClick={collage} className="w-full">拼接 {images.length} 张图片</Button>
      )}

      {result && (
        <div className="space-y-3">
          <img src={result} alt="collage" className="max-h-80 mx-auto rounded border" />
          <div className="flex gap-2 justify-center">
            <Button onClick={download}>下载拼接图</Button>
            <Button variant="outline" onClick={() => setResult("")}>重新拼接</Button>
          </div>
        </div>
      )}
    </div>
  )
}
