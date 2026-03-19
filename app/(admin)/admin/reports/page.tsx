'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, cn } from '@/lib/utils'
import { BarChart3, Store, ShoppingCart, DollarSign, Download, TrendingUp, Calendar, CreditCard } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface PlanDist {
  name: string
  total: number
  monthly: number
  annual: number
  monthlyPrice: number
  annualPrice: number
  estimatedMonthlyRevenue: number
}

interface NewShop {
  id: string
  name: string
  packageName: string
  billingCycle: string
  price: number
  ownerName: string
  ownerEmail: string
  createdAt: string
}

interface ReportData {
  totalShops: number
  activeShops: number
  totalSales: number
  totalRevenue: number
  periodSales: number
  periodRevenue: number
  periodNewShops: NewShop[]
  planDistribution: PlanDist[]
  totalSubscriptionRevenue: number
  period: string
}

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [period, setPeriod] = useState<string>('monthly')
  const { t, bilingual, lang } = useI18n()

  useEffect(() => {
    fetch(`/api/admin/reports?period=${period}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
  }, [period])

  if (!data) return <div className="text-center py-20 text-gray-400">{t('common.loading')}</div>

  const [mainTitle, subTitle] = bilingual('adminReports.title')

  const periodLabels: Record<string, string> = {
    daily: t('adminReports.daily'),
    weekly: t('adminReports.weekly'),
    monthly: t('adminReports.monthly'),
    yearly: t('adminReports.yearly'),
  }

  const maxShops = Math.max(...data.planDistribution.map((p) => p.total), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className={cn('text-2xl font-bold text-gray-900', lang === 'km' && 'font-khmer')}>
          {mainTitle}
          <span className={cn('block text-sm font-normal opacity-60', lang === 'km' ? '' : 'font-khmer')}>{subTitle}</span>
        </h1>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> {t('adminReports.exportCSV')}
        </Button>
      </div>

      {/* Period Filter */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              period === p
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Store className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('adminReports.activeShops')}</p>
              <p className="text-2xl font-bold text-gray-900">{data.activeShops}</p>
              <p className="text-xs text-gray-400">{data.totalShops} {t('adminReports.totalSales').toLowerCase().includes('total') ? 'total' : ''}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('adminReports.totalSales')}</p>
              <p className="text-2xl font-bold text-gray-900">{data.periodSales.toLocaleString()}</p>
              <p className="text-xs text-gray-400">{data.totalSales.toLocaleString()} {lang === 'en' ? 'all time' : 'គ្រប់ពេល'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('adminReports.totalRevenue')}</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.periodRevenue)}</p>
              <p className="text-xs text-gray-400">{formatCurrency(data.totalRevenue)} {lang === 'en' ? 'all time' : 'គ្រប់ពេល'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('adminReports.totalSubscriptionRevenue')}</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalSubscriptionRevenue)}</p>
              <p className="text-xs text-gray-400">/{lang === 'en' ? 'month est.' : 'ខែ ប៉ាន់ស្មាន'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-gray-400" />
              {t('adminReports.planDistribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.planDistribution.map((pkg) => (
                <div key={pkg.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{pkg.name}</span>
                    <span className="text-sm font-bold text-gray-700">{pkg.total} {t('adminReports.shops').toLowerCase()}</span>
                  </div>
                  {/* Bar */}
                  <div className="h-6 bg-gray-100 rounded-full overflow-hidden flex">
                    {pkg.monthly > 0 && (
                      <div
                        className="h-full bg-blue-500 flex items-center justify-center text-[10px] font-medium text-white min-w-[32px]"
                        style={{ width: `${(pkg.monthly / maxShops) * 100}%` }}
                        title={`${t('adminReports.monthlyBilling')}: ${pkg.monthly}`}
                      >
                        {pkg.monthly}
                      </div>
                    )}
                    {pkg.annual > 0 && (
                      <div
                        className="h-full bg-emerald-500 flex items-center justify-center text-[10px] font-medium text-white min-w-[32px]"
                        style={{ width: `${(pkg.annual / maxShops) * 100}%` }}
                        title={`${t('adminReports.annualBilling')}: ${pkg.annual}`}
                      >
                        {pkg.annual}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      {t('adminReports.monthlyBilling')}: {pkg.monthly}
                      {pkg.monthlyPrice > 0 && ` (${formatCurrency(pkg.monthlyPrice)}/mo)`}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {t('adminReports.annualBilling')}: {pkg.annual}
                      {pkg.annualPrice > 0 && ` (${formatCurrency(pkg.annualPrice)}/yr)`}
                    </span>
                  </div>
                  {pkg.estimatedMonthlyRevenue > 0 && (
                    <p className="text-xs text-amber-600 font-medium">
                      {t('adminReports.estimatedRevenue')}: {formatCurrency(pkg.estimatedMonthlyRevenue)}/{lang === 'en' ? 'mo' : 'ខែ'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* New Shops / Revenue from Shops */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              {t('adminReports.newShops')} — {periodLabels[period]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.periodNewShops.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{t('adminReports.noShops')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-500">
                      <th className="pb-2 font-medium">{t('adminReports.shopName')}</th>
                      <th className="pb-2 font-medium">{t('adminReports.plan')}</th>
                      <th className="pb-2 font-medium">{t('adminReports.cycle')}</th>
                      <th className="pb-2 font-medium text-right">{t('adminReports.price')}</th>
                      <th className="pb-2 font-medium">{t('adminReports.registeredAt')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.periodNewShops.map((shop) => (
                      <tr key={shop.id} className="text-gray-700">
                        <td className="py-2.5">
                          <p className="font-medium">{shop.name}</p>
                          <p className="text-xs text-gray-400">{shop.ownerName}</p>
                        </td>
                        <td className="py-2.5">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            shop.price === 0
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-blue-50 text-blue-700'
                          )}>
                            {shop.packageName}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className={cn(
                            'text-xs',
                            shop.billingCycle === 'annual' ? 'text-emerald-600' : 'text-gray-500'
                          )}>
                            {shop.billingCycle === 'annual' ? t('adminReports.annualBilling') : t('adminReports.monthlyBilling')}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-medium">
                          {shop.price === 0 ? (
                            <span className="text-gray-400">{t('adminReports.free')}</span>
                          ) : (
                            formatCurrency(shop.price)
                          )}
                        </td>
                        <td className="py-2.5 text-xs text-gray-400">
                          {new Date(shop.createdAt).toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {data.periodNewShops.some((s) => s.price > 0) && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-200">
                        <td colSpan={3} className="py-2.5 font-semibold text-gray-700">
                          {t('adminReports.revenueFromShops')}
                        </td>
                        <td className="py-2.5 text-right font-bold text-green-600">
                          {formatCurrency(data.periodNewShops.reduce((sum, s) => sum + s.price, 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
