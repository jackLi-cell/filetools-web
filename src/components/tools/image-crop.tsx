"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"

export function ImageCropTool() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState("")
  const [result, setResult] = useState("")
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const [dragging, setDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [dragOver, setDragOver] = useState(false)
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
    const x = Math.min(startPos.x, pos.x)
    const y = Math.min(startPos.y, pos.y)
    const w = Math.abs(pos.x - startPos.x)
    const h = Math.abs(pos.y - startPos.y)
    setCropArea({ x, y, w, h })
  }

  const handleMouseUp = () => setDragging(false)

  const crop = () => {
    if (!file || cropArea.w === 0) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = cropArea.w
      canvas.height = cropArea.h
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, cropArea.x, cropArea.y, cropArea.w, cropArea.h, 0, 0, cropArea.w, cropArea.h)
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
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>裁剪区域：{Math.round(cropArea.w)} × {Math.round(cropArea.h)} px</span>
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
