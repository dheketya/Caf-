'use client'

import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { Header } from '@/components/layout/header'

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="ml-64">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
