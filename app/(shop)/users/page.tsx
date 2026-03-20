'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { formatDateTime, cn } from '@/lib/utils'
import { Plus, KeyRound, Ban, CheckCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface UserInfo {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
}

export default function UsersPage() {
  const { t, bilingual, lang } = useI18n()
  const [users, setUsers] = useState<UserInfo[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({ username: '', name: '', password: '', role: 'CASHIER' })
  const [newPassword, setNewPassword] = useState('')
  const [shopCode, setShopCode] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [userData, shopData] = await Promise.all([
      fetch('/api/users').then((r) => r.json()),
      fetch('/api/shops/me').then((r) => r.json()),
    ])
    setUsers(userData.users || [])
    if (shopData && !shopData.error) setShopCode(shopData.shopCode || '')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Failed to create user')
      setLoading(false)
      return
    }

    setShowCreateModal(false)
    setForm({ username: '', name: '', password: '', role: 'CASHIER' })
    loadData()
    setLoading(false)
  }

  async function handleToggle(user: UserInfo) {
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, action: 'toggle' }),
    })
    loadData()
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!showResetModal) return
    setLoading(true)
    setSuccess('')

    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: showResetModal.id, action: 'reset-password', newPassword }),
    })

    setLoading(false)
    if (res.ok) {
      setSuccess(t('users.passwordResetSuccess'))
      setTimeout(() => { setShowResetModal(null); setNewPassword(''); setSuccess('') }, 1500)
    }
  }

  // Extract short username from stored email
  function getUsername(email: string) {
    if (email.includes('@')) return email.split('@')[0]
    if (shopCode && email.endsWith(`.${shopCode}`)) return email.slice(0, -(shopCode.length + 1))
    return email
  }

  const roleColors: Record<string, string> = {
    SHOP_OWNER: 'info',
    MANAGER: 'warning',
    CASHIER: 'success',
    KITCHEN: 'default',
  }

  const [titleMain, titleSub] = bilingual('users.staffManagement')

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className={cn('text-xl sm:text-2xl font-bold text-gray-900', lang === 'km' && 'font-khmer')}>{titleMain}
            <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{titleSub}</span>
          </h1>
          <p className="text-sm text-gray-500">{users.length} {t('users.teamMembers')}</p>
        </div>
        <Button onClick={() => { setForm({ username: '', name: '', password: '', role: 'CASHIER' }); setError(''); setShowCreateModal(true) }} className="shrink-0">
          <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">{t('users.addStaff')}</span>
        </Button>
      </div>

      {/* Shop Code Info */}
      {shopCode && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 sm:px-4 py-3">
          <p className="text-sm text-gray-600">{t('users.shopCode')}: <span className="font-mono font-bold text-gray-900">{shopCode}</span></p>
          <p className="text-xs text-gray-400">{t('users.staffLoginFormat')}: <span className="font-mono">username.{shopCode}</span></p>
        </div>
      )}

      {/* Staff List - Table on md+, Cards on mobile */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('users.username')}</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('users.name')}</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('users.role')}</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('users.lastLogin')}</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('common.status')}</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <p className="font-mono text-sm text-gray-900">{getUsername(u.email)}</p>
                  {u.role !== 'SHOP_OWNER' && <p className="font-mono text-[10px] text-gray-400">{u.email}</p>}
                </td>
                <td className="py-3 px-4 font-medium text-gray-900">{u.name}</td>
                <td className="py-3 px-4">
                  <Badge variant={(roleColors[u.role] || 'default') as any}>
                    {u.role.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-gray-500">
                  {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : t('users.never')}
                </td>
                <td className="py-3 px-4">
                  <Badge variant={u.isActive ? 'success' : 'danger'}>
                    {u.isActive ? t('users.active') : t('users.inactive')}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right">
                  {u.role !== 'SHOP_OWNER' && (
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => { setShowResetModal(u); setNewPassword(''); setSuccess('') }}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                        title={t('users.resetPassword')}
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggle(u)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title={u.isActive ? t('users.deactivate') : t('users.activate')}
                      >
                        {u.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {users.map((u) => (
          <div key={u.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">{u.name}</p>
                <p className="font-mono text-xs text-gray-500 truncate">{getUsername(u.email)}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant={u.isActive ? 'success' : 'danger'} className="text-[10px]">
                  {u.isActive ? t('users.active') : t('users.inactive')}
                </Badge>
                <Badge variant={(roleColors[u.role] || 'default') as any} className="text-[10px]">
                  {u.role.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : t('users.never')}
              </p>
              {u.role !== 'SHOP_OWNER' && (
                <div className="flex gap-1">
                  <button
                    onClick={() => { setShowResetModal(u); setNewPassword(''); setSuccess('') }}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                    title={t('users.resetPassword')}
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggle(u)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title={u.isActive ? t('users.deactivate') : t('users.activate')}
                  >
                    {u.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create User Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={t('users.addStaffMember')}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label={t('users.username')}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder={t('users.usernamePlaceholder')}
            required
          />
          <Input
            label={t('users.displayName')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. John Doe"
          />
          <Input
            label={t('users.password')}
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={t('users.min6Chars')}
            minLength={6}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.role')}</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="MANAGER">{t('users.manager')}</option>
              <option value="CASHIER">{t('users.cashier')}</option>
              <option value="KITCHEN">{t('users.kitchenStaff')}</option>
            </select>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800 space-y-1">
            <p className="font-medium">{t('users.loginCredentials')}</p>
            <p>{t('users.username')}: <span className="font-mono font-bold">{form.username ? `${form.username}.${shopCode}` : '...'}</span></p>
            <p>{t('users.password')}: <span className="font-mono font-bold">{form.password || '...'}</span></p>
          </div>

          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('users.creating') : t('users.createStaffAccount')}
          </Button>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={!!showResetModal} onClose={() => setShowResetModal(null)} title={t('users.resetPasswordTitle')}>
        {showResetModal && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 space-y-1">
              <p className="text-sm"><span className="text-gray-500">{t('users.username')}:</span> <span className="font-mono font-medium text-gray-900">{getUsername(showResetModal.email)}</span></p>
              <p className="text-sm"><span className="text-gray-500">{t('users.name')}:</span> <span className="font-medium text-gray-900">{showResetModal.name}</span></p>
              <p className="text-sm"><span className="text-gray-500">{t('users.role')}:</span> <span className="font-medium text-gray-900">{showResetModal.role.replace('_', ' ')}</span></p>
            </div>
            <Input
              label={t('users.newPassword')}
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('users.min6Chars')}
              minLength={6}
              required
            />
            {success ? (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 font-medium text-center">{success}</div>
            ) : (
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('users.resetting') : t('users.resetPassword')}
              </Button>
            )}
          </form>
        )}
      </Modal>
    </div>
  )
}
