'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        role={role}
        shopName={shopName}
        shopLogo={shopLogo}
        brandColor={brandColor}
        isQuotaBlocked={quota.isBlocked}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <div className={cn('transition-all duration-200', collapsed ? 'ml-16' : 'ml-64')}>
        <Header quota={quota} />
        {quota.isBlocked && (
          <div className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800">Sale quota reached</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Your <strong>{packageName}</strong> plan has reached its monthly limit of{' '}
                  <strong>{quota.limit?.toLocaleString()}</strong> sales. Features like POS are temporarily locked until the quota resets or you upgrade your plan.
                </p>
                <div className="flex gap-3 mt-3">
                  <Link
                    href="/billing"
                    className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
                  >
                    Upgrade Plan
                  </Link>
                  <span className="inline-flex items-center text-sm text-amber-600">
                    Resets {new Date(quota.resetDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
