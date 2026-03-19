'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import { Store, ShoppingCart, DollarSign, Package, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n'

interface AdminDashboard {
  shopCount: number
  activeShopCount: number
  totalSales: number
  totalRevenue: number
  packages: { id: string; name: string; _count: { shops: number } }[]
  unreadChats: number
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null)
  const { t, bilingual, lang } = useI18n()

  useEffect(() => {
    fetch('/api/admin')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
  }, [])

  if (!data) return <div className="text-center py-20 text-gray-400">{t('common.loading')}</div>

  const [mainTitle, subTitle] = bilingual('adminDash.title')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={cn('text-2xl font-bold text-gray-900', lang === 'km' && 'font-khmer')}>
          {mainTitle}
          <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{subTitle}</span>
        </h1>
        {data.unreadChats > 0 && (
          <Link href="/admin/messages">
            <Badge variant="danger" className="text-sm px-3 py-1">
              <MessageCircle className="h-4 w-4 mr-1" />
              {data.unreadChats} {t('adminDash.unreadChats')}
            </Badge>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Store className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('adminDash.totalShops')}</p>
              <p className="text-2xl font-bold text-gray-900">{data.shopCount}</p>
              <p className="text-xs text-green-600">{data.activeShopCount} {t('adminDash.active')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('adminDash.totalSales')}</p>
              <p className="text-2xl font-bold text-gray-900">{data.totalSales}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('adminDash.totalRevenue')}</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-brand-50 flex items-center justify-center">
              <Package className="h-6 w-6 text-brand-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('adminDash.packages')}</p>
              <p className="text-2xl font-bold text-gray-900">{data.packages.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminDash.planDistribution')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.packages.map((pkg) => (
              <div key={pkg.id} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{pkg.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{
                        width: `${data.shopCount > 0 ? (pkg._count.shops / data.shopCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-8 text-right">{pkg._count.shops}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
