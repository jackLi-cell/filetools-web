"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const PRESETS = [
  { name: "自由", ratio: 0, desc: "自由裁剪" },
  { name: "1:1", ratio: 1, desc: "头像/正方形" },
  { name: "4:3", ratio: 4 / 3, desc: "PPT/照片" },
  { name: "3:4", ratio: 3 / 4, desc: "小红书" },
  { name: "16:9", ratio: 16 / 9, desc: "封面/横屏" },
  { name: "9:16", ratio: 9 / 16, desc: "手机壁纸/竖屏" },
  { name: "2:1", ratio: 2, desc: "公众号首图" },
  { name: "3:1", ratio: 3, desc: "Banner" },
]

const PLATFORM_SIZES = [
  { name: "微信头像", w: 132, h: 132 },
  { name: "公众号封面", w: 900, h: 383 },
  { name: "小红书封面", w: 1080, h: 1440 },
  { name: "淘宝主图", w: 800, h: 800 },
  { name: "抖音封面", w: 1080, h: 1920 },
  { name: "B站封面", w: 1146, h: 717 },
  { name: "知乎文章", w: 1440, h: 810 },
  { name: "微博配图", w: 1080, h: 1080 },
]

export function ImageCropTool() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState("")
  const [result, setResult] = useState("")
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const [dragging, setDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [dragOver, setDragOver] = useState(false)
  const [aspectRatio, setAspectRatio] = useState(0)
  const [outputWidth, setOutputWidth] = useState(0)
  const [outputHeight, setOutputHeight] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleFile = useCallback((f: File | null) => {
    if (!f || !f.type.startsWith("image/")) return
    setFile(f)
    setResult("")
    setCropArea({ x: 0, y: 0, w: 0, h: 0 })
    const url = URL.createObjectURL(f)
    setPreview(url)
  }, [])

  const handleImgLoad = () => {
    if (!imgRef.current) return
    const { naturalWidth, naturalHeight } = imgRef.current
    setImgSize({ w: naturalWidth, h: naturalHeight })
    const size = Math.min(naturalWidth, naturalHeight) * 0.6
    setCropArea({
      x: (naturalWidth - size) / 2,
      y: (naturalHeight - size) / 2,
      w: size,
      h: size,
    })
  }

  const getRelativePos = (e: React.MouseEvent) => {
    if (!imgRef.current) return { x: 0, y: 0 }
    const rect = imgRef.current.getBoundingClientRect()
    const scaleX = imgSize.w / rect.width
    const scaleY = imgSize.h / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getRelativePos(e)
    setStartPos(pos)
    setDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    const pos = getRelativePos(e)
    const w = Math.abs(pos.x - startPos.x)
    const x = Math.min(startPos.x, pos.x)
    let h = Math.abs(pos.y - startPos.y)
    let y = Math.min(startPos.y, pos.y)
    if (aspectRatio > 0) {
      h = w / aspectRatio
      if (pos.y < startPos.y) y = startPos.y - h
    }
    setCropArea({ x, y, w, h })
  }

  const handleMouseUp = () => setDragging(false)

  const crop = () => {
    if (!file || cropArea.w === 0) return
    const img = new Image()
    img.onload = () => {
      const finalW = outputWidth > 0 ? outputWidth : Math.round(cropArea.w)
      const finalH = outputHeight > 0 ? outputHeight : Math.round(cropArea.h)
      const canvas = document.createElement("canvas")
      canvas.width = finalW
      canvas.height = finalH
      const ctx = canvas.getContext("2d")!

      ctx.save()
      ctx.translate(finalW / 2, finalH / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.w, cropArea.h,
        -finalW / 2, -finalH / 2, finalW, finalH
      )
      ctx.restore()

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
    a.download = `cropped_${file?.name || "image.png"}`
    a.click()
  }

  const overlayStyle = () => {
    if (!imgRef.current || cropArea.w === 0) return {}
    const rect = imgRef.current.getBoundingClientRect()
    const scaleX = rect.width / imgSize.w
    const scaleY = rect.height / imgSize.h
    return {
      left: `${cropArea.x * scaleX}px`,
      top: `${cropArea.y * scaleY}px`,
      width: `${cropArea.w * scaleX}px`,
      height: `${cropArea.h * scaleY}px`,
    }
  }

  return (
    <div className="space-y-6">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => !preview && document.getElementById("crop-input")?.click()}
      >
        <input id="crop-input" type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
        {preview ? (
          <div
            ref={containerRef}
            className="relative inline-block select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img ref={imgRef} src={preview} alt="crop" className="max-h-80 rounded" onLoad={handleImgLoad} draggable={false} />
            {cropArea.w > 0 && (
              <div className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none" style={overlayStyle()} />
            )}
          </div>
        ) : (
          <>
            <div className="text-3xl mb-3">✂️</div>
            <p className="text-sm text-gray-600 mb-1">拖拽图片到此处，或点击选择</p>
            <p className="text-xs text-gray-400">上传后在图片上拖动选择裁剪区域</p>
          </>
        )}
      </div>

      {preview && (
        <>
          {/* 比例预设 */}
          <div className="space-y-2">
            <label className="text-xs text-gray-600">裁剪比例</label>
            <div className="flex gap-1 flex-wrap">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    aspectRatio === p.ratio ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  onClick={() => setAspectRatio(p.ratio)}
                  title={p.desc}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* 平台尺寸 */}
          <div className="space-y-2">
            <label className="text-xs text-gray-600">平台尺寸预设</label>
            <div className="flex gap-1 flex-wrap">
              {PLATFORM_SIZES.map((p) => (
                <button
                  key={p.name}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    outputWidth === p.w && outputHeight === p.h ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  onClick={() => {
                    setOutputWidth(p.w)
                    setOutputHeight(p.h)
                    setAspectRatio(p.w / p.h)
                  }}
                >
                  {p.name} ({p.w}x{p.h})
                </button>
              ))}
              <button
                className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                onClick={() => { setOutputWidth(0); setOutputHeight(0) }}
              >
                原始尺寸
              </button>
            </div>
          </div>

          {/* 旋转/翻转 */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-gray-600">变换：</label>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setRotation((r) => (r - 90) % 360)}>↺ 左转</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setRotation((r) => (r + 90) % 360)}>↻ 右转</Button>
            <Button variant={flipH ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setFlipH(!flipH)}>↔ 水平翻转</Button>
            <Button variant={flipV ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setFlipV(!flipV)}>↕ 垂直翻转</Button>
            {rotation !== 0 && <span className="text-xs text-gray-500">旋转 {rotation}°</span>}
          </div>

          {/* 自定义输出尺寸 */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">输出尺寸：</label>
            <Input type="number" value={outputWidth || ""} onChange={(e) => setOutputWidth(Number(e.target.value))} placeholder="宽" className="w-20 h-7 text-xs" />
            <span className="text-xs text-gray-400">x</span>
            <Input type="number" value={outputHeight || ""} onChange={(e) => setOutputHeight(Number(e.target.value))} placeholder="高" className="w-20 h-7 text-xs" />
            <span className="text-xs text-gray-400">px（留空则按裁剪区域原始尺寸）</span>
          </div>
        </>
      )}

      {preview && (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>裁剪区域：{Math.round(cropArea.w)} × {Math.round(cropArea.h)} px</span>
          {outputWidth > 0 && <span>→ 输出：{outputWidth} × {outputHeight} px</span>}
          <Button variant="ghost" size="sm" onClick={() => document.getElementById("crop-input")?.click()}>更换图片</Button>
        </div>
      )}

      {preview && !result && (
        <Button onClick={crop} className="w-full" disabled={cropArea.w < 10}>
          裁剪（{Math.round(cropArea.w)} × {Math.round(cropArea.h)} px）
        </Button>
      )}

      {result && (
        <div className="space-y-3">
          <img src={result} alt="cropped" className="max-h-48 rounded border mx-auto" />
          <div className="flex gap-2 justify-center">
            <Button size="sm" onClick={download}>下载</Button>
            <Button size="sm" variant="outline" onClick={() => setResult("")}>重新裁剪</Button>
          </div>
        </div>
      )}
    </div>
  )
}
