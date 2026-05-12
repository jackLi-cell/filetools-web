import { Metadata } from "next"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = { title: "免责声明", description: `${siteConfig.name} 免责声明：了解服务使用条款和责任边界。` }

export default function DisclaimerPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">免责声明</h1>
      <p className="text-xs text-gray-500 mb-8">最后更新日期：2026 年 5 月</p>
      <div className="text-sm text-gray-700 space-y-6 leading-relaxed">
        <p>使用 {siteConfig.name}（以下简称"本站"）提供的任何工具、内容和服务前，请仔细阅读本免责声明。使用本站即表示您同意以下条款。</p>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">1. 服务性质</h2>
          <p>本站提供在线文件格式转换、压缩、水印、预览等工具服务，所有工具输出结果仅供参考和辅助使用。本站提供的服务不构成法律、税务、财务、医疗、投资或任何需要专业资质的服务建议。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">2. 转换结果准确性</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>文档格式转换可能存在格式差异、字体缺失、排版偏移等情况。</li>
            <li>OCR 文字识别结果可能存在错误，不保证 100% 准确。</li>
            <li>文件压缩可能导致质量损失。</li>
            <li>视频/音频处理可能存在细微质量变化。</li>
          </ul>
          <p className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-medium">重要文件请在使用转换结果前仔细核对。本站不对因转换结果不准确导致的任何损失承担责任。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">3. 文件安全</h2>
          <p>本站尽最大努力保护您上传的文件安全，但不能保证绝对安全。请勿上传包含国家机密、商业核心机密、高度敏感个人信息的文件。对于极度敏感的文件，建议使用本站提供的前端本地处理工具（文件不离开您的设备）。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">4. 电子签名</h2>
          <p>本站提供的电子签名生成工具仅用于生成签名图片，<strong>不具备任何法律效力</strong>。如需具有法律效力的电子签名，请使用经认证的电子签名服务平台。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">5. 水印工具</h2>
          <p>可见水印和隐形水印工具为辅助版权保护手段。本站不保证隐形水印在所有场景下不可被移除或破坏。水印工具不能替代法律途径的版权保护。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">6. 第三方链接</h2>
          <p>本站页面可能包含指向第三方网站的链接。本站不对第三方网站的内容、隐私政策、安全性或可用性负责。点击第三方链接即离开本站，相关风险由用户自行承担。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">7. 服务可用性</h2>
          <p>本站不保证服务 7×24 小时不间断运行。本站可能因维护、升级、故障或不可抗力暂时中断服务。处理结果文件保留 2 小时后自动删除，请及时下载。本站不对过期未下载的文件负责。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">8. 积分与支付</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>积分为虚拟服务凭证，不可兑换现金、不可转让。</li>
            <li>赠送积分有有效期，过期自动清零，不予补发。</li>
            <li>充值积分永不过期，但账号注销后不予退还。</li>
            <li>因用户自身原因导致的积分损失，本站不承担责任。</li>
            <li>退款政策：充值后未消费的积分可申请退款，已消费部分不退。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">9. 使用限制</h2>
          <p>用户不得将本站服务用于以下目的：处理违法违规内容；侵犯他人知识产权；批量自动化滥用；对本站进行安全攻击或漏洞探测；任何违反中华人民共和国法律法规的行为。违反上述规定的账号将被永久封禁，积分不予退还。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">10. 责任限制</h2>
          <p>在法律允许的最大范围内，本站对因使用或无法使用本站服务导致的任何直接、间接、附带、特殊或后果性损失不承担责任。本站的最大赔偿责任不超过用户在过去 12 个月内向本站支付的总金额。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">11. 知识产权</h2>
          <p>本站的界面设计、代码、Logo 和文案受知识产权法保护。用户上传和处理的文件，其知识产权归用户或原始权利人所有。本站不主张对用户文件的任何权利。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">12. 适用法律</h2>
          <p>本免责声明受中华人民共和国法律管辖。如发生争议，双方应友好协商解决。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">13. 联系方式</h2>
          <p>如有任何问题或建议，请联系：<a href={`mailto:${siteConfig.email}`} className="text-blue-600 hover:underline">{siteConfig.email}</a></p>
          <p className="text-xs text-gray-500 mt-2">请勿通过此邮箱发送密码、银行卡号、身份证号、完整合同、财务凭证、API 密钥等敏感信息。</p>
        </section>
      </div>
    </div>
  )
}
