"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface ExifData {
  [key: string]: string | number | undefined
}

export function ImageExifTool() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState("")
  const [exifData, setExifData] = useState<ExifData | null>(null)
  const [cleaned, setCleaned] = useState("")
  const [error, setError] = useState("")

  const handleFile = async (f: File | null) => {
    if (!f || !f.type.startsWith("image/")) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setCleaned("")
    setError("")
    setExifData(null)

    try {
      const EXIF = (await import("exif-js")).default as any
      const reader = new FileReader()
      reader.onload = function () {
        const arrayBuffer = this.result as ArrayBuffer
        const exif = EXIF.readFromBinaryFile(arrayBuffer)
        if (exif && Object.keys(exif).length > 0) {
          const filtered: ExifData = {}
          const importantKeys = [
            "Make", "Model", "DateTime", "DateTimeOriginal",
            "ExposureTime", "FNumber", "ISOSpeedRatings",
            "FocalLength", "ImageWidth", "ImageHeight",
            "GPSLatitude", "GPSLongitude", "GPSAltitude",
            "Software", "Orientation", "ColorSpace",
            "WhiteBalance", "Flash", "LensModel",
          ]
          for (const key of importantKeys) {
            if (exif[key] !== undefined) {
              filtered[key] = String(exif[key])
            }
          }
          if (Object.keys(filtered).length === 0) {
            for (const [key, val] of Object.entries(exif).slice(0, 20)) {
              if (val !== undefined && val !== null && String(val).length < 200) {
                filtered[key] = String(val)
              }
            }
          }
          setExifData(filtered)
        } else {
          setExifData({})
        }
      }
      reader.readAsArrayBuffer(f)
    } catch {
      setError("读取 EXIF 信息失败")
    }
  }

  const clearExif = () => {
    if (!file) return
    const canvas = document.createElement("canvas")
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (!blob) return
        setCleaned(URL.createObjectURL(blob))
      }, file.type === "image/png" ? "image/png" : "image/jpeg", 0.95)
    }
    img.src = URL.createObjectURL(file)
  }

  const download = () => {
    if (!cleaned) return
    const a = document.createElement("a")
    a.href = cleaned
    a.download = `no_exif_${file?.name || "image.jpg"}`
    a.click()
  }

  const fieldLabels: Record<string, string> = {
    Make: "相机品牌", Model: "相机型号", DateTime: "修改时间",
    DateTimeOriginal: "拍摄时间", ExposureTime: "曝光时间",
    FNumber: "光圈", ISOSpeedRatings: "ISO", FocalLength: "焦距",
    ImageWidth: "宽度", ImageHeight: "高度",
    GPSLatitude: "GPS 纬度", GPSLongitude: "GPS 经度", GPSAltitude: "GPS 海拔",
    Software: "软件", Orientation: "方向", ColorSpace: "色彩空间",
    WhiteBalance: "白平衡", Flash: "闪光灯", LensModel: "镜头型号",
  }

  return (
    <div className="space-y-6">
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-gray-300"
        onClick={() => document.getElementById("exif-input")?.click()}
      >
        <input id="exif-input" type="file" accept="image/jpeg,image/tiff,image/png" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
        {preview ? (
          <div className="space-y-2">
            <img src={preview} alt="" className="max-h-40 mx-auto rounded" />
            <p className="text-sm text-gray-600">{file?.name}</p>
          </div>
        ) : (
          <>
            <div className="text-3xl mb-3">📷</div>
            <p className="text-sm text-gray-600 mb-1">点击选择图片查看 EXIF 信息</p>
            <p className="text-xs text-gray-400">支持 JPG、TIFF、PNG</p>
          </>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {exifData !== null && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">EXIF 元数据</h3>
            {Object.keys(exifData).length > 0 && (
              <Button size="sm" variant="outline" onClick={clearExif}>清除元数据</Button>
            )}
          </div>

          {Object.keys(exifData).length === 0 ? (
            <p className="text-sm text-gray-500">该图片不包含 EXIF 元数据信息。</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(exifData).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-1.5 px-2 bg-gray-50 rounded text-xs">
                  <span className="text-gray-600 font-medium">{fieldLabels[key] || key}</span>
                  <span className="text-gray-900 text-right max-w-[60%] truncate">{String(value)}</span>
                </div>
              ))}
            </div>
          )}

          {exifData.GPSLatitude && (
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              ⚠️ 该图片包含 GPS 定位信息，分享前建议清除元数据。
            </div>
          )}
        </Card>
      )}

      {cleaned && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <p className="text-sm text-green-800">✅ 元数据已清除</p>
          <Button size="sm" onClick={download}>下载</Button>
        </div>
      )}
    </div>
  )
}
