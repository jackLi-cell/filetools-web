"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface Package {
  id: number
  name: string
  creditsAmount: number
  priceCents: number
  description: string | null
}

interface PaymentMethod {
  key: string
  name: string
  provider: string
}

export default function RechargePage() {
  const router = useRouter()
  const { user, loading, refresh } = useAuth()
  const [packages, setPackages] = useState<Package[]>([])
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [selectedPkg, setSelectedPkg] = useState<number | null>(null)
  const [selectedMethod, setSelectedMethod] = useState("")
  const [ordering, setOrdering] = useState(false)
  const [orderResult, setOrderResult] = useState<{ orderNo: string; paymentUrl: string; qrUrl: string } | null>(null)
  const [polling, setPolling] = useState(false)
  const [paymentDone, setPaymentDone] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [loading, user, router])

  useEffect(() => {
    if (user) {
      api.get<Package[]>("/api/payment/packages").then(res => {
        if (res.code === 0 && res.data) setPackages(res.data)
      })
      api.get<PaymentMethod[]>("/api/payment/methods").then(res => {
        if (res.code === 0 && res.data) {
          setMethods(res.data)
          if (res.data.length > 0) setSelectedMethod(res.data[0].key)
        }
      })
    }
  }, [user])

  // 轮询订单状态
  useEffect(() => {
    if (!polling || !orderResult) return
    const timer = setInterval(async () => {
      const res = await api.get<{ paymentStatus: string }>(`/api/payment/status/${orderResult.orderNo}`)
      if (res.code === 0 && res.data?.paymentStatus === "paid") {
        setPolling(false)
        setPaymentDone(true)
        await refresh()
      }
    }, 2000)
    return () => clearInterval(timer)
  }, [polling, orderResult, refresh])

  const createOrder = async () => {
    if (!selectedPkg || !selectedMethod) return
    setOrdering(true)
    setError("")
    try {
      const res = await api.post<{ orderNo: string; paymentUrl: string; qrUrl: string }>("/api/payment/create", {
        packageId: selectedPkg,
        paymentMethod: selectedMethod,
      })
      if (res.code === 0 && res.data) {
        setOrderResult(res.data)
        setPolling(true)
      } else {
        setError(res.message || "创建订单失败")
      }
    } catch {
      setError("网络错误")
    } finally {
      setOrdering(false)
    }
  }

  if (loading || !user) return <div className="container mx-auto px-4 py-10">加载中...</div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/account" className="hover:text-gray-700">个人中心</Link>
        <span>/</span>
        <span className="text-gray-900">积分充值</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">积分充值</h1>
      <p className="text-sm text-gray-500 mb-6">当前余额：<span className="text-blue-600 font-medium">{user.credits} 积分</span></p>

      {paymentDone ? (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">充值成功</h2>
          <p className="text-sm text-gray-500 mb-4">积分已到账</p>
          <div className="flex gap-2 justify-center">
            <Link href="/account"><Button>返回个人中心</Button></Link>
            <Button variant="outline" onClick={() => { setPaymentDone(false); setOrderResult(null); setSelectedPkg(null) }}>继续充值</Button>
          </div>
        </Card>
      ) : orderResult ? (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">请完成支付</h2>
          <div className="text-center space-y-4">
            {orderResult.qrUrl && orderResult.qrUrl !== orderResult.paymentUrl ? (
              <div className="p-4 bg-white border rounded-lg inline-block">
                <img src={orderResult.qrUrl} alt="支付二维码" className="w-48 h-48 mx-auto" />
              </div>
            ) : (
              <a href={orderResult.paymentUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg">打开支付页面</Button>
              </a>
            )}
            <p className="text-sm text-gray-500">请使用支付宝或微信扫码支付</p>
            <p className="text-xs text-gray-400">支付完成后页面将自动更新（每 2 秒检测）</p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs text-blue-600">等待支付确认...</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t">
            <Button variant="ghost" size="sm" onClick={() => { setOrderResult(null); setPolling(false) }}>取消，重新选择</Button>
          </div>
        </Card>
      ) : (
        <>
          {/* 套餐选择 */}
          <Card className="p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">选择套餐</h2>
            {packages.length === 0 ? (
              <p className="text-sm text-gray-500">充值功能即将开放，敬请期待。</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {packages.map(pkg => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPkg(pkg.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedPkg === pkg.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{pkg.name}</span>
                      <Badge className="bg-blue-100 text-blue-700">{pkg.creditsAmount} 积分</Badge>
                    </div>
                    <p className="text-lg font-bold text-gray-900">¥{(pkg.priceCents / 100).toFixed(0)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      ¥{(pkg.priceCents / 100 / pkg.creditsAmount).toFixed(3)}/积分
                      {pkg.description && ` · ${pkg.description}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 支付方式 */}
          {methods.length > 0 && selectedPkg && (
            <Card className="p-6 mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">支付方式</h2>
              <div className="flex gap-3 flex-wrap">
                {methods.map(m => (
                  <button
                    key={m.key}
                    onClick={() => setSelectedMethod(m.key)}
                    className={`px-4 py-2.5 border-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedMethod === m.key ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">{error}</div>}

          {selectedPkg && selectedMethod && (
            <Button onClick={createOrder} disabled={ordering} className="w-full" size="lg">
              {ordering ? "创建订单中..." : "立即支付"}
            </Button>
          )}
        </>
      )}

      <div className="mt-8 p-4 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
        <p>· 充值积分永不过期</p>
        <p>· 支付完成后积分立即到账</p>
        <p>· 如有问题请联系 1055567003@qq.com</p>
      </div>
    </div>
  )
}
