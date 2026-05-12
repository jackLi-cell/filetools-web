"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function UuidGeneratorTool() {
  const [uuids, setUuids] = useState<string[]>([])
  const [password, setPassword] = useState("")
  const [pwLength, setPwLength] = useState(16)
  const [pwOptions, setPwOptions] = useState({ upper: true, lower: true, numbers: true, symbols: true })

  const generateUuid = () => {
    const uuid = crypto.randomUUID()
    setUuids(prev => [uuid, ...prev].slice(0, 10))
  }

  const generatePassword = () => {
    let chars = ""
    if (pwOptions.lower) chars += "abcdefghijklmnopqrstuvwxyz"
    if (pwOptions.upper) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    if (pwOptions.numbers) chars += "0123456789"
    if (pwOptions.symbols) chars += "!@#$%^&*()_+-=[]{}|;:,.<>?"
    if (!chars) chars = "abcdefghijklmnopqrstuvwxyz"
    const array = new Uint32Array(pwLength)
    crypto.getRandomValues(array)
    const pw = Array.from(array).map(v => chars[v % chars.length]).join("")
    setPassword(pw)
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">UUID v4 生成</h3>
        <Button onClick={generateUuid}>生成 UUID</Button>
        {uuids.length > 0 && (
          <div className="space-y-2">
            {uuids.map((uuid, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <code className="text-sm font-mono text-gray-800">{uuid}</code>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigator.clipboard.writeText(uuid)}>复制</Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-6 space-y-4">
        <h3 className="text-sm font-medium text-gray-900">随机密码生成</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">长度：</label>
            <input type="number" value={pwLength} onChange={(e) => setPwLength(Number(e.target.value))} min={4} max={128} className="w-16 h-8 px-2 border rounded text-sm" />
          </div>
          {[
            { key: "upper", label: "大写" },
            { key: "lower", label: "小写" },
            { key: "numbers", label: "数字" },
            { key: "symbols", label: "符号" },
          ].map(opt => (
            <label key={opt.key} className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={pwOptions[opt.key as keyof typeof pwOptions]}
                onChange={(e) => setPwOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                className="rounded"
              />
              {opt.label}
            </label>
          ))}
        </div>
        <Button onClick={generatePassword}>生成密码</Button>
        {password && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <code className="text-sm font-mono text-gray-800 break-all">{password}</code>
            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(password)}>复制</Button>
          </div>
        )}
      </div>
    </div>
  )
}
