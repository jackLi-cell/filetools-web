"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

function explainRegex(pattern: string): string {
  if (!pattern) return ""
  const explanations: string[] = []
  const tokens: [RegExp, string][] = [
    [/^\^/, "匹配字符串开头"],
    [/^\$/, "匹配字符串结尾"],
    [/^\\d/, "匹配数字 (0-9)"],
    [/^\\D/, "匹配非数字"],
    [/^\\w/, "匹配字母/数字/下划线"],
    [/^\\W/, "匹配非字母数字"],
    [/^\\s/, "匹配空白字符"],
    [/^\\S/, "匹配非空白字符"],
    [/^\\b/, "匹配单词边界"],
    [/^\./, "匹配任意字符"],
    [/^\[([^\]]+)\]/, "匹配字符集 [$1]"],
    [/^\((\?:)?/, "分组开始"],
    [/^\)/, "分组结束"],
    [/^\{(\d+),?(\d*)\}/, "重复 {$1,$2} 次"],
    [/^\+\??/, "重复 1 次或更多"],
    [/^\*\??/, "重复 0 次或更多"],
    [/^\?\??/, "可选（0 或 1 次）"],
    [/^\|/, "或"],
  ]
  let remaining = pattern
  let safety = 0
  while (remaining.length > 0 && safety < 200) {
    safety++
    let matched = false
    for (const [regex, desc] of tokens) {
      const m = remaining.match(regex)
      if (m) {
        let explanation = desc
        if (m[1] !== undefined) explanation = explanation.replace("$1", m[1])
        if (m[2] !== undefined) explanation = explanation.replace("$2", m[2])
        explanations.push(`\`${m[0]}\` → ${explanation}`)
        remaining = remaining.slice(m[0].length)
        matched = true
        break
      }
    }
    if (!matched) {
      const ch = remaining[0]
      if (ch === "\\") {
        explanations.push(`\`${remaining.slice(0, 2)}\` → 转义字符 "${remaining[1]}"`)
        remaining = remaining.slice(2)
      } else {
        explanations.push(`\`${ch}\` → 匹配字面字符 "${ch}"`)
        remaining = remaining.slice(1)
      }
    }
  }
  return explanations.join("\n")
}

