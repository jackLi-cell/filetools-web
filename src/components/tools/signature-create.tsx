"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

export function SignatureCreateTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<any>(null)
  const [color, setColor] = useState("#000000")
  const [bgColor, setBgColor] = useState("#ffffff")
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    let mounted = true
    const init = async () => {
      const SignaturePad = (await import("signature_pad")).default
      if (!mounted || !canvasRef.current) return
      const canvas = canvasRef.current
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      canvas.getContext("2d")!.scale(ratio, ratio)
      padRef.current = new SignaturePad(canvas, {
        backgroundColor: bgColor,
        penColor: color,
      })
      padRef.current.addEventListener("endStroke", () => setHasSignature(!padRef.current.isEmpty()))
    }
    init()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (padRef.current) {
      padRef.current.penColor = color
    }
  }, [color])

  useEffect(() => {
    if (padRef.current) {
      padRef.current.backgroundColor = bgColor
      const data = padRef.current.toData()
      padRef.current.clear()
      padRef.current.fromData(data)
    }
  }, [bgColor])

  const clear = () => {
    padRef.current?.clear()
    setHasSignature(false)
  }

  const download = (format: "png" | "svg" | "transparent") => {
    if (!padRef.current || padRef.current.isEmpty()) return
    let dataUrl: string
    let ext = "png"
    if (format === "transparent") {
      padRef.current.backgroundColor = "rgba(0,0,0,0)"
      const data = padRef.current.toData()
      padRef.current.clear()
      padRef.current.fromData(data)
      dataUrl = padRef.current.toDataURL("image/png")
      padRef.current.backgroundColor = bgColor
      padRef.current.clear()
      padRef.current.fromData(data)
    } else if (format === "svg") {
      dataUrl = "data:image/svg+xml;base64," + btoa(padRef.current.toSVG())
      ext = "svg"
    } else {
      dataUrl = padRef.current.toDataURL("image/png")
    }
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = `signature.${ext}`
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">笔色</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">底色</label>
          <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
        </div>
        <Button variant="ghost" size="sm" onClick={clear}>清空</Button>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full block touch-none cursor-crosshair"
          style={{ height: "300px", backgroundColor: bgColor }}
        />
      </div>

      <p className="text-xs text-gray-500 text-center">在上方区域用鼠标或手指绘制签名</p>

      <div className="flex gap-2 justify-center flex-wrap">
        <Button onClick={() => download("png")} disabled={!hasSignature}>下载 PNG</Button>
        <Button onClick={() => download("transparent")} disabled={!hasSignature} variant="outline">下载透明 PNG</Button>
        <Button onClick={() => download("svg")} disabled={!hasSignature} variant="outline">下载 SVG</Button>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800">⚠️ 本工具生成的签名图片仅供参考，不具备法律效力。如需具有法律效力的电子签名，请使用经认证的电子签名服务平台。</p>
      </div>
    </div>
  )
}
