'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Store,
  BarChart3,
  MessageCircle,
  Settings,
  Coffee,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const adminNavItems = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Packages', href: '/admin/packages', icon: <Package className="h-5 w-5" /> },
  { label: 'Shops', href: '/admin/shops', icon: <Store className="h-5 w-5" /> },
  { label: 'Reports', href: '/admin/reports', icon: <BarChart3 className="h-5 w-5" /> },
  { label: 'Messages', href: '/admin/messages', icon: <MessageCircle className="h-5 w-5" /> },
  { label: 'Settings', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-gray-900 flex flex-col">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
        <Coffee className="h-7 w-7 text-brand-400" />
        <div>
          <h1 className="text-lg font-bold text-white">CaféOS</h1>
          <p className="text-xs text-gray-400">Admin Portal</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {adminNavItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <span className={cn(isActive ? 'text-brand-400' : 'text-gray-500')}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
