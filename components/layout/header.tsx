'use client'

import { useState, useEffect, useRef } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { LogOut, User, Bell, MessageCircle, X, Menu } from 'lucide-react'
import { QuotaWidget } from './quota-widget'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface HeaderProps {
  quota?: {
    used: number
    limit: number | null
    resetDate: Date
  }
  onMenuClick?: () => void
}

interface ChatPreview {
  shopId: string
  shopName: string
  lastMessage: string
  senderName: string
  createdAt: string
  unreadCount: number
}

export function Header({ quota, onMenuClick }: HeaderProps) {
  const { data: session } = useSession()
  const { t, lang } = useI18n()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [previews, setPreviews] = useState<ChatPreview[]>([])
  const [loadingPreviews, setLoadingPreviews] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch('/api/chat/unread')
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.count || 0)
        }
      } catch {}
    }

    fetchUnread()
    const interval = setInterval(fetchUnread, 10000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close dropdown on route change
  useEffect(() => { setShowDropdown(false) }, [pathname])

  async function openDropdown() {
    setShowDropdown(!showDropdown)
    if (!showDropdown) {
      setLoadingPreviews(true)
      try {
        const res = await fetch('/api/chat/previews')
        if (res.ok) {
          const data = await res.json()
          setPreviews(data)
        }
      } catch {}
      setLoadingPreviews(false)
    }
  }

  function timeAgo(d: string): string {
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return lang === 'en' ? 'now' : 'ឥឡូវ'
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  const chatHref = session?.user?.role === 'PLATFORM_OWNER' ? '/admin/messages' : '/chat'
  const isShopUser = session?.user?.role !== 'PLATFORM_OWNER'

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-gray-200 bg-white px-3 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger menu - mobile only */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-1 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {quota && session?.user?.role !== 'KITCHEN' && (
          <div className="hidden sm:block">
            <QuotaWidget
              used={quota.used}
              limit={quota.limit}
              resetDate={quota.resetDate}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Bell with dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={openDropdown}
            className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title={t('header.notifications')}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">
                  {t('header.notifications')}
                  {unreadCount > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </h3>
                <button onClick={() => setShowDropdown(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[320px] overflow-y-auto">
                {loadingPreviews ? (
                  <p className="text-center text-gray-400 text-sm py-6">{t('common.loading')}</p>
                ) : previews.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                      {lang === 'en' ? 'No messages yet' : 'មិនមានសារនៅឡើយ'}
                    </p>
                  </div>
                ) : (
                  previews.map((preview) => (
                    <Link
                      key={preview.shopId}
                      href={isShopUser ? '/chat' : `/admin/messages?shop=${preview.shopId}`}
                      onClick={() => setShowDropdown(false)}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0',
                        preview.unreadCount > 0 && 'bg-blue-50/50'
                      )}
                    >
                      <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-0.5">
                        <MessageCircle className="h-4 w-4 text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">{preview.shopName}</p>
                          <span className="text-[10px] text-gray-400 shrink-0 ml-2">{timeAgo(preview.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          <span className="font-medium">{preview.senderName}:</span> {preview.lastMessage}
                        </p>
                        {preview.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center mt-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                            {preview.unreadCount}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>

              <Link
                href={chatHref}
                onClick={() => setShowDropdown(false)}
                className="block text-center text-sm text-brand-600 font-medium py-2.5 border-t border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {lang === 'en' ? 'View all messages' : 'មើលសារទាំងអស់'}
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-gray-200">
          <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center">
            <User className="h-4 w-4 text-brand-600" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-700">{session?.user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">
              {session?.user?.role?.toLowerCase().replace('_', ' ')}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
            title={t('header.logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
