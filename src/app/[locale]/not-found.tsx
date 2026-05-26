import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Page Not Found / 页面未找到</h1>
      <p className="text-sm text-gray-500 mb-6">The page you are looking for does not exist. / 您访问的页面不存在或已被移除。</p>
      <Link href="/">
        <Button>Back to Home / 返回首页</Button>
      </Link>
    </div>
  )
}