const REGEX_TEMPLATES = [
  { name: "邮箱", pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", desc: "匹配电子邮箱地址" },
  { name: "手机号", pattern: "1[3-9]\\d{9}", desc: "匹配中国大陆手机号" },
  { name: "身份证", pattern: "[1-9]\\d{5}(19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]", desc: "匹配18位身份证号" },
  { name: "URL", pattern: "https?://[\\w\\-]+(\\.[\\w\\-]+)+[\\w\\-.,@?^=%&:/~+#]*", desc: "匹配 HTTP/HTTPS 网址" },
  { name: "IPv4", pattern: "(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)", desc: "匹配 IPv4 地址" },
  { name: "日期", pattern: "\\d{4}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\\d|3[01])", desc: "匹配 YYYY-MM-DD 格式日期" },
  { name: "中文", pattern: "[\\u4e00-\\u9fff]+", desc: "匹配连续中文字符" },
  { name: "HTML标签", pattern: "<[^>]+>", desc: "匹配 HTML 标签" },
  { name: "十六进制颜色", pattern: "#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})", desc: "匹配 HEX 颜色值" },
]

export function RegexTesterTool() {
  const [pattern, setPattern] = useState("")
  const [flags, setFlags] = useState("g")
  const [testStr, setTestStr] = useState("")
  const [replaceStr, setReplaceStr] = useState("")
  const [error, setError] = useState("")
  const [showTemplates, setShowTemplates] = useState(false)
  const [showReplace, setShowReplace] = useState(false)

  const getMatches = () => {
    if (!pattern || !testStr) return []
    try {
      const regex = new RegExp(pattern, flags)
      setError("")
      const matches: { match: string; index: number; groups: string[] }[] = []
      let m
      if (flags.includes("g")) {
        while ((m = regex.exec(testStr)) !== null) {
          matches.push({ match: m[0], index: m.index, groups: m.slice(1) })
          if (!m[0]) break
        }
      } else {
        m = regex.exec(testStr)
        if (m) matches.push({ match: m[0], index: m.index, groups: m.slice(1) })
      }
      return matches
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "正则表达式语法错误")
      return []
    }
  }

  const matches = getMatches()

  const getHighlightedText = () => {
    if (!pattern || !testStr || error) return testStr
    try {
      const regex = new RegExp(pattern, flags.includes("g") ? flags : flags + "g")
      const parts: { text: string; highlighted: boolean }[] = []
      let lastIndex = 0
      let m
      while ((m = regex.exec(testStr)) !== null) {
        if (m.index > lastIndex) parts.push({ text: testStr.slice(lastIndex, m.index), highlighted: false })
        parts.push({ text: m[0], highlighted: true })
        lastIndex = m.index + m[0].length
        if (!m[0]) break
      }
      if (lastIndex < testStr.length) parts.push({ text: testStr.slice(lastIndex), highlighted: false })
      return parts
    } catch {
      return testStr
    }
  }

  const highlighted = getHighlightedText()

  const getReplaceResult = (): string => {
    if (!pattern || !testStr || !replaceStr || error) return ""
    try {
      const regex = new RegExp(pattern, flags)
      return testStr.replace(regex, replaceStr)
    } catch {
      return ""
    }
  }

  const flagOptions = [
    { value: "g", label: "全局 (g)" },
    { value: "i", label: "忽略大小写 (i)" },
    { value: "m", label: "多行 (m)" },
    { value: "s", label: "单行 (s)" },
  ]

  const toggleFlag = (f: string) => {
    setFlags(prev => prev.includes(f) ? prev.replace(f, "") : prev + f)
  }

  return (
    <div className="space-y-6">
      {/* 模板库 */}
      <div>
        <button
          className="text-xs text-blue-600 hover:text-blue-800 mb-2"
          onClick={() => setShowTemplates(!showTemplates)}
        >
          {showTemplates ? "收起模板库 ▲" : "常用正则模板 ▼"}
        </button>
        {showTemplates && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg border">
            {REGEX_TEMPLATES.map((t) => (
              <button
                key={t.name}
                className="text-left p-2 rounded hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-200"
                onClick={() => { setPattern(t.pattern); setShowTemplates(false) }}
              >
                <p className="text-xs font-medium text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500 truncate">{t.desc}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">正则表达式</label>
          <div className="flex items-center gap-1 border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
            <span className="text-gray-400 font-mono">/</span>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="flex-1 text-sm font-mono outline-none"
              placeholder="输入正则表达式"
            />
            <span className="text-gray-400 font-mono">/{flags}</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {flagOptions.map(f => (
            <button
              key={f.value}
              onClick={() => toggleFlag(f.value)}
              className={`px-3 py-1 rounded text-xs font-medium ${flags.includes(f.value) ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-600 mb-1 block">测试文本</label>
        <textarea
          className="w-full h-32 p-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="输入要测试的文本..."
          value={testStr}
          onChange={(e) => setTestStr(e.target.value)}
        />
      </div>

      {/* 替换模式 */}
      <div>
        <button
          className="text-xs text-blue-600 hover:text-blue-800 mb-2"
          onClick={() => setShowReplace(!showReplace)}
        >
          {showReplace ? "收起替换 ▲" : "替换模式 ▼"}
        </button>
        {showReplace && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">替换为（支持 $1 $2 等分组引用）</label>
              <input
                type="text"
                value={replaceStr}
                onChange={(e) => setReplaceStr(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入替换字符串..."
              />
            </div>
            {replaceStr && pattern && testStr && !error && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-600">替换结果</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => navigator.clipboard.writeText(getReplaceResult())}
                  >
                    复制
                  </Button>
                </div>
                <pre className="p-2 bg-white border rounded text-sm font-mono whitespace-pre-wrap break-all max-h-32 overflow-auto">
                  {getReplaceResult()}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 正则解释器 */}
      {pattern && !error && (
        <div className="space-y-2">
          <button className="text-xs text-blue-600 hover:text-blue-800" onClick={() => {
            const el = document.getElementById("regex-explain")
            if (el) el.classList.toggle("hidden")
          }}>
            正则解释 ▼
          </button>
          <pre id="regex-explain" className="hidden p-3 bg-gray-50 border rounded-lg text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
            {explainRegex(pattern)}
          </pre>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!error && pattern && testStr && (
        <>
          <div>
            <p className="text-xs text-gray-600 mb-2">匹配高亮（共 {matches.length} 个匹配）</p>
            <div className="p-3 bg-gray-50 border rounded-lg text-sm font-mono whitespace-pre-wrap break-all">
              {Array.isArray(highlighted) ? highlighted.map((part, i) => (
                part.highlighted
                  ? <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part.text}</mark>
                  : <span key={i}>{part.text}</span>
              )) : <span>{highlighted}</span>}
            </div>
          </div>

          {matches.length > 0 && (
            <div>
              <p className="text-xs text-gray-600 mb-2">匹配详情</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {matches.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs p-2 bg-gray-50 rounded">
                    <span className="text-gray-400 w-6">#{i + 1}</span>
                    <code className="text-blue-700 font-medium">{m.match}</code>
                    <span className="text-gray-400">位置 {m.index}</span>
                    {m.groups.length > 0 && <span className="text-green-600">分组: [{m.groups.join(", ")}]</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
