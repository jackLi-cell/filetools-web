"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import type { ReactNode } from "react"
import {
  BarChart3,
  Bot,
  Home,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

const navItems = [
  { href: "/admin", label: "控制台", icon: LayoutDashboard },
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/tools", label: "工具配置", icon: Wrench },
  { href: "/admin/stats", label: "数据统计", icon: BarChart3 },
  { href: "/admin/ai", label: "AI 助手", icon: Bot },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const isLoginPage = pathname === "/admin/login"

  useEffect(() => {
    if (loading) return
    if (isLoginPage) {
      if (user?.role === "admin") router.push("/admin")
      return
    }
    if (!user) router.push(`/admin/login?next=${encodeURIComponent(pathname || "/admin")}`)
    else if (user.role !== "admin") router.push("/admin/login")
  }, [isLoginPage, loading, pathname, router, user])

  const doLogout = async () => {
    await logout()
    router.push("/admin/login")
  }

  if (isLoginPage) {
    return <>{children}</>
  }

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 text-sm text-gray-500">
        加载中...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 border-r border-gray-200 bg-white md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
            <Settings className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">灵猫后台</p>
            <p className="text-[11px] text-gray-500">Admin Console</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md px-3 text-sm transition-colors",
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <Link
            href="/"
            className="mb-2 flex h-9 items-center gap-2 rounded-md px-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <Home className="h-4 w-4" />
            返回前台
          </Link>
          <Button variant="ghost" className="h-9 w-full justify-start px-3 text-gray-600" onClick={doLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            退出登录
          </Button>
        </div>
      </aside>

      <div className="md:pl-56">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {navItems.find((item) => pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href)))?.label ?? "管理后台"}
            </p>
            <p className="hidden text-[11px] text-gray-500 sm:block">文件处理工具站运营管理</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-gray-500 sm:inline">{user.email}</span>
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              前台
            </Button>
          </div>
        </header>
        <div className="px-4 py-5 md:px-6">{children}</div>
      </div>
    </div>
  )
}
