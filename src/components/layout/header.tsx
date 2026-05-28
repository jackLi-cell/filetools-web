"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/lib/auth-context"
import { HeaderToolSearch, MobileToolSearchTrigger } from "@/components/header-tool-search"
import { LanguageSwitcher } from "@/components/language-switcher"
import type { Dictionary } from "@/i18n/get-dictionary"

interface HeaderProps {
  locale: string
  dict: Dictionary
}

export function Header({ locale, dict }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const { user, loading, logout } = useAuth()
  const pathname = usePathname()

  const prefix = `/${locale}`

  const navLinks = [
    { href: `${prefix}`, label: dict.nav.home },
    { href: `${prefix}/tools`, label: dict.nav.allTools },
    { href: `${prefix}/pricing`, label: dict.nav.pricing },
  ]

  const isActive = (href: string) => {
    if (href === prefix) return pathname === prefix || pathname === `${prefix}/`
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href={prefix} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
            🐱
          </div>
          <span className="text-lg font-semibold text-gray-900">{dict.site.name}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                isActive(link.href)
                  ? "bg-blue-50 font-medium text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <HeaderToolSearch />
          <LanguageSwitcher locale={locale} dict={dict} />
          {loading ? null : user ? (
            <>
              <Link href={`${prefix}/account`} className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{user.credits} {dict.nav.credits}</span>
                <span>{user.name || user.email}</span>
              </Link>
              <Link href={`${prefix}/account/recharge`}><Button variant="outline" size="sm">{dict.nav.recharge}</Button></Link>
              <Button variant="ghost" size="sm" onClick={logout}>{dict.nav.logout}</Button>
            </>
          ) : (
            <>
              <Link href={`${prefix}/login`}><Button variant="ghost" size="sm">{dict.nav.login}</Button></Link>
              <Link href={`${prefix}/register`}><Button size="sm">{dict.nav.register}</Button></Link>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px]">
            <nav className="flex flex-col gap-4 mt-8">
              <MobileToolSearchTrigger onClose={() => setOpen(false)} />
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-2 text-base transition-colors ${
                    isActive(link.href)
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="px-3 py-2">
                <LanguageSwitcher locale={locale} dict={dict} />
              </div>
              <div className="border-t pt-4 mt-2 flex flex-col gap-2">
                {user ? (
                  <>
                    <Link href={`${prefix}/account`} onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full">{dict.nav.account}（{user.credits} {dict.nav.credits}）</Button>
                    </Link>
                    <Link href={`${prefix}/account/recharge`} onClick={() => setOpen(false)}>
                      <Button className="w-full">{dict.nav.recharge}</Button>
                    </Link>
                    <Button variant="ghost" onClick={() => { logout(); setOpen(false) }}>{dict.nav.logoutFull}</Button>
                  </>
                ) : (
                  <>
                    <Link href={`${prefix}/login`} onClick={() => setOpen(false)}><Button variant="outline" className="w-full">{dict.nav.login}</Button></Link>
                    <Link href={`${prefix}/register`} onClick={() => setOpen(false)}><Button className="w-full">{dict.nav.register}</Button></Link>
                  </>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
