"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import QRCode from "qrcode"

type InputMode = "text" | "wifi" | "vcard" | "batch"

const WIFI_AUTH_TYPES = ["WPA", "WEP", "nopass"] as const

export function QrCodeGenerateTool() {
  const [mode, setMode] = useState<InputMode>("text")
  const [text, setText] = useState("")
  const [size, setSize] = useState(256)
  const [color, setColor] = useState("#000000")
  const [bgColor, setBgColor] = useState("#ffffff")
  const [qrUrl, setQrUrl] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState("")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // WiFi fields
  const [wifiSsid, setWifiSsid] = useState("")
  const [wifiPassword, setWifiPassword] = useState("")
  const [wifiAuth, setWifiAuth] = useState<typeof WIFI_AUTH_TYPES[number]>("WPA")
  const [wifiHidden, setWifiHidden] = useState(false)

  // vCard fields
  const [vcardName, setVcardName] = useState("")
  const [vcardPhone, setVcardPhone] = useState("")
  const [vcardEmail, setVcardEmail] = useState("")
  const [vcardOrg, setVcardOrg] = useState("")
  const [vcardTitle, setVcardTitle] = useState("")

  // Batch mode
  const [batchText, setBatchText] = useState("")
  const [batchResults, setBatchResults] = useState<{ text: string; url: string }[]>([])
  const [batchProcessing, setBatchProcessing] = useState(false)

  const getContent = useCallback((): string => {
    if (mode === "wifi") {
      return `WIFI:T:${wifiAuth};S:${wifiSsid};P:${wifiPassword};H:${wifiHidden};;`
    }
    if (mode === "vcard") {
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${vcardName}`,
        vcardPhone ? `TEL:${vcardPhone}` : "",
        vcardEmail ? `EMAIL:${vcardEmail}` : "",
        vcardOrg ? `ORG:${vcardOrg}` : "",
        vcardTitle ? `TITLE:${vcardTitle}` : "",
        "END:VCARD",
      ].filter(Boolean)
      return lines.join("\n")
    }
    return text
  }, [mode, text, wifiSsid, wifiPassword, wifiAuth, wifiHidden, vcardName, vcardPhone, vcardEmail, vcardOrg, vcardTitle])

  const generateQr = useCallback(async (content: string, addLogo: boolean = true): Promise<string> => {
    if (!content.trim()) return ""
    try {
      const url = await QRCode.toDataURL(content, {
        width: size,
        margin: 2,
        color: { dark: color, light: bgColor },
        errorCorrectionLevel: logoFile ? "H" : "M",
      })
      if (addLogo && logoPreview) {
        return await addLogoToQr(url, logoPreview)
      }
      return url
    } catch {
      return ""
    }
  }, [size, color, bgColor, logoFile, logoPreview])

  const addLogoToQr = (qrDataUrl: string, logoUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")!

      const qrImg = new Image()
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 0, 0, size, size)
        const logoImg = new Image()
        logoImg.onload = () => {
          const logoSize = size * 0.2
          const x = (size - logoSize) / 2
          const y = (size - logoSize) / 2
          ctx.fillStyle = "#ffffff"
          ctx.fillRect(x - 4, y - 4, logoSize + 8, logoSize + 8)
          ctx.drawImage(logoImg, x, y, logoSize, logoSize)
          resolve(canvas.toDataURL("image/png"))
        }
        logoImg.onerror = () => resolve(qrDataUrl)
        logoImg.src = logoUrl
      }
      qrImg.src = qrDataUrl
    })
  }

  useEffect(() => {
    if (mode === "batch") return
    const content = getContent()
    if (!content.trim()) { setQrUrl(""); return }
    generateQr(content).then(setQrUrl)
  }, [mode, getContent, generateQr])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleBatchGenerate = async () => {
    const lines = batchText.split("\n").map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return
    setBatchProcessing(true)
    const results: { text: string; url: string }[] = []
    for (const line of lines) {
      const url = await generateQr(line, false)
      if (url) results.push({ text: line, url })
    }
    setBatchResults(results)
    setBatchProcessing(false)
  }

  const handleDownload = (url?: string, filename?: string) => {
    const a = document.createElement("a")
    a.href = url || qrUrl
    a.download = filename || "qrcode.png"
    a.click()
  }

  const handleCopy = async () => {
    if (!qrUrl) return
    const res = await fetch(qrUrl)
    const blob = await res.blob()
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
  }

  const handleDownloadSvg = async () => {
    const content = getContent()
    if (!content.trim()) return
    try {
      const svg = await QRCode.toString(content, {
        type: "svg",
        width: size,
        margin: 2,
        color: { dark: color, light: bgColor },
      })
      const blob = new Blob([svg], { type: "image/svg+xml" })
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = "qrcode.svg"
      a.click()
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      {/* 模式切换 */}
      <div className="flex gap-2 flex-wrap">
        {([["text", "文本/网址"], ["wifi", "WiFi"], ["vcard", "名片"], ["batch", "批量"]] as const).map(([val, label]) => (
          <button
            key={val}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              mode === val ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setMode(val)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 文本模式 */}
      {mode === "text" && (
        <div>
          <label className="text-sm text-gray-700 mb-2 block">输入内容</label>
          <textarea
            className="w-full h-24 p-3 border rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入文本、网址、或任意内容"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      )}

      {/* WiFi 模式 */}
      {mode === "wifi" && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">WiFi 名称 (SSID)</label>
              <Input value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} placeholder="MyWiFi" className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">密码</label>
              <Input value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} placeholder="password123" className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">加密方式</label>
              <div className="flex gap-2">
                {WIFI_AUTH_TYPES.map(t => (
                  <button key={t} className={`px-2 py-1 text-xs rounded ${wifiAuth === t ? "bg-blue-600 text-white" : "bg-white border text-gray-700"}`} onClick={() => setWifiAuth(t)}>
                    {t === "nopass" ? "无密码" : t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input type="checkbox" id="wifi-hidden" checked={wifiHidden} onChange={(e) => setWifiHidden(e.target.checked)} />
              <label htmlFor="wifi-hidden" className="text-xs text-gray-600">隐藏网络</label>
            </div>
          </div>
        </div>
      )}

      {/* vCard 模式 */}
      {mode === "vcard" && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">姓名 *</label>
              <Input value={vcardName} onChange={(e) => setVcardName(e.target.value)} placeholder="张三" className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">电话</label>
              <Input value={vcardPhone} onChange={(e) => setVcardPhone(e.target.value)} placeholder="13800138000" className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">邮箱</label>
              <Input value={vcardEmail} onChange={(e) => setVcardEmail(e.target.value)} placeholder="name@example.com" className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">公司</label>
              <Input value={vcardOrg} onChange={(e) => setVcardOrg(e.target.value)} placeholder="公司名称" className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">职位</label>
              <Input value={vcardTitle} onChange={(e) => setVcardTitle(e.target.value)} placeholder="产品经理" className="h-9 text-sm" />
            </div>
          </div>
        </div>
      )}

      {/* 批量模式 */}
      {mode === "batch" && (
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-700 mb-2 block">批量输入（每行一个内容）</label>
            <textarea
              className="w-full h-32 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={"https://example.com\nhttps://google.com\n自定义文本内容"}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
            />
          </div>
          <Button onClick={handleBatchGenerate} disabled={batchProcessing || !batchText.trim()}>
            {batchProcessing ? "生成中..." : `批量生成（${batchText.split("\n").filter(l => l.trim()).length} 个）`}
          </Button>
          {batchResults.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {batchResults.map((r, i) => (
                <div key={i} className="p-2 border rounded-lg text-center">
                  <img src={r.url} alt={r.text} className="w-full aspect-square object-contain" />
                  <p className="text-xs text-gray-500 truncate mt-1">{r.text}</p>
                  <Button size="sm" variant="ghost" className="h-6 text-xs mt-1" onClick={() => handleDownload(r.url, `qrcode_${i + 1}.png`)}>
                    下载
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 通用设置（非批量模式） */}
      {mode !== "batch" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">尺寸（px）</label>
            <Input type="number" value={size} onChange={(e) => setSize(Number(e.target.value))} min={64} max={1024} className="h-9 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">前景色</label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer" />
              <span className="text-xs text-gray-500">{color}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">背景色</label>
            <div className="flex items-center gap-2">
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer" />
              <span className="text-xs text-gray-500">{bgColor}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Logo（可选）</label>
            <input type="file" accept="image/*" onChange={handleLogoChange} className="text-xs w-full" />
            {logoPreview && <img src={logoPreview} alt="logo" className="w-8 h-8 mt-1 rounded object-cover" />}
          </div>
        </div>
      )}

      {/* 预览和下载（非批量模式） */}
      {mode !== "batch" && qrUrl && (
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-white border rounded-lg shadow-sm">
            <img src={qrUrl} alt="QR Code" width={size > 300 ? 300 : size} height={size > 300 ? 300 : size} />
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <Button onClick={() => handleDownload()}>下载 PNG</Button>
            <Button variant="outline" onClick={handleDownloadSvg}>下载 SVG</Button>
            <Button variant="outline" onClick={handleCopy}>复制图片</Button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
