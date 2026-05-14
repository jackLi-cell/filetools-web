"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const TIMEZONES = [
  { label: "本地时间", offset: "local" },
  { label: "UTC+0 (伦敦)", offset: "0" },
  { label: "UTC+8 (北京/上海)", offset: "8" },
  { label: "UTC+9 (东京)", offset: "9" },
  { label: "UTC-5 (纽约)", offset: "-5" },
  { label: "UTC-8 (洛杉矶)", offset: "-8" },
  { label: "UTC+1 (巴黎/柏林)", offset: "1" },
  { label: "UTC+5:30 (孟买)", offset: "5.5" },
  { label: "UTC+10 (悉尼)", offset: "10" },
  { label: "UTC+3 (莫斯科)", offset: "3" },
]

export function TimestampConverterTool() {
  const [timestamp, setTimestamp] = useState("")
  const [datetime, setDatetime] = useState("")
  const [now, setNow] = useState(Math.floor(Date.now() / 1000))
  const [result, setResult] = useState("")
  const [dateA, setDateA] = useState("")
  const [dateB, setDateB] = useState("")
  const [diffResult, setDiffResult] = useState("")
  const [tzSource, setTzSource] = useState("8")
  const [tzTarget, setTzTarget] = useState("0")
  const [tzInput, setTzInput] = useState("")
  const [tzResult, setTzResult] = useState("")

  const refreshNow = () => setNow(Math.floor(Date.now() / 1000))

  const timestampToDate = () => {
    const ts = Number(timestamp)
    if (isNaN(ts)) { setResult("请输入有效的时间戳"); return }
    const ms = ts > 1e12 ? ts : ts * 1000
    const d = new Date(ms)
    setResult([
      `本地时间：${d.toLocaleString("zh-CN")}`,
      `UTC 时间：${d.toUTCString()}`,
      `ISO 格式：${d.toISOString()}`,
      `秒级时间戳：${Math.floor(ms / 1000)}`,
      `毫秒级时间戳：${ms}`,
    ].join("\n"))
  }

  const dateToTimestamp = () => {
    if (!datetime) { setResult("请选择日期时间"); return }
    const d = new Date(datetime)
    if (isNaN(d.getTime())) { setResult("无效的日期时间"); return }
    setResult([
      `秒级时间戳：${Math.floor(d.getTime() / 1000)}`,
      `毫秒级时间戳：${d.getTime()}`,
      `本地时间：${d.toLocaleString("zh-CN")}`,
      `UTC 时间：${d.toUTCString()}`,
      `ISO 格式：${d.toISOString()}`,
    ].join("\n"))
  }

  const calcDateDiff = () => {
    if (!dateA || !dateB) return
    const a = new Date(dateA), b = new Date(dateB)
    if (isNaN(a.getTime()) || isNaN(b.getTime())) { setDiffResult("日期无效"); return }
    const diffMs = Math.abs(b.getTime() - a.getTime())
    const days = Math.floor(diffMs / 86400000)
    const hours = Math.floor(diffMs / 3600000)
    const minutes = Math.floor(diffMs / 60000)
    setDiffResult(`相差 ${days} 天 (${hours} 小时 / ${minutes} 分钟)`)
  }

  const convertTimezone = () => {
    if (!tzInput) return
    const d = new Date(tzInput)
    if (isNaN(d.getTime())) { setTzResult("日期无效"); return }
    const sourceOffset = Number(tzSource) * 60
    const targetOffset = Number(tzTarget) * 60
    const utcMs = d.getTime() - sourceOffset * 60000 + d.getTimezoneOffset() * 60000
    const targetMs = utcMs + targetOffset * 60000
    const targetDate = new Date(targetMs)
    setTzResult(targetDate.toLocaleString("zh-CN", { hour12: false }))
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 rounded-lg flex items-center justify-between">
        <div>
          <p className="text-xs text-blue-600 mb-1">当前时间戳（秒）</p>
          <p className="text-lg font-mono font-medium text-blue-900">{now}</p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshNow}>刷新</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">时间戳 → 日期</h3>
          <input
            type="text"
            placeholder="输入时间戳，如 1715400000"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            className="w-full h-10 px-3 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={timestampToDate} className="w-full" disabled={!timestamp}>转换</Button>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">日期 → 时间戳</h3>
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            className="w-full h-10 px-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={dateToTimestamp} className="w-full" disabled={!datetime}>转换</Button>
        </div>
      </div>

      {result && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">结果</span>
            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(result)}>复制</Button>
          </div>
          <pre className="p-3 bg-gray-50 border rounded-lg text-sm font-mono whitespace-pre-wrap">{result}</pre>
        </div>
      )}

      {/* 时区转换 */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
        <h3 className="text-sm font-medium text-gray-900">时区转换</h3>
        <input
          type="datetime-local"
          value={tzInput}
          onChange={(e) => setTzInput(e.target.value)}
          className="w-full h-10 px-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">源时区</label>
            <select value={tzSource} onChange={(e) => setTzSource(e.target.value)} className="w-full h-9 px-2 border rounded-lg text-xs bg-white">
              {TIMEZONES.filter(t => t.offset !== "local").map(t => (
                <option key={t.offset} value={t.offset}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">目标时区</label>
            <select value={tzTarget} onChange={(e) => setTzTarget(e.target.value)} className="w-full h-9 px-2 border rounded-lg text-xs bg-white">
              {TIMEZONES.filter(t => t.offset !== "local").map(t => (
                <option key={t.offset} value={t.offset}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <Button onClick={convertTimezone} disabled={!tzInput} size="sm">转换时区</Button>
        {tzResult && <p className="text-sm font-mono text-gray-800 p-2 bg-white rounded border">{tzResult}</p>}
      </div>

      {/* 日期差计算 */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
        <h3 className="text-sm font-medium text-gray-900">日期差计算</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">开始日期</label>
            <Input type="date" value={dateA} onChange={(e) => setDateA(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">结束日期</label>
            <Input type="date" value={dateB} onChange={(e) => setDateB(e.target.value)} className="h-9 text-sm" />
          </div>
        </div>
        <Button onClick={calcDateDiff} disabled={!dateA || !dateB} size="sm">计算差值</Button>
        {diffResult && <p className="text-sm font-mono text-gray-800 p-2 bg-white rounded border">{diffResult}</p>}
      </div>

      {/* 常用格式模板 */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
        <h3 className="text-sm font-medium text-gray-900">当前时间格式模板</h3>
        <div className="space-y-1">
          {(() => {
            const d = new Date()
            const formats = [
              { label: "ISO 8601", value: d.toISOString() },
              { label: "RFC 2822", value: d.toUTCString() },
              { label: "YYYY-MM-DD", value: d.toISOString().split("T")[0] },
              { label: "YYYY/MM/DD HH:mm:ss", value: `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}` },
              { label: "DD/MM/YYYY", value: `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}` },
              { label: "MM-DD-YYYY", value: `${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}-${d.getFullYear()}` },
              { label: "中文格式", value: `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,"0")}时${String(d.getMinutes()).padStart(2,"0")}分` },
              { label: "Unix (秒)", value: String(Math.floor(d.getTime() / 1000)) },
              { label: "Unix (毫秒)", value: String(d.getTime()) },
            ]
            return formats.map(f => (
              <div key={f.label} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white">
                <span className="text-xs text-gray-600 w-32">{f.label}</span>
                <code className="text-xs font-mono text-gray-800 flex-1 truncate">{f.value}</code>
                <Button variant="ghost" size="sm" className="h-6 text-xs ml-2" onClick={() => navigator.clipboard.writeText(f.value)}>复制</Button>
              </div>
            ))
          })()}
        </div>
      </div>
    </div>
  )
}
