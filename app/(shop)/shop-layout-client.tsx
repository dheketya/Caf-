'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

interface ShopLayoutClientProps {
  children: React.ReactNode
  role: string
  shopName: string
  shopLogo?: string | null
  brandColor?: string
  packageName: string
  quota: {
    used: number
    limit: number | null
    resetDate: Date
    isBlocked: boolean
  }
}

export function ShopLayoutClient({ children, role, shopName, shopLogo, brandColor, packageName, quota }: ShopLayoutClientProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t, lang } = useI18n()

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        role={role}
        shopName={shopName}
        shopLogo={shopLogo}
        brandColor={brandColor}
        isQuotaBlocked={quota.isBlocked}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setCollapsed(!collapsed)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className={cn('transition-all duration-200', collapsed ? 'lg:ml-16' : 'lg:ml-64')}>
        <Header quota={quota} onMenuClick={() => setMobileOpen(true)} />
        {quota.isBlocked && (
          <div className="mx-3 sm:mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className={cn('font-semibold text-amber-800', lang === 'km' && 'font-khmer')}>{t('layout.quotaReached')}</h3>
                <p className={cn('text-sm text-amber-700 mt-1', lang === 'km' && 'font-khmer')}>
                  <strong>{packageName}</strong> {t('layout.quotaReachedMsg').replace('{limit}', quota.limit?.toLocaleString() || '')}
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <Link
                    href="/billing"
                    className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
                  >
                    {t('billing.upgrade')}
                  </Link>
                  <span className="inline-flex items-center text-sm text-amber-600">
                    {t('layout.resets')} {new Date(quota.resetDate).toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', { month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="p-3 sm:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
