"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import JSZip from "jszip"

const PLATFORM_SIZES = [
  { name: "微信头像", w: 132, h: 132 },
  { name: "公众号封面", w: 900, h: 383 },
  { name: "小红书", w: 1080, h: 1440 },
  { name: "淘宝主图", w: 800, h: 800 },
  { name: "抖音封面", w: 1080, h: 1920 },
  { name: "B站封面", w: 1146, h: 717 },
  { name: "知乎文章", w: 1440, h: 810 },
  { name: "微博配图", w: 1080, h: 1080 },
  { name: "1080p", w: 1920, h: 1080 },
  { name: "720p", w: 1280, h: 720 },
]

export function ImageResizeTool() {
  const [mode, setMode] = useState<"single" | "batch">("single")
  const [file, setFile] = useState<File | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [preview, setPreview] = useState("")
  const [origWidth, setOrigWidth] = useState(0)
  const [origHeight, setOrigHeight] = useState(0)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [keepRatio, setKeepRatio] = useState(true)
  const [result, setResult] = useState("")
  const [batchProcessing, setBatchProcessing] = useState(false)
  const [batchDone, setBatchDone] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [padding, setPadding] = useState(0)
  const [padColor, setPadColor] = useState("#ffffff")
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

  const handleBatchFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return
    const imageFiles = Array.from(newFiles).filter(f => f.type.startsWith("image/"))
    setFiles(prev => [...prev, ...imageFiles])
    setBatchDone(false)
  }, [])

  const handleWidthChange = (w: number) => {
    setWidth(w)
    if (keepRatio) setHeight(Math.round(w / ratioRef.current))
  }

  const handleHeightChange = (h: number) => {
    setHeight(h)
    if (keepRatio) setWidth(Math.round(h * ratioRef.current))
  }

  const resizeImage = (file: File, targetW: number, targetH: number, pad: number, padBg: string): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvasW = targetW + pad * 2
        const canvasH = targetH + pad * 2
        const canvas = document.createElement("canvas")
        canvas.width = canvasW
        canvas.height = canvasH
        const ctx = canvas.getContext("2d")!
        if (pad > 0) {
          ctx.fillStyle = padBg
          ctx.fillRect(0, 0, canvasW, canvasH)
        }
        ctx.drawImage(img, pad, pad, targetW, targetH)
        canvas.toBlob((blob) => resolve(blob || new Blob()), file.type === "image/png" ? "image/png" : "image/jpeg", 0.92)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const resize = async () => {
    if (!file) return
    const blob = await resizeImage(file, width, height, padding, padColor)
    setResult(URL.createObjectURL(blob))
  }

  const batchResize = async () => {
    if (files.length === 0 || width <= 0 || height <= 0) return
    setBatchProcessing(true)
    const zip = new JSZip()
    for (const f of files) {
      const blob = await resizeImage(f, width, height, padding, padColor)
      const ext = f.type === "image/png" ? "png" : "jpg"
      const baseName = f.name.replace(/\.[^.]+$/, "")
      zip.file(`${baseName}_${width}x${height}.${ext}`, blob)
    }
    const zipBlob = await zip.generateAsync({ type: "blob" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(zipBlob)
    a.download = `resized_${width}x${height}.zip`
    a.click()
    setBatchProcessing(false)
    setBatchDone(true)
  }

  const download = () => {
    if (!result) return
    const a = document.createElement("a")
    a.href = result
    a.download = `resized_${width + padding * 2}x${height + padding * 2}_${file?.name || "image.png"}`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* 模式切换 */}
      <div className="flex gap-2">
        <button className={`px-3 py-1.5 text-sm rounded-md ${mode === "single" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`} onClick={() => setMode("single")}>单张缩放</button>
        <button className={`px-3 py-1.5 text-sm rounded-md ${mode === "batch" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`} onClick={() => setMode("batch")}>批量缩放</button>
      </div>

      {/* 单张模式上传 */}
      {mode === "single" && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
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
      )}

      {/* 批量模式上传 */}
      {mode === "batch" && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleBatchFiles(e.dataTransfer.files) }}
          onClick={() => document.getElementById("resize-batch-input")?.click()}
        >
          <input id="resize-batch-input" type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleBatchFiles(e.target.files)} />
          <div className="text-3xl mb-3">📐</div>
          <p className="text-sm text-gray-600 mb-1">拖拽多张图片，或点击选择（支持多选）</p>
          {files.length > 0 && <p className="text-xs text-blue-600 mt-2">已选择 {files.length} 个文件</p>}
        </div>
      )}

      {/* 尺寸设置 */}
      {(file || files.length > 0) && (
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
          {mode === "single" && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleWidthChange(Math.round(origWidth * 0.5))}>50%</Button>
              <Button variant="outline" size="sm" onClick={() => handleWidthChange(Math.round(origWidth * 0.75))}>75%</Button>
              <Button variant="outline" size="sm" onClick={() => handleWidthChange(origWidth)}>原始</Button>
              <Button variant="outline" size="sm" onClick={() => handleWidthChange(origWidth * 2)}>200%</Button>
            </div>
          )}

          {/* 画布扩展（F12） */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">边距/画布扩展（px）</label>
              <Input type="number" value={padding} onChange={(e) => setPadding(Number(e.target.value))} min={0} max={500} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">边距颜色</label>
              <div className="flex items-center gap-2">
                <input type="color" value={padColor} onChange={(e) => setPadColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer" />
                <span className="text-xs text-gray-500">{padColor}</span>
              </div>
            </div>
          </div>
          {padding > 0 && (
            <p className="text-xs text-gray-500">最终输出尺寸：{width + padding * 2} × {height + padding * 2} px</p>
          )}

          {/* 平台尺寸预设 */}
          <div>
            <label className="text-xs text-gray-600 mb-2 block">平台尺寸预设</label>
            <div className="flex gap-1 flex-wrap">
              {PLATFORM_SIZES.map((p) => (
                <button
                  key={p.name}
                  className="px-2 py-1 text-xs rounded bg-white border text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => { setWidth(p.w); setHeight(p.h); setKeepRatio(false); setResult("") }}
                >
                  {p.name} ({p.w}x{p.h})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {mode === "single" && file && !result && (
        <Button onClick={resize} className="w-full">缩放为 {width + padding * 2} × {height + padding * 2} px</Button>
      )}
      {mode === "batch" && files.length > 0 && (
        <Button onClick={batchResize} disabled={batchProcessing || width <= 0 || height <= 0} className="w-full">
          {batchProcessing ? "处理中..." : `批量缩放 ${files.length} 张 → ${width}x${height} (ZIP 下载)`}
        </Button>
      )}

      {/* 单张结果 */}
      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <p className="text-sm text-green-800">缩放完成：{width + padding * 2} × {height + padding * 2} px</p>
          <Button size="sm" onClick={download}>下载</Button>
        </div>
      )}

      {/* 批量完成 */}
      {batchDone && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">批量缩放完成，ZIP 已下载。</p>
        </div>
      )}
    </div>
  )
}
