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
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

const adminNavItems = [
  { labelKey: 'admin.dashboard', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { labelKey: 'admin.packages', href: '/admin/packages', icon: <Package className="h-5 w-5" /> },
  { labelKey: 'admin.shops', href: '/admin/shops', icon: <Store className="h-5 w-5" /> },
  { labelKey: 'admin.reports', href: '/admin/reports', icon: <BarChart3 className="h-5 w-5" /> },
  { labelKey: 'admin.messages', href: '/admin/messages', icon: <MessageCircle className="h-5 w-5" /> },
  { labelKey: 'admin.settings', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { lang, setLang, bilingual } = useI18n()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-gray-900 flex flex-col">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
        <Coffee className="h-7 w-7 text-brand-400" />
        <div>
          <h1 className="text-lg font-bold text-white">CaféOS</h1>
          <p className={cn('text-xs text-gray-400', lang === 'km' && 'font-khmer')}>
            {lang === 'en' ? 'Admin Portal' : 'ផ្ទាល់ខ្លួនអ្នកគ្រប់គ្រង'}
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {adminNavItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)
          const [main, sub] = bilingual(item.labelKey)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <span className={cn('shrink-0', isActive ? 'text-brand-400' : 'text-gray-500')}>
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block leading-tight', lang === 'km' && 'font-khmer')}>{main}</span>
                <span className={cn('block text-[9px] leading-tight', isActive ? 'opacity-50' : 'opacity-40', lang === 'km' ? '' : 'font-khmer')}>{sub}</span>
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Language toggle */}
      <button
        onClick={() => setLang(lang === 'en' ? 'km' : 'en')}
        className="flex items-center gap-3 px-5 py-3 border-t border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        title={lang === 'en' ? 'ប្តូរទៅភាសាខ្មែរ' : 'Switch to English'}
      >
        <Globe className="h-4 w-4 shrink-0" />
        <span className="text-xs">
          <span className={cn('font-medium', lang === 'km' && 'font-khmer')}>
            {lang === 'en' ? 'English' : 'ខ្មែរ'}
          </span>
          <span className={cn('ml-1.5 opacity-50', lang === 'en' ? 'font-khmer' : '')}>
            {lang === 'en' ? 'ខ្មែរ' : 'English'}
          </span>
        </span>
      </button>
    </aside>
  )
}
