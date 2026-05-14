"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, "0")
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum = (hex: string) => {
    const rgb = hex.replace("#", "").match(/.{2}/g)!.map(c => {
      const v = parseInt(c, 16) / 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
  }
  const l1 = lum(hex1), l2 = lum(hex2)
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

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

  const palette = useMemo(() => {
    const complementary = hslToHex((h + 180) % 360, s, l)
    const analogous = [hslToHex((h + 30) % 360, s, l), hslToHex((h - 30 + 360) % 360, s, l)]
    const triadic = [hslToHex((h + 120) % 360, s, l), hslToHex((h + 240) % 360, s, l)]
    const splitComp = [hslToHex((h + 150) % 360, s, l), hslToHex((h + 210) % 360, s, l)]
    const shades = [20, 35, 50, 65, 80].map(lv => hslToHex(h, s, lv))
    return { complementary, analogous, triadic, splitComp, shades }
  }, [h, s, l])

  const contrastWhite = useMemo(() => getContrastRatio(hex, "#ffffff"), [hex])
  const contrastBlack = useMemo(() => getContrastRatio(hex, "#000000"), [hex])

  const wcagLevel = (ratio: number) => {
    if (ratio >= 7) return "AAA"
    if (ratio >= 4.5) return "AA"
    if (ratio >= 3) return "AA (大文本)"
    return "不通过"
  }

  const gradientCss = useMemo(() => {
    const end = hslToHex((h + 60) % 360, s, l)
    return `linear-gradient(135deg, ${hex}, ${end})`
  }, [hex, h, s, l])

  const copyText = (text: string) => navigator.clipboard.writeText(text)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-lg border shadow-sm" style={{ backgroundColor: hex }} />
        <div>
          <input type="color" value={hex} onChange={(e) => updateFromHex(e.target.value)} className="w-12 h-12 rounded cursor-pointer" />
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

      {/* 调色板 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">调色板</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-gray-600">互补色</p>
            <div className="flex gap-1">
              <div className="w-10 h-10 rounded border cursor-pointer" style={{ backgroundColor: hex }} onClick={() => copyText(hex)} title={hex} />
              <div className="w-10 h-10 rounded border cursor-pointer" style={{ backgroundColor: palette.complementary }} onClick={() => copyText(palette.complementary)} title={palette.complementary} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-600">类似色</p>
            <div className="flex gap-1">
              <div className="w-10 h-10 rounded border cursor-pointer" style={{ backgroundColor: palette.analogous[1] }} onClick={() => copyText(palette.analogous[1])} title={palette.analogous[1]} />
              <div className="w-10 h-10 rounded border cursor-pointer" style={{ backgroundColor: hex }} onClick={() => copyText(hex)} title={hex} />
              <div className="w-10 h-10 rounded border cursor-pointer" style={{ backgroundColor: palette.analogous[0] }} onClick={() => copyText(palette.analogous[0])} title={palette.analogous[0]} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-600">三角色</p>
            <div className="flex gap-1">
              <div className="w-10 h-10 rounded border cursor-pointer" style={{ backgroundColor: hex }} onClick={() => copyText(hex)} title={hex} />
              <div className="w-10 h-10 rounded border cursor-pointer" style={{ backgroundColor: palette.triadic[0] }} onClick={() => copyText(palette.triadic[0])} title={palette.triadic[0]} />
              <div className="w-10 h-10 rounded border cursor-pointer" style={{ backgroundColor: palette.triadic[1] }} onClick={() => copyText(palette.triadic[1])} title={palette.triadic[1]} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-600">分裂互补色</p>
            <div className="flex gap-1">
              <div className="w-10 h-10 rounded border cursor-pointer" style={{ backgroundColor: hex }} onClick={() => copyText(hex)} title={hex} />
              <div className="w-10 h-10 rounded border cursor-pointer" style={{ backgroundColor: palette.splitComp[0] }} onClick={() => copyText(palette.splitComp[0])} title={palette.splitComp[0]} />
              <div className="w-10 h-10 rounded border cursor-pointer" style={{ backgroundColor: palette.splitComp[1] }} onClick={() => copyText(palette.splitComp[1])} title={palette.splitComp[1]} />
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-600">明度变化</p>
          <div className="flex gap-1">
            {palette.shades.map((c, i) => (
              <div key={i} className="w-10 h-10 rounded border cursor-pointer" style={{ backgroundColor: c }} onClick={() => copyText(c)} title={c} />
            ))}
          </div>
        </div>
      </div>

      {/* 渐变 CSS */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-900">渐变 CSS</h3>
        <div className="h-12 rounded-lg border" style={{ background: gradientCss }} />
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs font-mono bg-gray-50 p-2 rounded border truncate">{`background: ${gradientCss};`}</code>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyText(`background: ${gradientCss};`)}>复制</Button>
        </div>
      </div>

      {/* 对比度检查 */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-900">对比度检查 (WCAG)</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border" style={{ backgroundColor: hex }}>
            <p className="text-white text-sm font-medium">白色文字</p>
            <p className="text-white text-xs">对比度 {contrastWhite.toFixed(2)}:1</p>
            <span className={`text-xs px-1.5 py-0.5 rounded ${contrastWhite >= 4.5 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {wcagLevel(contrastWhite)}
            </span>
          </div>
          <div className="p-3 rounded-lg border" style={{ backgroundColor: hex }}>
            <p className="text-black text-sm font-medium">黑色文字</p>
            <p className="text-black text-xs">对比度 {contrastBlack.toFixed(2)}:1</p>
            <span className={`text-xs px-1.5 py-0.5 rounded ${contrastBlack >= 4.5 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {wcagLevel(contrastBlack)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}