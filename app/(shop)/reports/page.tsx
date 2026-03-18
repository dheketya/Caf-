'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency, toKHR } from '@/lib/utils'
import { BarChart3, ShoppingCart, Package, Banknote, QrCode, ArrowLeftRight, CalendarDays } from 'lucide-react'

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  QR_EWALLET: 'Bank Transfer',
  SPLIT: 'Cash + Bank',
}

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

interface SalesReport {
  totalSales: number
  totalRevenue: number
  totalDiscount: number
  avgOrderValue: number
  topProducts: { name: string; count: number; revenue: number }[]
  paymentBreakdown: PaymentBreakdown[]
  discountBreakdown: DiscountSummary[]
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
            const type = order.discountReason || 'Manual Discount'
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

        setReport({ totalSales, totalRevenue, totalDiscount, avgOrderValue, topProducts, paymentBreakdown, discountBreakdown })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [period, selectedMonth, filterPayment])

  const periodLabel = period === 'today'
    ? "Today's"
    : monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">{periodLabel} summary</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period */}
        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setPeriod('today')}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              period === 'today' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            Today
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              period === 'month' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            Monthly
          </button>
        </div>

        {/* Month selector */}
        {period === 'month' && (
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Payment filter */}
        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
          {[
            { value: '', label: 'All' },
            { value: 'CASH', label: 'Cash', icon: <Banknote className="h-3.5 w-3.5" /> },
            { value: 'QR_EWALLET', label: 'Bank', icon: <QrCode className="h-3.5 w-3.5" /> },
            { value: 'SPLIT', label: 'Mixed', icon: <ArrowLeftRight className="h-3.5 w-3.5" /> },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterPayment(opt.value)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors',
                filterPayment === opt.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {opt.icon}{opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading reports...</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center gap-4 py-5">
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">{report?.totalSales || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 py-5">
                <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(report?.totalRevenue || 0)}</p>
                  <p className="text-xs text-gray-400">{toKHR(report?.totalRevenue || 0, exchangeRate)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 py-5">
                <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Order Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(report?.avgOrderValue || 0)}</p>
                  <p className="text-xs text-gray-400">{toKHR(report?.avgOrderValue || 0, exchangeRate)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Products</CardTitle>
            </CardHeader>
            <CardContent>
              {report?.topProducts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No sales in this period</p>
              ) : (
                <div className="space-y-3">
                  {report?.topProducts.map((product, i) => (
                    <div key={product.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-400 w-6">{i + 1}</span>
                        <span className="text-sm font-medium text-gray-900">{product.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">{product.count} sold</span>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(product.revenue)}</span>
                          <p className="text-[11px] text-gray-400">{toKHR(product.revenue, exchangeRate)}</p>
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
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                {report?.paymentBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No sales in this period</p>
                ) : (
                  <div className="space-y-3">
                    {report?.paymentBreakdown.map((pm) => {
                      const pct = report.totalRevenue > 0 ? Math.round((pm.revenue / report.totalRevenue) * 100) : 0
                      const icons: Record<string, React.ReactNode> = {
                        CASH: <Banknote className="h-4 w-4 text-green-600" />,
                        QR_EWALLET: <QrCode className="h-4 w-4 text-blue-600" />,
                        SPLIT: <ArrowLeftRight className="h-4 w-4 text-purple-600" />,
                      }
                      return (
                        <div key={pm.method}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {icons[pm.method] || <Banknote className="h-4 w-4 text-gray-400" />}
                              <span className="text-sm font-medium text-gray-900">
                                {PAYMENT_LABELS[pm.method] || pm.method}
                              </span>
                              <span className="text-xs text-gray-400">{pm.count} orders</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(pm.revenue)}</span>
                                <p className="text-[11px] text-gray-400">{toKHR(pm.revenue, exchangeRate)}</p>
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
                <div className="flex items-center justify-between">
                  <CardTitle>Discounts Given</CardTitle>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">-{formatCurrency(report.totalDiscount)}</p>
                    <p className="text-[10px] text-gray-400">-{toKHR(report.totalDiscount, exchangeRate)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.discountBreakdown.map((d) => (
                    <div key={d.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{d.type === 'Loyalty Reward' ? '🎉' : '🏷️'}</span>
                        <div>
                          <span className="text-sm font-medium text-gray-900">{d.type}</span>
                          <p className="text-xs text-gray-400">{d.count} order{d.count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-600">-{formatCurrency(d.totalSaved)}</p>
                        <p className="text-[10px] text-gray-400">-{toKHR(d.totalSaved, exchangeRate)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
