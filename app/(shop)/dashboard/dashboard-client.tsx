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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-blue-50 flex items-center justify-center mb-2">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('dashboard.todaySales')}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{todayOrdersCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-green-50 flex items-center justify-center mb-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </div>
            <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('dashboard.todayRevenue')}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">
              {formatCurrency(todayRevenue, shopCurrency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-purple-50 flex items-center justify-center mb-2">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
            </div>
            <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('dashboard.products')}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{productCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-brand-50 flex items-center justify-center mb-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-brand-600" />
            </div>
            <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('dashboard.monthlyQuota')}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">
              {quotaUsed}{quotaLimit ? ` / ${quotaLimit}` : ''}
            </p>
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
