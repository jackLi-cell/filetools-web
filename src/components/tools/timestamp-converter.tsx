"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function TimestampConverterTool() {
  const [timestamp, setTimestamp] = useState("")
  const [datetime, setDatetime] = useState("")
  const [now, setNow] = useState(Math.floor(Date.now() / 1000))
  const [result, setResult] = useState("")

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
    </div>
  )
}
