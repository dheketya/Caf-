'use client'

import { useI18n } from '@/lib/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ShoppingCart,
  DollarSign,
  Package,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'

interface DashboardClientProps {
  shopName: string
  shopCurrency: string
  todayOrdersCount: number
  todayRevenue: number
  productCount: number
  quotaUsed: number
  quotaLimit: number | null
  onboardingComplete: boolean
  hasFirstSale: boolean
  staffCount: number
  lowStockItems: { id: string; name: string; currentQuantity: number; unit: string }[]
}

export default function DashboardClient({
  shopName,
  shopCurrency,
  todayOrdersCount,
  todayRevenue,
  productCount,
  quotaUsed,
  quotaLimit,
  onboardingComplete,
  hasFirstSale,
  staffCount,
  lowStockItems,
}: DashboardClientProps) {
  const { t, bilingual, lang } = useI18n()
  const [titleMain, titleSub] = bilingual('dashboard.title')

  return (
    <div className="space-y-6">
      <div>
        <h1 className={cn('text-2xl font-bold text-gray-900', lang === 'km' && 'font-khmer')}>
          {titleMain}
          <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{titleSub}</span>
        </h1>
        <p className="text-sm text-gray-500">{t('dashboard.welcomeBack')} {shopName}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('dashboard.todaySales')}</p>
              <p className="text-2xl font-bold text-gray-900">{todayOrdersCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('dashboard.todayRevenue')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(todayRevenue, shopCurrency)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('dashboard.products')}</p>
              <p className="text-2xl font-bold text-gray-900">{productCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-brand-50 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-brand-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('dashboard.monthlyQuota')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {quotaUsed}{quotaLimit ? ` / ${quotaLimit}` : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Checklist */}
      {!onboardingComplete && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.gettingStarted')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ChecklistItem
              done={productCount > 0}
              label={t('dashboard.addFirstProduct')}
              href="/products"
            />
            <ChecklistItem
              done={hasFirstSale}
              label={t('dashboard.makeTestSale')}
              href="/pos"
            />
            <ChecklistItem
              done={staffCount > 0}
              label={t('dashboard.inviteStaff')}
              href="/users"
            />
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('dashboard.lowStockAlerts')}
            </CardTitle>
            <Link href="/stock" className="text-sm text-brand-600 hover:text-brand-700">
              {t('dashboard.viewAll')}
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <span className="text-sm text-gray-700">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {item.currentQuantity} {item.unit}
                    </span>
                    <Badge variant="warning">{t('dashboard.low')}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ChecklistItem({
  done,
  label,
  href,
}: {
  done: boolean
  label: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <CheckCircle2
        className={`h-5 w-5 ${done ? 'text-green-500' : 'text-gray-300'}`}
      />
      <span className={`text-sm ${done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
        {label}
      </span>
    </Link>
  )
}
