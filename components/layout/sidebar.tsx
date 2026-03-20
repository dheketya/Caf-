'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  DollarSign,
  BarChart3,
  Users,
  CreditCard,
  Settings,
  MessageCircle,
  UtensilsCrossed,
  Coffee,
  Lock,
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

interface NavItem {
  labelKey: string
  href: string
  icon: React.ReactNode
  module?: string
}

const shopNavItems: NavItem[] = [
  { labelKey: 'nav.dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { labelKey: 'nav.pos', href: '/pos', icon: <ShoppingCart className="h-5 w-5" />, module: 'pos' },
  { labelKey: 'nav.products', href: '/products', icon: <Package className="h-5 w-5" />, module: 'products' },
  { labelKey: 'nav.stock', href: '/stock', icon: <Warehouse className="h-5 w-5" />, module: 'stock' },
  { labelKey: 'nav.income', href: '/income', icon: <DollarSign className="h-5 w-5" />, module: 'income' },
  { labelKey: 'nav.customers', href: '/customers', icon: <UserCheck className="h-5 w-5" /> },
  { labelKey: 'nav.reports', href: '/reports', icon: <BarChart3 className="h-5 w-5" />, module: 'reports' },
  { labelKey: 'nav.users', href: '/users', icon: <Users className="h-5 w-5" />, module: 'users' },
  { labelKey: 'nav.billing', href: '/billing', icon: <CreditCard className="h-5 w-5" />, module: 'billing' },
  { labelKey: 'nav.chat', href: '/chat', icon: <MessageCircle className="h-5 w-5" />, module: 'chat' },
  { labelKey: 'nav.settings', href: '/settings', icon: <Settings className="h-5 w-5" />, module: 'settings' },
]

const kitchenNavItems: NavItem[] = [
  { labelKey: 'nav.kitchen', href: '/kitchen', icon: <UtensilsCrossed className="h-5 w-5" /> },
]

interface SidebarProps {
  role: string
  shopName?: string
  shopLogo?: string | null
  brandColor?: string
  isQuotaBlocked?: boolean
  collapsed: boolean
  mobileOpen: boolean
  onToggle: () => void
  onMobileClose: () => void
}

const BLOCKED_MODULES = ['pos']

export function Sidebar({ role, shopName, shopLogo, brandColor, isQuotaBlocked, collapsed, mobileOpen, onToggle, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { lang, setLang, bilingual } = useI18n()
  const items = role === 'KITCHEN' ? kitchenNavItems : shopNavItems

  const sidebarContent = (
    <>
      <div className={cn('flex items-center border-b border-gray-100 shrink-0', collapsed && !mobileOpen ? 'justify-center py-4' : 'gap-3 px-5 py-4')}>
        {collapsed && !mobileOpen ? (
          shopLogo ? (
            <img src={shopLogo} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: brandColor ? `${brandColor}15` : '#f3f4f6' }}>
              <Coffee className="h-4 w-4" style={brandColor ? { color: brandColor } : undefined} />
            </div>
          )
        ) : (
          <>
            {shopLogo ? (
              <img src={shopLogo} alt="Logo" className="h-10 w-10 rounded-xl object-cover shadow-sm" />
            ) : (
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: brandColor ? `${brandColor}15` : '#f3f4f6' }}>
                <Coffee className="h-5 w-5" style={brandColor ? { color: brandColor } : undefined} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              {shopName && <h1 className="text-sm font-bold text-gray-900 truncate max-w-[130px]">{shopName}</h1>}
              <p className="text-[10px] text-gray-400 font-khmer">CaféOS</p>
            </div>
            {/* Close button on mobile */}
            {mobileOpen && (
              <button onClick={onMobileClose} className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            )}
          </>
        )}
      </div>

      <nav className={cn('flex-1 py-3 space-y-0.5 overflow-y-auto', collapsed && !mobileOpen ? 'px-2' : 'px-3')}>
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const isLocked = isQuotaBlocked && item.module && BLOCKED_MODULES.includes(item.module)
          const [main, sub] = bilingual(item.labelKey)
          const isCollapsedDesktop = collapsed && !mobileOpen

          if (isLocked) {
            return (
              <div
                key={item.href}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium text-gray-300 cursor-not-allowed',
                  isCollapsedDesktop ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'
                )}
                title={isCollapsedDesktop ? `${main} (locked)` : 'Quota exceeded — upgrade to unlock'}
              >
                <span className="text-gray-300 shrink-0">{item.icon}</span>
                {!isCollapsedDesktop && (
                  <span className="min-w-0 flex-1">
                    <span className={cn('block leading-tight', lang === 'km' && 'font-khmer')}>{main}</span>
                    <span className={cn('block text-[9px] opacity-50 leading-tight', lang === 'km' ? '' : 'font-khmer')}>{sub}</span>
                  </span>
                )}
                {!isCollapsedDesktop && <Lock className="h-3.5 w-3.5 ml-auto text-gray-300 shrink-0" />}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              title={isCollapsedDesktop ? main : undefined}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-colors',
                isCollapsedDesktop ? 'justify-center py-2.5' : 'gap-3 px-3 py-2',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <span className={cn('shrink-0', isActive ? 'text-brand-600' : 'text-gray-400')}>
                {item.icon}
              </span>
              {!isCollapsedDesktop && (
                <span className="min-w-0 flex-1">
                  <span className={cn('block leading-tight', lang === 'km' && 'font-khmer')}>{main}</span>
                  <span className={cn('block text-[9px] leading-tight', isActive ? 'opacity-50' : 'opacity-40', lang === 'km' ? '' : 'font-khmer')}>{sub}</span>
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Language toggle */}
      <button
        onClick={() => setLang(lang === 'en' ? 'km' : 'en')}
        className={cn(
          'flex items-center border-t border-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors',
          collapsed && !mobileOpen ? 'justify-center py-3' : 'gap-3 px-5 py-2.5'
        )}
        title={lang === 'en' ? 'ប្តូរទៅភាសាខ្មែរ' : 'Switch to English'}
      >
        <Globe className="h-4 w-4 shrink-0" />
        {(!(collapsed) || mobileOpen) && (
          <span className="text-xs">
            <span className={cn('font-medium', lang === 'km' && 'font-khmer')}>
              {lang === 'en' ? 'English' : 'ខ្មែរ'}
            </span>
            <span className={cn('ml-1.5 opacity-50', lang === 'en' ? 'font-khmer' : '')}>
              {lang === 'en' ? 'ខ្មែរ' : 'English'}
            </span>
          </span>
        )}
      </button>

      {/* Version label */}
      <div className={cn(
        'border-t border-gray-100 text-gray-300 text-[10px]',
        collapsed && !mobileOpen ? 'text-center py-1.5' : 'px-5 py-1.5'
      )}>
        {collapsed && !mobileOpen ? `v${process.env.APP_VERSION}` : `CaféOS v${process.env.APP_VERSION}`}
      </div>

      {/* Toggle collapse - hidden on mobile */}
      <button
        onClick={onToggle}
        className="hidden lg:flex items-center justify-center py-3 border-t border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 flex-col transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="fixed left-0 top-0 z-50 h-screen w-72 bg-white border-r border-gray-200 flex flex-col shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
