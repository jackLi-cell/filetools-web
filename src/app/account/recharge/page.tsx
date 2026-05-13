"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react"
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

function formatPrice(priceCents: number) {
  const price = priceCents / 100
  return Number.isInteger(price) ? price.toFixed(0) : price.toFixed(1)
}

function creditsPerYuan(pkg: Package) {
  return pkg.priceCents > 0 ? Math.round(pkg.creditsAmount / (pkg.priceCents / 100)) : 0
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
    if (!user) return

    api.get<Package[]>("/api/payment/packages").then(res => {
      if (res.code === 0 && res.data) {
        setPackages(res.data)
        setSelectedPkg(current => current ?? res.data?.[0]?.id ?? null)
      }
    })

    api.get<PaymentMethod[]>("/api/payment/methods").then(res => {
      if (res.code === 0 && res.data) {
        setMethods(res.data)
        if (res.data.length > 0) setSelectedMethod(res.data[0].key)
      }
    })
  }, [user])

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

  const selectedPackage = useMemo(
    () => packages.find(pkg => pkg.id === selectedPkg) ?? null,
    [packages, selectedPkg]
  )

  const bestValueId = useMemo(() => {
    if (packages.length === 0) return null
    return packages.reduce((best, current) =>
      creditsPerYuan(current) > creditsPerYuan(best) ? current : best
    ).id
  }, [packages])

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
      setError("网络错误，请稍后重试")
    } finally {
      setOrdering(false)
    }
  }

  if (loading || !user) {
    return <div className="container mx-auto px-4 py-10 text-sm text-gray-500">加载中...</div>
  }

  if (paymentDone) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">充值成功</h1>
          <p className="mb-6 text-sm text-gray-500">支付已确认，积分会自动同步到你的账户余额。</p>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/account">
              <Button>返回个人中心</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setPaymentDone(false)
                setOrderResult(null)
                setSelectedPkg(packages[0]?.id ?? null)
              }}
            >
              继续充值
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (orderResult) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <button
            type="button"
            className="inline-flex items-center gap-1 hover:text-gray-700"
            onClick={() => {
              setOrderResult(null)
              setPolling(false)
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            重新选择套餐
          </button>
        </div>

        <Card className="p-6 sm:p-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">请完成支付</h1>
              <p className="mt-1 text-sm text-gray-500">订单号：{orderResult.orderNo}</p>
            </div>
            <Badge className="w-fit bg-blue-50 text-blue-700">等待确认</Badge>
          </div>

          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <div className="rounded-lg border bg-white p-4 text-center">
              {orderResult.qrUrl && orderResult.qrUrl !== orderResult.paymentUrl ? (
                // 支付二维码由支付渠道动态返回，不能预先配置 next/image 域名。
                // eslint-disable-next-line @next/next/no-img-element
                <img src={orderResult.qrUrl} alt="支付二维码" className="mx-auto h-52 w-52" />
              ) : (
                <div className="flex h-52 items-center justify-center rounded-md bg-gray-50">
                  <CreditCard className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">支付说明</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  请使用已选择的支付方式完成付款。支付成功后页面会自动检测订单状态，并刷新账户积分余额。
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                <div className="flex items-center gap-2 text-blue-700">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>每 2 秒自动检测一次支付状态</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                {orderResult.paymentUrl && (
                  <a href={orderResult.paymentUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full gap-2 sm:w-auto">
                      <ExternalLink className="h-4 w-4" />
                      打开支付页面
                    </Button>
                  </a>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setOrderResult(null)
                    setPolling(false)
                  }}
                >
                  取消订单选择
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/account" className="hover:text-gray-700">个人中心</Link>
        <span>/</span>
        <span className="text-gray-900">积分充值</span>
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">积分充值</h1>
          <p className="mt-2 text-sm text-gray-500">
            基础比例约为 1 元 = 10 积分，大额套餐包含赠送积分。积分用于高级文件处理任务。
          </p>
        </div>
        <div className="flex w-full items-center gap-3 rounded-lg border bg-white px-4 py-3 md:w-auto">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500">当前余额</p>
            <p className="text-lg font-semibold text-gray-900">{user.credits} 积分</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section>
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">选择充值套餐</h2>
                <p className="mt-1 text-sm text-gray-500">按使用频率选择，后续可在后台调整套餐。</p>
              </div>
              <Badge variant="outline">约 10 积分/元</Badge>
            </div>

            {packages.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm font-medium text-gray-900">暂无可用充值套餐</p>
                <p className="mt-2 text-sm text-gray-500">请先在后端运行 seed 或在数据库中启用充值套餐。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {packages.map(pkg => {
                  const active = selectedPkg === pkg.id
                  const isBestValue = bestValueId === pkg.id

                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPkg(pkg.id)}
                      className={`rounded-lg border-2 p-4 text-left transition-colors ${
                        active
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{pkg.name}</p>
                          <p className="mt-1 text-xs text-gray-500">{pkg.description || "适合日常文件处理"}</p>
                        </div>
                        {isBestValue && <Badge className="bg-emerald-50 text-emerald-700">更划算</Badge>}
                      </div>

                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{pkg.creditsAmount}</p>
                          <p className="text-xs text-gray-500">积分</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">¥{formatPrice(pkg.priceCents)}</p>
                          <p className="text-xs text-gray-500">约 {creditsPerYuan(pkg)} 积分/元</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </Card>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-white p-4">
              <ShieldCheck className="mb-2 h-5 w-5 text-emerald-600" />
              <p className="text-sm font-medium text-gray-900">自动到账</p>
              <p className="mt-1 text-xs text-gray-500">支付成功后自动刷新余额。</p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <Wallet className="mb-2 h-5 w-5 text-blue-600" />
              <p className="text-sm font-medium text-gray-900">长期有效</p>
              <p className="mt-1 text-xs text-gray-500">积分可持续用于高级工具。</p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <CreditCard className="mb-2 h-5 w-5 text-violet-600" />
              <p className="text-sm font-medium text-gray-900">按次消耗</p>
              <p className="mt-1 text-xs text-gray-500">仅高级处理任务扣积分。</p>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-gray-900">订单确认</h2>

            {selectedPackage ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">套餐</span>
                    <span className="text-sm font-medium text-gray-900">{selectedPackage.name}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-gray-500">到账积分</span>
                    <span className="text-sm font-medium text-gray-900">{selectedPackage.creditsAmount} 积分</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-gray-500">应付金额</span>
                    <span className="text-lg font-bold text-gray-900">¥{formatPrice(selectedPackage.priceCents)}</span>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-gray-900">支付方式</p>
                  {methods.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-gray-500">
                      支付方式暂未开放，请先完成后端支付配置。
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {methods.map(method => (
                        <button
                          key={method.key}
                          type="button"
                          onClick={() => setSelectedMethod(method.key)}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                            selectedMethod === method.key
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-gray-200 text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          <span>{method.name}</span>
                          {selectedMethod === method.key && <CheckCircle2 className="h-4 w-4" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  onClick={createOrder}
                  disabled={ordering || methods.length === 0 || !selectedMethod}
                  className="w-full gap-2"
                  size="lg"
                >
                  {ordering ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      创建订单中...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      立即支付
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">请选择一个充值套餐。</p>
            )}
          </Card>

          <div className="rounded-lg bg-gray-50 p-4 text-xs leading-6 text-gray-500">
            <p>充值前请确认账户已登录。</p>
            <p>如支付后 1 分钟内未到账，请联系 1055567003@qq.com 并附上订单号。</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
