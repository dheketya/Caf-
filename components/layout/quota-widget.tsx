'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { differenceInDays } from 'date-fns'

interface QuotaWidgetProps {
  used: number
  limit: number | null
  resetDate: Date
}

interface QuotaData {
  used: number
  limit: number | null
  resetDate: Date
}

export function QuotaWidget({ used: initialUsed, limit: initialLimit, resetDate: initialResetDate }: QuotaWidgetProps) {
  const { t } = useI18n()
  const [quota, setQuota] = useState<QuotaData>({
    used: initialUsed,
    limit: initialLimit,
    resetDate: initialResetDate,
  })

  // Refresh quota from API every 30 seconds to catch plan changes
  useEffect(() => {
    async function refreshQuota() {
      try {
        const res = await fetch('/api/shops/me')
        if (!res.ok) return
        const shop = await res.json()
        if (!shop?.package) return
        setQuota({
          used: shop.saleCount,
          limit: shop.quotaOverride ?? shop.package.saleLimit,
          resetDate: quota.resetDate, // keep the reset date
        })
      } catch {}
    }

    // Refresh immediately to catch any plan change
    refreshQuota()

    const interval = setInterval(refreshQuota, 30000)
    return () => clearInterval(interval)
  }, [])

  const { used, limit, resetDate } = quota

  if (limit === null) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm">
        <span className="font-medium">{used}</span>
        <span className="text-green-500">{t('quota.sales')} · {t('quota.salesUnlimited')}</span>
      </div>
    )
  }

  const percentage = Math.round((used / limit) * 100)
  const daysUntilReset = differenceInDays(new Date(resetDate), new Date())

  const color =
    percentage >= 90 ? 'red' : percentage >= 70 ? 'amber' : 'green'

  return (
    <div
      className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm', {
        'bg-green-50 text-green-700': color === 'green',
        'bg-amber-50 text-amber-700': color === 'amber',
        'bg-red-50 text-red-700': color === 'red',
      })}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-semibold">
          {used} / {limit}
        </span>
        <span className={cn({
          'text-green-500': color === 'green',
          'text-amber-500': color === 'amber',
          'text-red-500': color === 'red',
        })}>
          {t('quota.salesUsed')}
        </span>
      </div>
      <span className="text-gray-400">·</span>
      <span className="text-gray-500">
        {daysUntilReset} {t('quota.daysUntilReset')}
      </span>
      <div className="ml-2 w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', {
            'bg-green-500': color === 'green',
            'bg-amber-500': color === 'amber',
            'bg-red-500': color === 'red',
          })}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}
