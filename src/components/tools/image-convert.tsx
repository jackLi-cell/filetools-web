"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import JSZip from "jszip"

interface ConvertedFile {
  name: string
  originalSize: number
  convertedSize: number
  url: string
  ext: string
}

export function ImageConvertTool() {
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState("image/png")
  const [results, setResults] = useState<ConvertedFile[]>([])
  const [processing, setProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const formats = [
    { value: "image/png", label: "PNG", ext: "png" },
    { value: "image/jpeg", label: "JPG", ext: "jpg" },
    { value: "image/webp", label: "WebP", ext: "webp" },
    { value: "image/avif", label: "AVIF", ext: "avif" },
    { value: "image/bmp", label: "BMP", ext: "bmp" },
  ]

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return
    const imageFiles = Array.from(newFiles).filter(f => f.type.startsWith("image/"))
    setFiles(prev => [...prev, ...imageFiles])
    setResults([])
  }, [])

  const convertFile = (file: File): Promise<ConvertedFile> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0)
        const quality = format === "image/jpeg" || format === "image/webp" || format === "image/avif" ? 0.92 : undefined
        canvas.toBlob((blob) => {
          if (!blob) return
          const ext = formats.find(f => f.value === format)?.ext || "png"
          const baseName = file.name.replace(/\.[^.]+$/, "")
          resolve({
            name: `${baseName}.${ext}`,
            originalSize: file.size,
            convertedSize: blob.size,
            url: URL.createObjectURL(blob),
            ext,
          })
        }, format, quality)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const handleConvert = async () => {
    if (files.length === 0) return
    setProcessing(true)
    const converted: ConvertedFile[] = []
    for (const file of files) {
      const result = await convertFile(file)
      converted.push(result)
    }
    setResults(converted)
    setProcessing(false)
  }

  const handleDownload = (r: ConvertedFile) => {
    const a = document.createElement("a")
    a.href = r.url
    a.download = r.name
    a.click()
  }

  const handleDownloadZip = async () => {
    if (results.length === 0) return
    const zip = new JSZip()
    for (const r of results) {
      const resp = await fetch(r.url)
      const blob = await resp.blob()
      zip.file(r.name, blob)
    }
    const zipBlob = await zip.generateAsync({ type: "blob" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(zipBlob)
    a.download = `converted_images.zip`
    a.click()
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const totalSaved = results.reduce((acc, r) => acc + (r.originalSize - r.convertedSize), 0)

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
        onClick={() => document.getElementById("convert-input")?.click()}
      >
        <input
          id="convert-input"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="text-3xl mb-3">🖼️</div>
        <p className="text-sm text-gray-600 mb-1">拖拽图片到此处，或点击选择（支持多选）</p>
        <p className="text-xs text-gray-400">支持 PNG、JPG、WebP、GIF、BMP、AVIF</p>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">已选择 {files.length} 个文件</p>
            <Button variant="ghost" size="sm" onClick={() => { setFiles([]); setResults([]) }}>清空</Button>
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

      {/* 格式选择 */}
      {files.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="text-xs text-gray-600 mb-2 block">目标格式</label>
          <div className="flex gap-2 flex-wrap">
            {formats.map((f) => (
              <button
                key={f.value}
                onClick={() => { setFormat(f.value); setResults([]) }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  format === f.value ? "bg-blue-600 text-white" : "bg-white border text-gray-700 hover:bg-gray-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {format === "image/avif" && (
            <p className="text-xs text-gray-400 mt-2">AVIF 压缩率优于 WebP，但部分旧浏览器不支持</p>
          )}
        </div>
      )}

      {/* 转换按钮 */}
      {files.length > 0 && results.length === 0 && (
        <Button onClick={handleConvert} disabled={processing} className="w-full">
          {processing ? "转换中..." : `转换为 ${formats.find(f => f.value === format)?.label}（${files.length} 个文件）`}
        </Button>
      )}

      {/* 结果 + 大小对比 */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">转换结果</h3>
            {totalSaved > 0 && (
              <span className="text-xs text-green-600">总计节省 {formatSize(totalSaved)}</span>
            )}
          </div>

          {/* 大小对比表格 */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">文件名</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">原始</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">转换后</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">变化</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const diff = r.originalSize - r.convertedSize
                  const pct = Math.round((diff / r.originalSize) * 100)
                  return (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 truncate max-w-[150px]">{r.name}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{formatSize(r.originalSize)}</td>
                      <td className="px-3 py-2 text-right">{formatSize(r.convertedSize)}</td>
                      <td className={`px-3 py-2 text-right font-medium ${diff > 0 ? "text-green-600" : "text-red-500"}`}>
                        {diff > 0 ? `-${pct}%` : `+${Math.abs(pct)}%`}
                      </td>
                      <td className="px-2">
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => handleDownload(r)}>下载</Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 批量下载 */}
          {results.length > 1 && (
            <Button variant="outline" className="w-full" onClick={handleDownloadZip}>
              打包下载 ZIP（{results.length} 个文件）
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
