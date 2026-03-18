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
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  module?: string
}

const shopNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'POS', href: '/pos', icon: <ShoppingCart className="h-5 w-5" />, module: 'pos' },
  { label: 'Products', href: '/products', icon: <Package className="h-5 w-5" />, module: 'products' },
  { label: 'Stock', href: '/stock', icon: <Warehouse className="h-5 w-5" />, module: 'stock' },
  { label: 'Income & Expense', href: '/income', icon: <DollarSign className="h-5 w-5" />, module: 'income' },
  { label: 'Customers', href: '/customers', icon: <UserCheck className="h-5 w-5" /> },
  { label: 'Reports', href: '/reports', icon: <BarChart3 className="h-5 w-5" />, module: 'reports' },
  { label: 'Users', href: '/users', icon: <Users className="h-5 w-5" />, module: 'users' },
  { label: 'Billing', href: '/billing', icon: <CreditCard className="h-5 w-5" />, module: 'billing' },
  { label: 'Chat', href: '/chat', icon: <MessageCircle className="h-5 w-5" />, module: 'chat' },
  { label: 'Settings', href: '/settings', icon: <Settings className="h-5 w-5" />, module: 'settings' },
]

const kitchenNavItems: NavItem[] = [
  { label: 'Kitchen Display', href: '/kitchen', icon: <UtensilsCrossed className="h-5 w-5" /> },
]

interface SidebarProps {
  role: string
  shopName?: string
  shopLogo?: string | null
  brandColor?: string
  isQuotaBlocked?: boolean
  collapsed: boolean
  onToggle: () => void
}

const BLOCKED_MODULES = ['pos']

export function Sidebar({ role, shopName, shopLogo, brandColor, isQuotaBlocked, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const items = role === 'KITCHEN' ? kitchenNavItems : shopNavItems

  return (
    <aside className={cn(
      'fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-200',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <div className={cn('flex items-center border-b border-gray-100 shrink-0', collapsed ? 'justify-center py-4' : 'gap-3 px-5 py-4')}>
        {collapsed ? (
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
              <p className="text-[10px] text-gray-400">Powered by CaféOS</p>
            </div>
          </>
        )}
      </div>

      <nav className={cn('flex-1 py-3 space-y-1 overflow-y-auto', collapsed ? 'px-2' : 'px-3')}>
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const isLocked = isQuotaBlocked && item.module && BLOCKED_MODULES.includes(item.module)

          if (isLocked) {
            return (
              <div
                key={item.href}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium text-gray-300 cursor-not-allowed',
                  collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                )}
                title={collapsed ? `${item.label} (locked)` : 'Quota exceeded — upgrade to unlock'}
              >
                <span className="text-gray-300">{item.icon}</span>
                {!collapsed && item.label}
                {!collapsed && <Lock className="h-3.5 w-3.5 ml-auto text-gray-300" />}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-colors',
                collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <span className={cn(isActive ? 'text-brand-600' : 'text-gray-400')}>
                {item.icon}
              </span>
              {!collapsed && item.label}
            </Link>
          )
        })}
      </nav>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center py-3 border-t border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
    </aside>
  )
}
