"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ColorConverterTool() {
  const [hex, setHex] = useState("#3b82f6")
  const [r, setR] = useState(59)
  const [g, setG] = useState(130)
  const [b, setB] = useState(246)
  const [h, setH] = useState(217)
  const [s, setS] = useState(91)
  const [l, setL] = useState(60)

  const hexToRgb = (hex: string) => {
    const match = hex.replace("#", "").match(/.{2}/g)
    if (!match) return null
    return { r: parseInt(match[0], 16), g: parseInt(match[1], 16), b: parseInt(match[2], 16) }
  }

  const rgbToHex = (r: number, g: number, b: number) =>
    "#" + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("")

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0, s = 0
    const l = (max + min) / 2
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      else if (max === g) h = ((b - r) / d + 2) / 6
      else h = ((r - g) / d + 4) / 6
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
  }

  const updateFromHex = (value: string) => {
    setHex(value)
    const rgb = hexToRgb(value)
    if (!rgb) return
    setR(rgb.r); setG(rgb.g); setB(rgb.b)
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    setH(hsl.h); setS(hsl.s); setL(hsl.l)
  }

  const updateFromRgb = (nr: number, ng: number, nb: number) => {
    setR(nr); setG(ng); setB(nb)
    setHex(rgbToHex(nr, ng, nb))
    const hsl = rgbToHsl(nr, ng, nb)
    setH(hsl.h); setS(hsl.s); setL(hsl.l)
  }

  const copyText = (text: string) => navigator.clipboard.writeText(text)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-lg border shadow-sm" style={{ backgroundColor: hex }} />
        <div>
          <input
            type="color"
            value={hex}
            onChange={(e) => updateFromHex(e.target.value)}
            className="w-12 h-12 rounded cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-1">取色器</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">HEX</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => copyText(hex)}>复制</Button>
          </div>
          <Input value={hex} onChange={(e) => updateFromHex(e.target.value)} className="h-9 text-sm font-mono" />
        </div>

        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">RGB</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => copyText(`rgb(${r}, ${g}, ${b})`)}>复制</Button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <Input type="number" value={r} onChange={(e) => updateFromRgb(Number(e.target.value), g, b)} min={0} max={255} className="h-9 text-xs" />
            <Input type="number" value={g} onChange={(e) => updateFromRgb(r, Number(e.target.value), b)} min={0} max={255} className="h-9 text-xs" />
            <Input type="number" value={b} onChange={(e) => updateFromRgb(r, g, Number(e.target.value))} min={0} max={255} className="h-9 text-xs" />
          </div>
          <p className="text-xs text-gray-500 font-mono">rgb({r}, {g}, {b})</p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">HSL</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => copyText(`hsl(${h}, ${s}%, ${l}%)`)}>复制</Button>
          </div>
          <p className="text-sm font-mono text-gray-800">hsl({h}, {s}%, {l}%)</p>
        </div>
      </div>
    </div>
  )
}
