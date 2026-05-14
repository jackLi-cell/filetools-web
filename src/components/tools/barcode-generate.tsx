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

      {/* 批量生成 */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
        <h3 className="text-sm font-medium text-gray-900">批量生成</h3>
        <textarea
          className="w-full h-24 p-2 border rounded-lg text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={"每行一个条形码内容，如：\n6901234567890\n6901234567891\n6901234567892"}
          id="barcode-batch-input"
        />
        <Button size="sm" onClick={async () => {
          const el = document.getElementById("barcode-batch-input") as HTMLTextAreaElement
          const lines = el.value.split("\n").map(l => l.trim()).filter(Boolean)
          if (lines.length === 0) return
          const JSZip = (await import("jszip")).default
          const JsBarcode = (await import("jsbarcode")).default
          const zip = new JSZip()
          for (let i = 0; i < lines.length; i++) {
            try {
              const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
              JsBarcode(svg, lines[i], { format, width: 2, height: 80, displayValue: true, fontSize: 14, margin: 10 })
              const svgStr = new XMLSerializer().serializeToString(svg)
              const blob = await new Promise<Blob>((resolve) => {
                const canvas = document.createElement("canvas")
                canvas.width = 400; canvas.height = 200
                const ctx = canvas.getContext("2d")!
                const img = new Image()
                img.onload = () => { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 400, 200); ctx.drawImage(img, 0, 0, 400, 200); canvas.toBlob(b => resolve(b || new Blob()), "image/png") }
                img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)))
              })
              zip.file(`barcode_${i + 1}_${lines[i]}.png`, blob)
            } catch { /* skip invalid */ }
          }
          const zipBlob = await zip.generateAsync({ type: "blob" })
          const a = document.createElement("a"); a.href = URL.createObjectURL(zipBlob); a.download = "barcodes.zip"; a.click()
        }}>
          批量生成 ZIP
        </Button>
      </div>

      {/* 标签纸排版 */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
        <h3 className="text-sm font-medium text-gray-900">标签纸排版打印</h3>
        <p className="text-xs text-gray-500">将当前条形码按 A4 纸排列，适合打印标签</p>
        <div className="flex gap-2">
          {[{cols: 3, rows: 8, label: "3x8 (24个)"}, {cols: 2, rows: 6, label: "2x6 (12个)"}, {cols: 4, rows: 10, label: "4x10 (40个)"}].map(layout => (
            <Button key={layout.label} variant="outline" size="sm" onClick={() => {
              if (!svgRef.current) return
              const svg = svgRef.current.querySelector("svg")
              if (!svg) return
              const svgStr = new XMLSerializer().serializeToString(svg)
              const imgSrc = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)))
              const printWin = window.open("", "_blank")
              if (!printWin) return
              const cells = Array(layout.cols * layout.rows).fill(`<img src="${imgSrc}" style="width:100%;height:auto;"/>`)
              printWin.document.write(`<!DOCTYPE html><html><head><style>@page{size:A4;margin:5mm}body{margin:0;padding:0}table{width:100%;border-collapse:collapse}td{border:1px dashed #ccc;padding:2mm;text-align:center;vertical-align:middle}</style></head><body><table>${Array(layout.rows).fill(0).map((_, r) => `<tr>${cells.slice(r * layout.cols, (r + 1) * layout.cols).map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</table></body></html>`)
              printWin.document.close()
              printWin.onload = () => printWin.print()
            }}>
              {layout.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
