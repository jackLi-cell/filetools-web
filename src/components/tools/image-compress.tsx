"use client"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface CompressedImage {
  name: string
  originalSize: number
  compressedSize: number
  url: string
  originalUrl: string
  ratio: number
}

type CompressMode = "quality" | "target-size"
type OutputFormat = "auto" | "jpeg" | "webp" | "png"

export function ImageCompressTool() {
  const [files, setFiles] = useState<File[]>([])
  const [mode, setMode] = useState<CompressMode>("quality")
  const [quality, setQuality] = useState(80)
  const [targetSize, setTargetSize] = useState(200)
  const [maxWidth, setMaxWidth] = useState(1920)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("auto")
  const [results, setResults] = useState<CompressedImage[]>([])
  const [processing, setProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [compareIndex, setCompareIndex] = useState<number | null>(null)
  const [sliderPos, setSliderPos] = useState(50)
  const compareRef = useRef<HTMLDivElement>(null)

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return
    const imageFiles = Array.from(newFiles).filter(f => f.type.startsWith("image/"))
    setFiles(prev => [...prev, ...imageFiles])
    setResults([])
  }, [])

  const getMimeType = (file: File): string => {
    if (outputFormat === "jpeg") return "image/jpeg"
    if (outputFormat === "webp") return "image/webp"
    if (outputFormat === "png") return "image/png"
    return file.type === "image/png" ? "image/png" : "image/jpeg"
  }

  const compressWithQuality = (
    canvas: HTMLCanvasElement,
    mime: string,
    q: number
  ): Promise<Blob | null> => {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), mime, q)
    })
  }

  const compressToTargetSize = async (
    canvas: HTMLCanvasElement,
    mime: string,
    targetBytes: number
  ): Promise<Blob> => {
    let lo = 0.01
    let hi = 1.0
    let bestBlob: Blob | null = null

    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) / 2
      const blob = await compressWithQuality(canvas, mime, mid)
      if (!blob) break
      bestBlob = blob
      if (blob.size > targetBytes) {
        hi = mid
      } else {
        lo = mid
      }
      if (Math.abs(blob.size - targetBytes) / targetBytes < 0.05) break
    }

    if (!bestBlob) {
      bestBlob = await compressWithQuality(canvas, mime, 0.5) || new Blob()
    }
    return bestBlob
  }

  const compressImage = async (file: File): Promise<CompressedImage> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0, width, height)

        const mime = getMimeType(file)
        let blob: Blob

        if (mode === "target-size") {
          const targetBytes = targetSize * 1024
          blob = await compressToTargetSize(canvas, mime, targetBytes)
        } else {
          blob = (await compressWithQuality(canvas, mime, quality / 100)) || new Blob()
        }

        const url = URL.createObjectURL(blob)
        const originalUrl = URL.createObjectURL(file)
        resolve({
          name: file.name,
          originalSize: file.size,
          compressedSize: blob.size,
          url,
          originalUrl,
          ratio: Math.round((1 - blob.size / file.size) * 100),
        })
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const handleCompress = async () => {
    if (files.length === 0) return
    setProcessing(true)
    const compressed: CompressedImage[] = []
    for (const file of files) {
      const result = await compressImage(file)
      compressed.push(result)
    }
    setResults(compressed)
    setProcessing(false)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const handleDownload = (result: CompressedImage) => {
    const ext = outputFormat === "auto" ? "" : `.${outputFormat}`
    const a = document.createElement("a")
    a.href = result.url
    a.download = ext ? result.name.replace(/\.[^.]+$/, ext) : `compressed_${result.name}`
    a.click()
  }

  const handleCompareMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!compareRef.current) return
    const rect = compareRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    setSliderPos(x)
  }

  return (
    <div className="space-y-6">
      {/* 上传区 */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="text-3xl mb-3">📁</div>
        <p className="text-sm text-gray-600 mb-1">拖拽图片到此处，或点击选择文件</p>
        <p className="text-xs text-gray-400">支持 JPG、PNG、WebP、GIF，可多选</p>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">已选择 {files.length} 个文件</p>
            <Button variant="ghost" size="sm" onClick={() => { setFiles([]); setResults([]) }}>
              清空
            </Button>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-gray-500 py-1">
                <span className="truncate max-w-[200px]">{f.name}</span>
                <span>{formatSize(f.size)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 压缩模式与参数 */}
      {files.length > 0 && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          {/* 模式切换 */}
          <div>
            <label className="text-xs text-gray-600 mb-2 block">压缩模式</label>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  mode === "quality" ? "bg-blue-600 text-white" : "bg-white border text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setMode("quality")}
              >
                按质量压缩
              </button>
              <button
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  mode === "target-size" ? "bg-blue-600 text-white" : "bg-white border text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setMode("target-size")}
              >
                按目标大小
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 质量/目标大小 */}
            {mode === "quality" ? (
              <div>
                <label className="text-xs text-gray-600 mb-1 block">压缩质量：{quality}%</label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>高压缩</span>
                  <span>高质量</span>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-600 mb-1 block">目标大小（KB）</label>
                <Input
                  type="number"
                  value={targetSize}
                  onChange={(e) => setTargetSize(Number(e.target.value))}
                  min={10}
                  max={10000}
                  className="h-9 text-sm"
                />
                <div className="flex gap-1 mt-2">
                  {[100, 200, 500, 1024].map((s) => (
                    <button
                      key={s}
                      className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                        targetSize === s ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-white text-gray-600 hover:bg-gray-100"
                      }`}
                      onClick={() => setTargetSize(s)}
                    >
                      {s >= 1024 ? `${s / 1024}MB` : `${s}KB`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 最大宽度 */}
            <div>
              <label className="text-xs text-gray-600 mb-1 block">最大宽度（px）</label>
              <Input
                type="number"
                value={maxWidth}
                onChange={(e) => setMaxWidth(Number(e.target.value))}
                min={100}
                max={10000}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* 输出格式 */}
          <div>
            <label className="text-xs text-gray-600 mb-2 block">输出格式</label>
            <div className="flex gap-2">
              {([["auto", "原格式"], ["jpeg", "JPEG"], ["webp", "WebP"], ["png", "PNG"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    outputFormat === val ? "bg-blue-600 text-white" : "bg-white border text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => setOutputFormat(val)}
                >
                  {label}
                </button>
              ))}
            </div>
            {outputFormat === "webp" && (
              <p className="text-xs text-gray-400 mt-1">WebP 格式通常比 JPEG 小 25-35%</p>
            )}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {files.length > 0 && results.length === 0 && (
        <Button onClick={handleCompress} disabled={processing} className="w-full">
          {processing ? "压缩中..." : `开始压缩（${files.length} 个文件）`}
        </Button>
      )}

      {/* 对比滑块 */}
      {compareIndex !== null && results[compareIndex] && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">压缩前后对比</h3>
            <Button variant="ghost" size="sm" onClick={() => setCompareIndex(null)}>关闭</Button>
          </div>
          <div
            ref={compareRef}
            className="relative w-full aspect-video overflow-hidden rounded-lg border cursor-col-resize select-none"
            onMouseMove={handleCompareMove}
          >
            {/* 压缩后（底层） */}
            <img
              src={results[compareIndex].url}
              alt="压缩后"
              className="absolute inset-0 w-full h-full object-contain"
            />
            {/* 原图（裁剪层） */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={results[compareIndex].originalUrl}
                alt="原图"
                className="w-full h-full object-contain"
                style={{ width: compareRef.current ? `${compareRef.current.offsetWidth}px` : "100%" }}
              />
            </div>
            {/* 分割线 */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
                <span className="text-xs text-gray-600">⟷</span>
              </div>
            </div>
            {/* 标签 */}
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">原图</div>
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">压缩后</div>
          </div>
        </div>
      )}

      {/* 结果 */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">压缩结果</h3>
          {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{r.name}</p>
                <p className="text-xs text-gray-500">
                  {formatSize(r.originalSize)} → {formatSize(r.compressedSize)}
                  <span className={`ml-2 font-medium ${r.ratio > 0 ? "text-green-600" : "text-red-500"}`}>
                    {r.ratio > 0 ? `-${r.ratio}%` : `+${Math.abs(r.ratio)}%`}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setCompareIndex(i); setSliderPos(50) }}>
                  对比
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDownload(r)}>
                  下载
                </Button>
              </div>
            </div>
          ))}
          {results.length > 1 && (
            <Button variant="outline" className="w-full" onClick={() => results.forEach(handleDownload)}>
              全部下载
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
