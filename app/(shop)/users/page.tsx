'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { formatDateTime } from '@/lib/utils'
import { Plus, Users, Mail } from 'lucide-react'

interface UserInfo {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserInfo[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', role: 'CASHIER' })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const data = await fetch('/api/users').then((r) => r.json())
    setUsers(data.users || [])
    setInvitations(data.invitations || [])
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowInviteModal(false)
    setForm({ email: '', role: 'CASHIER' })
    loadData()
    setLoading(false)
  }

  const roleColors: Record<string, string> = {
    SHOP_OWNER: 'info',
    MANAGER: 'warning',
    CASHIER: 'success',
    KITCHEN: 'default',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500">{users.length} team members</p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          <Plus className="h-4 w-4 mr-1" /> Invite Staff
        </Button>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Pending Invitations</h3>
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{inv.email}</span>
                </div>
                <Badge>{inv.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Staff List */}
      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Role</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Last Login</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-gray-900">{u.name}</td>
                <td className="py-3 px-4 text-gray-600">{u.email}</td>
                <td className="py-3 px-4">
                  <Badge variant={(roleColors[u.role] || 'default') as any}>
                    {u.role.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-gray-500">
                  {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}
                </td>
                <td className="py-3 px-4">
                  <Badge variant={u.isActive ? 'success' : 'danger'}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite Staff">
        <form onSubmit={handleInvite} className="space-y-4">
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="MANAGER">Manager</option>
              <option value="CASHIER">Cashier</option>
              <option value="KITCHEN">Kitchen</option>
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Sending...' : 'Send Invitation'}</Button>
        </form>
      </Modal>
    </div>
  )
}
