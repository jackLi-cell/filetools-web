import { Metadata } from "next"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = { title: "关于我们", description: `${siteConfig.name} 是一个免费在线文件处理工具箱，提供图片压缩、PDF 转换、格式转换等实用工具。` }

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">关于 {siteConfig.name}</h1>
      <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
        <p>{siteConfig.name}（CatConvert）是一个面向个人用户、自由职业者和小团队的在线文件处理工具箱。我们提供图片压缩、PDF 转换、Office 文档转换、视频/音频处理、二维码生成、Markdown 预览等 50+ 实用工具。</p>

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">核心特点</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li><strong>隐私优先</strong>：大部分工具在浏览器本地处理，文件不会上传到任何服务器。需要服务器处理的文件，处理完成后立即删除源文件，结果文件 2 小时后自动清理。</li>
          <li><strong>免费为主</strong>：29 个基础工具完全免费、无限使用。高级工具按次消耗少量积分，注册即送积分。</li>
          <li><strong>即开即用</strong>：无需下载安装任何软件，打开浏览器即可使用，支持电脑和手机。</li>
          <li><strong>持续更新</strong>：我们会根据用户需求持续新增和优化工具。</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">工具分类</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>图片处理：压缩、格式转换、裁剪、缩放、水印</li>
          <li>PDF 工具：转换、合并、拆分、压缩、加密</li>
          <li>文档转换：Word、Excel、PPT 格式互转</li>
          <li>视频/音频处理：压缩、格式转换、裁剪</li>
          <li>开发者工具：JSON、正则、时间戳、编码</li>
          <li>二维码/条形码：生成、识别</li>
          <li>Markdown：预览、转 HTML、转 PDF</li>
          <li>文本工具：字数统计、去重、大小写转换</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">联系我们</h2>
        <p className="text-sm">如有问题、建议或合作咨询，请联系：<a href={`mailto:${siteConfig.email}`} className="text-blue-600 hover:underline">{siteConfig.email}</a></p>
      </div>
    </div>
  )
}
