import { Metadata } from "next"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = { title: "隐私政策", description: `${siteConfig.name} 隐私政策：了解我们如何收集、使用和保护您的信息。` }

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">隐私政策</h1>
      <p className="text-xs text-gray-500 mb-8">最后更新日期：2026 年 5 月</p>
      <div className="text-sm text-gray-700 space-y-6 leading-relaxed">
        <p>{siteConfig.name}（以下简称"本站"）重视用户隐私。本隐私政策说明本站在您使用服务过程中如何收集、使用、存储和保护您的信息。使用本站即表示您同意本政策的内容。</p>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">1. 信息收集</h2>
          <h3 className="text-sm font-medium text-gray-800 mb-2">1.1 账号信息</h3>
          <p>当您注册账号时，本站收集以下信息：电子邮箱地址（用于登录和找回密码）、密码（加密存储，本站无法查看您的明文密码）、显示名称（可选）。</p>

          <h3 className="text-sm font-medium text-gray-800 mt-4 mb-2">1.2 文件信息</h3>
          <p>当您使用文件处理工具时：您上传的文件将传输到本站服务器进行处理。处理完成后，源文件立即从服务器删除。处理结果文件保留 2 小时后自动删除。本站不会查看、分析、复制或分享您上传的文件内容。本站不会将您的文件用于模型训练、数据分析或任何其他用途。</p>

          <h3 className="text-sm font-medium text-gray-800 mt-4 mb-2">1.3 前端本地工具</h3>
          <p>部分工具（如图片压缩、Markdown 预览、文本工具、二维码生成等）完全在您的浏览器本地运行：文件不会上传到任何服务器，处理过程完全在您的设备上完成，本站无法获取您在这些工具中处理的任何内容。</p>

          <h3 className="text-sm font-medium text-gray-800 mt-4 mb-2">1.4 自动收集的信息</h3>
          <p>本站在您访问时可能自动收集：IP 地址（用于频率限制和安全防护，不关联个人身份）、浏览器类型和操作系统（用于兼容性优化）、访问页面和时间（用于统计分析）、Referrer 来源页面（用于了解流量渠道）。</p>

          <h3 className="text-sm font-medium text-gray-800 mt-4 mb-2">1.5 支付信息</h3>
          <p>当您购买积分时：支付过程由第三方支付平台（支付宝/微信支付）处理。本站不收集、不存储您的银行卡号、支付密码或任何支付凭证。本站仅记录订单号、支付金额、支付时间和支付状态。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">2. 信息使用</h2>
          <p>本站收集的信息仅用于以下目的：提供和维护文件处理服务；管理您的账号和积分余额；处理支付订单和积分发放；防止滥用和保障服务安全；改进服务质量（匿名统计分析）；发送服务相关通知。</p>
          <p className="mt-2">本站不会将您的信息用于：向第三方出售或出租；发送营销广告或垃圾邮件；用户画像或行为追踪；AI 模型训练。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">3. 信息存储与安全</h2>
          <p>账号信息存储在加密数据库中，密码使用 Argon2id 算法不可逆加密。会话信息通过 HttpOnly + Secure + SameSite Cookie 管理。所有数据传输通过 HTTPS 加密。服务器部署在受保护的云环境中，定期进行安全更新。数据库每日自动备份。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">4. 信息保留期限</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead><tr className="bg-gray-50"><th className="border px-3 py-2 text-left">数据类型</th><th className="border px-3 py-2 text-left">保留期限</th></tr></thead>
              <tbody>
                <tr><td className="border px-3 py-2">上传的源文件</td><td className="border px-3 py-2">处理完成后立即删除</td></tr>
                <tr><td className="border px-3 py-2">处理结果文件</td><td className="border px-3 py-2">2 小时后自动删除</td></tr>
                <tr><td className="border px-3 py-2">账号信息</td><td className="border px-3 py-2">账号存续期间，注销后 30 天内删除</td></tr>
                <tr><td className="border px-3 py-2">使用记录</td><td className="border px-3 py-2">90 天</td></tr>
                <tr><td className="border px-3 py-2">积分流水</td><td className="border px-3 py-2">永久（用于账务核对）</td></tr>
                <tr><td className="border px-3 py-2">访问日志</td><td className="border px-3 py-2">30 天</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">5. Cookie 使用</h2>
          <p>本站使用 session_token（维持登录状态，有效期 7 天）和 tool_favorites（记录收藏的工具，有效期 365 天）。本站不使用第三方追踪 Cookie。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">6. 第三方服务</h2>
          <p>本站可能使用以下第三方服务：Cloudflare（CDN 加速和安全防护）、支付宝/微信支付（支付处理）、Cloudflare Turnstile（人机验证）。本站不对第三方服务的隐私政策负责。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">7. 用户权利</h2>
          <p>您有权：查看本站存储的您的个人信息；修改您的账号信息；删除您的使用历史记录；注销账号并删除所有个人数据；导出您的积分流水记录。如需行使上述权利，请联系：{siteConfig.email}。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">8. 未成年人保护</h2>
          <p>本站不面向 16 岁以下未成年人提供服务。如果我们发现无意中收集了未成年人的信息，将立即删除。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">9. 政策更新</h2>
          <p>本站可能不定期更新本隐私政策。重大变更时将在网站首页公告。继续使用本站服务即表示您接受更新后的政策。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">10. 联系方式</h2>
          <p>如有隐私相关问题或投诉，请联系：<a href={`mailto:${siteConfig.email}`} className="text-blue-600 hover:underline">{siteConfig.email}</a></p>
          <p className="text-xs text-gray-500 mt-2">请勿通过此邮箱发送密码、银行卡号、身份证号、API 密钥等敏感信息。</p>
        </section>
      </div>
    </div>
  )
}
