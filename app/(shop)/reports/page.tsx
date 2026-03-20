'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency, toKHR } from '@/lib/utils'
import { BarChart3, ShoppingCart, Package, Banknote, QrCode, ArrowLeftRight, CalendarDays, Users, UserCheck } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface PaymentBreakdown {
  method: string
  count: number
  revenue: number
}

interface DiscountSummary {
  type: string // 'Loyalty Reward', 'Manual Discount'
  count: number
  totalSaved: number
}

interface CustomerBreakdown {
  walkInOrders: number
  walkInRevenue: number
  customerOrders: number
  customerRevenue: number
}

interface SalesReport {
  totalSales: number
  totalRevenue: number
  totalDiscount: number
  avgOrderValue: number
  topProducts: { name: string; count: number; revenue: number }[]
  paymentBreakdown: PaymentBreakdown[]
  discountBreakdown: DiscountSummary[]
  customerBreakdown: CustomerBreakdown
}

function getMonthOptions() {
  const months = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    months.push({ value, label })
  }
  return months
}

export default function ReportsPage() {
  const { t, bilingual, lang } = useI18n()
  const [report, setReport] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [exchangeRate, setExchangeRate] = useState(4100)

  // Filters
  const [period, setPeriod] = useState<'today' | 'month'>('today')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [filterPayment, setFilterPayment] = useState<string>('')

  const monthOptions = getMonthOptions()

  const PAYMENT_LABELS: Record<string, string> = {
    CASH: t('pos.cash'),
    QR_EWALLET: t('pos.bank'),
    SPLIT: t('pos.cashAndBank'),
  }

  useEffect(() => {
    fetch('/api/shops/me').then((r) => r.json()).then((shop) => {
      if (shop && !shop.error) setExchangeRate(shop.exchangeRate || 4100)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (period === 'today') {
      params.set('today', 'true')
    } else {
      params.set('month', selectedMonth)
    }
    if (filterPayment) params.set('payment', filterPayment)

    fetch(`/api/orders?${params}`)
      .then((r) => r.json())
      .then((orders) => {
        const totalSales = orders.length
        const totalRevenue = orders.reduce((s: number, o: any) => s + o.total, 0)
        const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0

        const productMap = new Map<string, { name: string; count: number; revenue: number }>()
        for (const order of orders) {
          for (const item of order.items || []) {
            const key = item.product?.name || item.productId
            const existing = productMap.get(key) || { name: key, count: 0, revenue: 0 }
            existing.count += item.quantity
            existing.revenue += item.total
            productMap.set(key, existing)
          }
        }
        const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5)

        const paymentMap = new Map<string, { count: number; revenue: number }>()
        for (const order of orders) {
          const method = order.paymentMethod || 'OTHER'
          const existing = paymentMap.get(method) || { count: 0, revenue: 0 }
          existing.count++
          existing.revenue += order.total
          paymentMap.set(method, existing)
        }
        const paymentBreakdown = [...paymentMap.entries()]
          .map(([method, data]) => ({ method, ...data }))
          .sort((a, b) => b.revenue - a.revenue)

        // Discount breakdown
        let totalDiscount = 0
        const discountMap = new Map<string, { count: number; totalSaved: number }>()

        // Order-level discounts (loyalty, manual)
        for (const order of orders) {
          if (order.discountValue && order.subtotal > order.total) {
            const saved = order.subtotal - order.total
            totalDiscount += saved
            const type = order.discountReason || t('reports.manualDiscount')
            const existing = discountMap.get(type) || { count: 0, totalSaved: 0 }
            existing.count++
            existing.totalSaved += saved
            discountMap.set(type, existing)
          }

          // Product-level discounts
          for (const item of order.items || []) {
            if (item.originalPrice && item.originalPrice > item.unitPrice) {
              const saved = (item.originalPrice - item.unitPrice) * item.quantity
              totalDiscount += saved
              const existing = discountMap.get('Product Discount') || { count: 0, totalSaved: 0 }
              existing.count++
              existing.totalSaved += saved
              discountMap.set('Product Discount', existing)
            }
          }
        }

        const discountBreakdown = [...discountMap.entries()]
          .map(([type, data]) => ({ type, ...data }))
          .sort((a, b) => b.totalSaved - a.totalSaved)

        // Customer breakdown: walk-in vs registered
        let walkInOrders = 0, walkInRevenue = 0, customerOrders = 0, customerRevenue = 0
        for (const order of orders) {
          const isWalkIn = !order.customer || order.customer.phone === '000-WALK-IN'
          if (isWalkIn) {
            walkInOrders++
            walkInRevenue += order.total
          } else {
            customerOrders++
            customerRevenue += order.total
          }
        }
        const customerBreakdown = { walkInOrders, walkInRevenue, customerOrders, customerRevenue }

        setReport({ totalSales, totalRevenue, totalDiscount, avgOrderValue, topProducts, paymentBreakdown, discountBreakdown, customerBreakdown })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [period, selectedMonth, filterPayment])

  const periodLabel = period === 'today'
    ? t('reports.today')
    : monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth

  const [titleMain, titleSub] = bilingual('reports.title')

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className={cn('text-xl sm:text-2xl font-bold text-gray-900', lang === 'km' && 'font-khmer')}>{titleMain}
          <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{titleSub}</span>
        </h1>
        <p className="text-sm text-gray-500">{periodLabel} {t('reports.summary')}</p>
      </div>

      {/* Filters */}
      <div className="space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        {/* Period */}
        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setPeriod('today')}
            className={cn(
              'flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              period === 'today' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            {t('reports.today')}
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={cn(
              'flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              period === 'month' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            {t('reports.monthly')}
          </button>
        </div>

        {/* Month selector */}
        {period === 'month' && (
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Payment filter */}
        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1 overflow-x-auto">
          {[
            { value: '', label: t('pos.all'), icon: null },
            { value: 'CASH', label: t('pos.cash'), icon: <Banknote className="h-3.5 w-3.5" /> },
            { value: 'QR_EWALLET', label: t('pos.bank'), icon: <QrCode className="h-3.5 w-3.5" /> },
            { value: 'SPLIT', label: t('pos.cashAndBank'), icon: <ArrowLeftRight className="h-3.5 w-3.5" /> },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterPayment(opt.value)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                filterPayment === opt.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {opt.icon}{opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">{t('common.loading')}</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card>
              <CardContent className="p-3 sm:p-5">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-blue-50 flex items-center justify-center mb-2">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('reports.totalTransactions')}</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{report?.totalSales || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-5">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-green-50 flex items-center justify-center mb-2">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
                <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('reports.totalRevenue')}</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(report?.totalRevenue || 0)}</p>
                <p className="text-[9px] sm:text-xs text-gray-400">{toKHR(report?.totalRevenue || 0, exchangeRate)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-5">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-purple-50 flex items-center justify-center mb-2">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </div>
                <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('reports.avgOrderValue')}</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(report?.avgOrderValue || 0)}</p>
                <p className="text-[9px] sm:text-xs text-gray-400">{toKHR(report?.avgOrderValue || 0, exchangeRate)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.top5Products')}</CardTitle>
            </CardHeader>
            <CardContent>
              {report?.topProducts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">{t('reports.noSales')}</p>
              ) : (
                <div className="space-y-3">
                  {report?.topProducts.map((product, i) => (
                    <div key={product.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <span className="text-sm font-medium text-gray-400 w-5 sm:w-6 shrink-0">{i + 1}</span>
                        <span className="text-sm font-medium text-gray-900 truncate">{product.name}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">{product.count} {t('reports.sold')}</span>
                        <span className="text-xs text-gray-500 sm:hidden">x{product.count}</span>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(product.revenue)}</span>
                          <p className="text-[10px] sm:text-[11px] text-gray-400">{toKHR(product.revenue, exchangeRate)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Breakdown */}
          {!filterPayment && (
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.paymentMethods')}</CardTitle>
              </CardHeader>
              <CardContent>
                {report?.paymentBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">{t('reports.noSales')}</p>
                ) : (
                  <div className="space-y-4">
                    {report?.paymentBreakdown.map((pm) => {
                      const pct = report.totalRevenue > 0 ? Math.round((pm.revenue / report.totalRevenue) * 100) : 0
                      const icons: Record<string, React.ReactNode> = {
                        CASH: <Banknote className="h-4 w-4 text-green-600" />,
                        QR_EWALLET: <QrCode className="h-4 w-4 text-blue-600" />,
                        SPLIT: <ArrowLeftRight className="h-4 w-4 text-purple-600" />,
                      }
                      return (
                        <div key={pm.method}>
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {icons[pm.method] || <Banknote className="h-4 w-4 text-gray-400" />}
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {PAYMENT_LABELS[pm.method] || pm.method}
                              </span>
                              <span className="text-xs text-gray-400 hidden sm:inline">{pm.count} {t('reports.order')}{pm.count !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(pm.revenue)}</span>
                                <p className="text-[10px] sm:text-[11px] text-gray-400">{toKHR(pm.revenue, exchangeRate)}</p>
                              </div>
                              <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Discount Breakdown */}
          {report && report.discountBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{t('reports.discountGiven')}</CardTitle>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-red-600">-{formatCurrency(report.totalDiscount)}</p>
                    <p className="text-[10px] text-gray-400">-{toKHR(report.totalDiscount, exchangeRate)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.discountBreakdown.map((d) => (
                    <div key={d.type} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm shrink-0">{d.type === 'Loyalty Reward' ? '🎉' : '🏷️'}</span>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-gray-900 truncate block">
                            {d.type === 'Loyalty Reward' ? t('reports.loyaltyReward') : d.type === 'Manual Discount' ? t('reports.manualDiscount') : d.type}
                          </span>
                          <p className="text-xs text-gray-400">{d.count} {t('reports.order')}{d.count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-red-600">-{formatCurrency(d.totalSaved)}</p>
                        <p className="text-[10px] text-gray-400">-{toKHR(d.totalSaved, exchangeRate)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customer Breakdown */}
          {report && report.totalSales > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.customerBreakdown')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Walk-in */}
                  <div>
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{t('reports.walkIn')}</span>
                        <span className="text-xs text-gray-400">{report.customerBreakdown.walkInOrders} {t('reports.order')}{report.customerBreakdown.walkInOrders !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(report.customerBreakdown.walkInRevenue)}</span>
                          <p className="text-[10px] sm:text-[11px] text-gray-400">{toKHR(report.customerBreakdown.walkInRevenue, exchangeRate)}</p>
                        </div>
                        <span className="text-xs text-gray-400 w-8 text-right">
                          {report.totalRevenue > 0 ? Math.round((report.customerBreakdown.walkInRevenue / report.totalRevenue) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gray-400" style={{ width: `${report.totalRevenue > 0 ? (report.customerBreakdown.walkInRevenue / report.totalRevenue) * 100 : 0}%` }} />
                    </div>
                  </div>
                  {/* Registered */}
                  <div>
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserCheck className="h-4 w-4 text-brand-500" />
                        <span className="text-sm font-medium text-gray-900">{t('reports.registered')}</span>
                        <span className="text-xs text-gray-400">{report.customerBreakdown.customerOrders} {t('reports.order')}{report.customerBreakdown.customerOrders !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(report.customerBreakdown.customerRevenue)}</span>
                          <p className="text-[10px] sm:text-[11px] text-gray-400">{toKHR(report.customerBreakdown.customerRevenue, exchangeRate)}</p>
                        </div>
                        <span className="text-xs text-gray-400 w-8 text-right">
                          {report.totalRevenue > 0 ? Math.round((report.customerBreakdown.customerRevenue / report.totalRevenue) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${report.totalRevenue > 0 ? (report.customerBreakdown.customerRevenue / report.totalRevenue) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
