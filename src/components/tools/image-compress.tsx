"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface CompressedImage {
  name: string
  originalSize: number
  compressedSize: number
  url: string
  ratio: number
}

export function ImageCompressTool() {
  const [files, setFiles] = useState<File[]>([])
  const [quality, setQuality] = useState(80)
  const [maxWidth, setMaxWidth] = useState(1920)
  const [results, setResults] = useState<CompressedImage[]>([])
  const [processing, setProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return
    const imageFiles = Array.from(newFiles).filter(f => f.type.startsWith("image/"))
    setFiles(prev => [...prev, ...imageFiles])
    setResults([])
  }, [])

  const compressImage = async (file: File): Promise<CompressedImage> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
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

        canvas.toBlob(
          (blob) => {
            if (!blob) return
            const url = URL.createObjectURL(blob)
            resolve({
              name: file.name,
              originalSize: file.size,
              compressedSize: blob.size,
              url,
              ratio: Math.round((1 - blob.size / file.size) * 100),
            })
          },
          file.type === "image/png" ? "image/png" : "image/jpeg",
          quality / 100
        )
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
    const a = document.createElement("a")
    a.href = result.url
    a.download = `compressed_${result.name}`
    a.click()
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

      {/* 参数设置 */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
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
      )}

      {/* 操作按钮 */}
      {files.length > 0 && results.length === 0 && (
        <Button onClick={handleCompress} disabled={processing} className="w-full">
          {processing ? "压缩中..." : `开始压缩（${files.length} 个文件）`}
        </Button>
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
                  <span className="ml-2 text-green-600 font-medium">-{r.ratio}%</span>
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => handleDownload(r)}>
                下载
              </Button>
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
