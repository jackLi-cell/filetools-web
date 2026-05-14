"use client"

interface ToolDisclaimerProps {
  type: "signature" | "ocr" | "ai" | "privacy" | "legal" | "general"
}

const disclaimers: Record<string, { icon: string; title: string; content: string }> = {
  signature: {
    icon: "✍️",
    title: "电子签名免责声明",
    content: "本工具生成的签名图片仅供参考和非正式场景使用，不具备法律效力。如需具有法律效力的电子签名，请使用经国家认证的电子签名服务平台（如 e签宝、法大大等）。",
  },
  ocr: {
    icon: "🔍",
    title: "OCR 识别免责声明",
    content: "文字识别结果仅供参考，可能存在误差。请勿将未经人工校验的 OCR 结果直接用于合同、法律文书、财务报表等正式文件。重要内容请务必人工核对。",
  },
  ai: {
    icon: "🤖",
    title: "AI 辅助免责声明",
    content: "AI 生成的内容仅供参考，不构成专业建议。请勿将 AI 输出直接用于医疗诊断、法律意见、财务决策等专业领域。最终决策请咨询相关专业人士。",
  },
  privacy: {
    icon: "🔒",
    title: "隐私数据处理说明",
    content: "本工具涉及的脱敏、清除等操作仅为格式化辅助，不保证满足特定法规（如 GDPR、个人信息保护法）的合规要求。涉及敏感数据处理请咨询专业合规顾问。",
  },
  legal: {
    icon: "⚖️",
    title: "法律文书免责声明",
    content: "本工具提供的分析、提示或模板仅供初步参考，不构成法律意见或法律服务。任何法律事务请咨询持证律师或法律服务机构。",
  },
  general: {
    icon: "⚠️",
    title: "使用须知",
    content: "本工具处理结果仅供参考。对于因使用本工具产生的任何直接或间接损失，本站不承担责任。重要文件请保留原始备份。",
  },
}

export function ToolDisclaimer({ type }: ToolDisclaimerProps) {
  const d = disclaimers[type] || disclaimers.general
  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <p className="text-xs text-amber-800">
        <span className="font-medium">{d.icon} {d.title}：</span>{d.content}
      </p>
    </div>
  )
}
