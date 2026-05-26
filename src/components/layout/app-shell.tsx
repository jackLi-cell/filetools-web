"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import type { Dictionary } from "@/i18n/get-dictionary"

interface AppShellProps {
  children: ReactNode
  locale: string
  dict: Dictionary
}

export function AppShell({ children, locale, dict }: AppShellProps) {
  const pathname = usePathname()
  const isAdmin = pathname?.includes("/admin")

  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <>
      <Header locale={locale} dict={dict} />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} dict={dict} />
    </>
  )
}
