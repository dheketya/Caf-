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
}

// Modules that get locked when quota is exceeded
const BLOCKED_MODULES = ['pos']

export function Sidebar({ role, shopName, shopLogo, brandColor, isQuotaBlocked }: SidebarProps) {
  const pathname = usePathname()
  const items = role === 'KITCHEN' ? kitchenNavItems : shopNavItems

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        {shopLogo ? (
          <img src={shopLogo} alt="Logo" className="h-9 w-9 rounded-lg object-cover" />
        ) : (
          <Coffee className="h-7 w-7" style={brandColor ? { color: brandColor } : undefined} />
        )}
        <div>
          <h1 className="text-lg font-bold text-gray-900">CaféOS</h1>
          {shopName && (
            <p className="text-xs text-gray-500 truncate max-w-[160px]">{shopName}</p>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const isLocked = isQuotaBlocked && item.module && BLOCKED_MODULES.includes(item.module)

          if (isLocked) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 cursor-not-allowed"
                title="Quota exceeded — upgrade to unlock"
              >
                <span className="text-gray-300">{item.icon}</span>
                {item.label}
                <Lock className="h-3.5 w-3.5 ml-auto text-gray-300" />
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <span className={cn(isActive ? 'text-brand-600' : 'text-gray-400')}>
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
