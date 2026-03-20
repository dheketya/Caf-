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
  X,
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

interface AdminSidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function AdminSidebar({ mobileOpen, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname()
  const { lang, setLang, bilingual } = useI18n()

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
        <Coffee className="h-7 w-7 text-brand-400" />
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">CaféOS</h1>
          <p className={cn('text-xs text-gray-400', lang === 'km' && 'font-khmer')}>
            {lang === 'en' ? 'Admin Portal' : 'ផ្ទាល់ខ្លួនអ្នកគ្រប់គ្រង'}
          </p>
        </div>
        {mobileOpen && (
          <button onClick={onMobileClose} className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        )}
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
              onClick={onMobileClose}
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

      {/* Version label */}
      <div className="px-5 py-1.5 border-t border-gray-800 text-gray-500 text-[10px]">
        {`CaféOS v${process.env.APP_VERSION}`}
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 bg-gray-900 flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="fixed left-0 top-0 z-50 h-screen w-72 bg-gray-900 flex flex-col shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
