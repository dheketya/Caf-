'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import { Store, ShoppingCart, DollarSign, Package, MessageCircle, ArrowUpDown, Clock, AlertTriangle, Activity } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n'

interface PlanChange {
  id: string
  shopName: string
  packageName: string
  billingCycle: string
  price: number
  action: string
  createdAt: string
}

interface NearDueShop {
  id: string
  name: string
  packageName: string
  planExpiresAt: string
  daysLeft: number
}

interface ExpiredShop {
  id: string
  name: string
  packageName: string
  planExpiresAt: string
  daysOverdue: number
  graceDaysLeft: number
}

interface ShopActivity {
  id: string
  name: string
  lastActiveAt: string | null
  packageName: string
  ownerName: string
}

interface AdminDashboard {
  shopCount: number
  activeShopCount: number
  totalSales: number
  totalRevenue: number
  packages: { id: string; name: string; _count: { shops: number } }[]
  unreadChats: number
  recentPlanChanges: PlanChange[]
  nearDueShops: NearDueShop[]
  expiredShops: ExpiredShop[]
  shopsWithActivity: ShopActivity[]
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

  const actionColors: Record<string, string> = {
    subscribed: 'bg-green-100 text-green-700',
    upgraded: 'bg-blue-100 text-blue-700',
    downgraded: 'bg-amber-100 text-amber-700',
    renewed: 'bg-emerald-100 text-emerald-700',
    expired: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', {
      month: 'short', day: 'numeric',
    })
  }

  function timeAgo(d: string | null): string {
    if (!d) return t('adminDash.neverActive')
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return lang === 'en' ? 'Just now' : 'ឥឡូវនេះ'
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d`
    return `${Math.floor(days / 30)}mo`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={cn('text-2xl font-bold text-gray-900', lang === 'km' && 'font-khmer')}>
          {mainTitle}
          <span className={cn('block text-sm font-normal opacity-60', lang === 'km' ? '' : 'font-khmer')}>{subTitle}</span>
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

      {/* Stat Cards */}
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

      {/* Expiring Soon + Expired (Grace Period) */}
      {(data.nearDueShops.length > 0 || data.expiredShops.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Near Due */}
          <Card className={data.nearDueShops.length > 0 ? 'border-amber-200' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-amber-500" />
                {t('adminDash.nearDue')}
                {data.nearDueShops.length > 0 && (
                  <Badge variant="warning" className="ml-auto">{data.nearDueShops.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.nearDueShops.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">{t('adminDash.noDue')}</p>
              ) : (
                <div className="space-y-2">
                  {data.nearDueShops.map((shop) => (
                    <div key={shop.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{shop.name}</p>
                        <p className="text-xs text-gray-400">{shop.packageName} · {formatDate(shop.planExpiresAt)}</p>
                      </div>
                      <Badge variant={shop.daysLeft <= 3 ? 'danger' : 'warning'} className="text-xs">
                        {shop.daysLeft} {t('adminDash.daysLeft')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expired in Grace */}
          {data.expiredShops.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  {t('adminDash.expiredGrace')}
                  <Badge variant="danger" className="ml-auto">{data.expiredShops.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.expiredShops.map((shop) => (
                    <div key={shop.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{shop.name}</p>
                        <p className="text-xs text-gray-400">{shop.packageName} · {shop.daysOverdue} {t('adminDash.daysOverdue')}</p>
                      </div>
                      <Badge variant="danger" className="text-xs">
                        {shop.graceDaysLeft} {t('adminDash.graceDaysLeft')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Recent Plan Changes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
              {t('adminDash.recentPlanChanges')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentPlanChanges.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">{t('adminDash.noChanges')}</p>
            ) : (
              <div className="space-y-0 max-h-[300px] overflow-y-auto">
                {data.recentPlanChanges.map((change) => {
                  const actionKey = `billing.action.${change.action}`
                  return (
                    <div key={change.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <div className={cn('w-2 h-2 rounded-full shrink-0',
                        change.action === 'expired' || change.action === 'downgraded' ? 'bg-red-400' :
                        change.action === 'upgraded' || change.action === 'subscribed' ? 'bg-green-400' :
                        'bg-gray-400'
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{change.shopName}</span>
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0', actionColors[change.action] || 'bg-gray-100 text-gray-600')}>
                            {t(actionKey)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span>{change.packageName}</span>
                          <span>·</span>
                          <span className="capitalize">{change.billingCycle}</span>
                          {change.price > 0 && (
                            <>
                              <span>·</span>
                              <span>{formatCurrency(change.price)}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{formatDate(change.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Shop Activity - Last Active */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-400" />
            {t('adminDash.shopActivity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-2 font-medium">{t('adminShops.shop')}</th>
                  <th className="pb-2 font-medium">{t('adminShops.owner')}</th>
                  <th className="pb-2 font-medium">{t('adminShops.plan')}</th>
                  <th className="pb-2 font-medium text-right">{t('adminDash.lastActive')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.shopsWithActivity.map((shop) => (
                  <tr key={shop.id} className="text-gray-700">
                    <td className="py-2.5 font-medium">{shop.name}</td>
                    <td className="py-2.5 text-gray-500">{shop.ownerName}</td>
                    <td className="py-2.5">
                      <Badge variant="info" className="text-xs">{shop.packageName}</Badge>
                    </td>
                    <td className="py-2.5 text-right">
                      {shop.lastActiveAt ? (
                        <span className="text-gray-600" title={new Date(shop.lastActiveAt).toLocaleString()}>
                          {timeAgo(shop.lastActiveAt)}
                          <span className="text-xs text-gray-400 ml-1">
                            ({formatDate(shop.lastActiveAt)})
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-400">{t('adminDash.neverActive')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
