'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, toKHR } from '@/lib/utils'
import { BarChart3, ShoppingCart, Package, Banknote, QrCode, ArrowLeftRight } from 'lucide-react'

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

interface SalesReport {
  totalSales: number
  totalRevenue: number
  avgOrderValue: number
  topProducts: { name: string; count: number; revenue: number }[]
  paymentBreakdown: PaymentBreakdown[]
}

export default function ReportsPage() {
  const [report, setReport] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [exchangeRate, setExchangeRate] = useState(4100)

  useEffect(() => {
    fetch('/api/shops/me').then((r) => r.json()).then((shop) => {
      if (shop && !shop.error) setExchangeRate(shop.exchangeRate || 4100)
    })
  }, [])

  useEffect(() => {
    fetch('/api/orders?today=true')
      .then((r) => r.json())
      .then((orders) => {
        const totalSales = orders.length
        const totalRevenue = orders.reduce((s: number, o: any) => s + o.total, 0)
        const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0

        // Top products
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

        const topProducts = [...productMap.values()]
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)

        // Payment breakdown
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

        setReport({ totalSales, totalRevenue, avgOrderValue, topProducts, paymentBreakdown })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading reports...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Today&apos;s summary</p>
      </div>

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
            <p className="text-sm text-gray-400 text-center py-4">No sales yet today</p>
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
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          {report?.paymentBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No sales yet today</p>
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
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
