'use client'

import { signOut, useSession } from 'next-auth/react'
import { LogOut, User, Bell } from 'lucide-react'
import { QuotaWidget } from './quota-widget'

interface HeaderProps {
  quota?: {
    used: number
    limit: number | null
    resetDate: Date
  }
}

export function Header({ quota }: HeaderProps) {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        {quota && session?.user?.role !== 'KITCHEN' && (
          <QuotaWidget
            used={quota.used}
            limit={quota.limit}
            resetDate={quota.resetDate}
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
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
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
