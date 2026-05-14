"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type SignaturePad from "signature_pad"

interface SavedSignature {
  id: string
  name: string
  dataUrl: string
  createdAt: string
}

export function SignatureCreateTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)
  const [color, setColor] = useState("#000000")
  const [bgColor, setBgColor] = useState("#ffffff")
  const [hasSignature, setHasSignature] = useState(false)
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([])
  const [saveName, setSaveName] = useState("")
  const [penStyle, setPenStyle] = useState<"normal" | "thin" | "thick" | "brush">("normal")

  const penConfigs = {
    normal: { minWidth: 0.5, maxWidth: 2.5 },
    thin: { minWidth: 0.3, maxWidth: 1.0 },
    thick: { minWidth: 2.0, maxWidth: 5.0 },
    brush: { minWidth: 1.0, maxWidth: 8.0 },
  }

  useEffect(() => {
    const stored = localStorage.getItem("saved_signatures")
    if (stored) {
      try { setSavedSignatures(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [])

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
      const pad = new SignaturePad(canvas, {
        backgroundColor: bgColor,
        penColor: color,
      })
      padRef.current = pad
      pad.addEventListener("endStroke", () => setHasSignature(!pad.isEmpty()))
    }
    init()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (padRef.current) padRef.current.penColor = color
  }, [color])

  useEffect(() => {
    if (padRef.current) {
      const config = penConfigs[penStyle]
      padRef.current.minWidth = config.minWidth
      padRef.current.maxWidth = config.maxWidth
    }
  }, [penStyle])

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
        <div className="flex items-center gap-1">
          {([["thin", "细笔"], ["normal", "钢笔"], ["thick", "马克笔"], ["brush", "毛笔"]] as const).map(([val, label]) => (
            <button
              key={val}
              className={`px-2 py-1 text-xs rounded ${penStyle === val ? "bg-blue-600 text-white" : "bg-white border text-gray-700"}`}
              onClick={() => setPenStyle(val)}
            >
              {label}
            </button>
          ))}
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

      {/* 保存签名模板 */}
      {hasSignature && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="签名名称（如：正式签名）"
            className="flex-1 h-9 px-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button variant="outline" size="sm" onClick={() => {
            if (!padRef.current || padRef.current.isEmpty()) return
            const dataUrl = padRef.current.toDataURL("image/png")
            const sig: SavedSignature = {
              id: Date.now().toString(),
              name: saveName || `签名 ${savedSignatures.length + 1}`,
              dataUrl,
              createdAt: new Date().toLocaleString("zh-CN"),
            }
            const updated = [...savedSignatures, sig]
            setSavedSignatures(updated)
            localStorage.setItem("saved_signatures", JSON.stringify(updated))
            setSaveName("")
          }}>
            保存模板
          </Button>
        </div>
      )}

      {/* 已保存的签名 */}
      {savedSignatures.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">已保存的签名（{savedSignatures.length}）</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {savedSignatures.map((sig) => (
              <div key={sig.id} className="p-2 border rounded-lg text-center">
                <img src={sig.dataUrl} alt={sig.name} className="h-16 mx-auto object-contain" />
                <p className="text-xs text-gray-700 mt-1 truncate">{sig.name}</p>
                <p className="text-xs text-gray-400">{sig.createdAt}</p>
                <div className="flex gap-1 mt-1 justify-center">
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => {
                    const a = document.createElement("a")
                    a.href = sig.dataUrl
                    a.download = `${sig.name}.png`
                    a.click()
                  }}>下载</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-red-600" onClick={() => {
                    const updated = savedSignatures.filter(s => s.id !== sig.id)
                    setSavedSignatures(updated)
                    localStorage.setItem("saved_signatures", JSON.stringify(updated))
                  }}>删除</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800">⚠️ 本工具生成的签名图片仅供参考，不具备法律效力。如需具有法律效力的电子签名，请使用经认证的电子签名服务平台。</p>
      </div>
    </div>
  )
}
