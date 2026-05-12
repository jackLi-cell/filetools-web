import { Metadata } from "next"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = { title: "联系我们", description: `联系 ${siteConfig.name}：反馈问题、功能建议或合作咨询。` }

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">联系我们</h1>
      <div className="text-sm text-gray-700 space-y-6">
        <div className="p-5 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-medium text-blue-900 mb-2">联系邮箱</p>
          <p className="text-blue-800 text-base font-mono">{siteConfig.email}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">可反馈的问题类型</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>页面错误或显示异常</li>
            <li>工具功能异常或结果不正确</li>
            <li>内容修正或信息补充</li>
            <li>功能建议或新工具需求</li>
            <li>隐私和数据安全问题</li>
            <li>合作咨询</li>
          </ul>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="font-medium text-amber-900 mb-2">安全提醒</p>
          <p className="text-amber-800 text-xs">请勿通过邮件发送以下敏感信息：</p>
          <ul className="list-disc pl-5 text-xs text-amber-700 mt-2 space-y-1">
            <li>密码或 API 密钥</li>
            <li>身份证号或护照号</li>
            <li>完整合同或财务凭证</li>
            <li>银行卡号或支付信息</li>
            <li>客户资料或医疗信息</li>
          </ul>
        </div>

        <p className="text-xs text-gray-500">我们会在 1-3 个工作日内回复您的邮件。</p>
      </div>
    </div>
  )
}
