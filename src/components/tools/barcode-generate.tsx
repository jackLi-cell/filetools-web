"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function BarcodeGenerateTool() {
  const [text, setText] = useState("1234567890128")
  const [format, setFormat] = useState("CODE128")
  const [barcodeUrl, setBarcodeUrl] = useState("")
  const svgRef = useRef<HTMLDivElement>(null)

  const formats = [
    { value: "CODE128", label: "Code 128" },
    { value: "EAN13", label: "EAN-13" },
    { value: "UPC", label: "UPC-A" },
    { value: "CODE39", label: "Code 39" },
    { value: "ITF14", label: "ITF-14" },
  ]

  useEffect(() => {
    if (!text.trim()) { setBarcodeUrl(""); return }
    const generate = async () => {
      try {
        const JsBarcode = (await import("jsbarcode")).default
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        JsBarcode(svg, text, { format, width: 2, height: 80, displayValue: true, fontSize: 14, margin: 10 })
        const svgStr = new XMLSerializer().serializeToString(svg)
        const blob = new Blob([svgStr], { type: "image/svg+xml" })
        setBarcodeUrl(URL.createObjectURL(blob))
        if (svgRef.current) svgRef.current.innerHTML = svgStr
      } catch {
        setBarcodeUrl("")
        if (svgRef.current) svgRef.current.innerHTML = '<p class="text-sm text-red-500 p-4">生成失败：请检查输入内容是否符合所选格式要求</p>'
      }
    }
    generate()
  }, [text, format])

  const download = () => {
    if (!svgRef.current) return
    const svg = svgRef.current.querySelector("svg")
    if (!svg) return
    const canvas = document.createElement("canvas")
    const rect = svg.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    const ctx = canvas.getContext("2d")!
    const img = new Image()
    const svgStr = new XMLSerializer().serializeToString(svg)
    img.onload = () => {
      ctx.fillStyle = "#fff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const a = document.createElement("a")
      a.href = canvas.toDataURL("image/png")
      a.download = `barcode_${format}.png`
      a.click()
    }
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)))
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">条形码内容</label>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="输入条形码内容" className="h-10 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">格式</label>
          <div className="flex gap-1 flex-wrap">
            {formats.map(f => (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
                className={`px-3 py-1.5 rounded text-xs font-medium ${format === f.value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center p-6 bg-white border rounded-lg">
        <div ref={svgRef} />
      </div>

      {barcodeUrl && (
        <div className="flex gap-3 justify-center">
          <Button onClick={download}>下载 PNG</Button>
        </div>
      )}
    </div>
  )
}
