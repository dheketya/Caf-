'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Store, Ban, CheckCircle, Edit2, Clock, Check, X, KeyRound } from 'lucide-react'

interface ShopData {
  id: string
  name: string
  status: string
  saleCount: number
  quotaOverride: number | null
  upgradeStatus: string
  requestedPackageId: string | null
  requestedBillingCycle: string | null
  requestedPackage?: { name: string; monthlyPrice: number; annualPrice: number } | null
  owner: { id: string; name: string; email: string } | null
  createdAt: string
  package: { name: string; saleLimit: number | null }
  _count: { users: number; orders: number }
}

export default function AdminShopsPage() {
  const [shops, setShops] = useState<ShopData[]>([])
  const [showQuotaModal, setShowQuotaModal] = useState(false)
  const [selectedShop, setSelectedShop] = useState<ShopData | null>(null)
  const [quotaValue, setQuotaValue] = useState('')
  const [quotaNote, setQuotaNote] = useState('')
  const [approving, setApproving] = useState<string | null>(null)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetUser, setResetUser] = useState<{ id: string; name: string; email: string; shopName: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  useEffect(() => { loadShops() }, [])

  async function loadShops() {
    const data = await fetch('/api/admin/shops').then((r) => r.json())
    setShops(data)
  }

  async function toggleStatus(shop: ShopData) {
    const newStatus = shop.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    await fetch('/api/admin/shops', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId: shop.id, status: newStatus }),
    })
    loadShops()
  }

  async function setQuotaOverride(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedShop) return
    await fetch('/api/admin/shops', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopId: selectedShop.id,
        quotaOverride: quotaValue ? parseInt(quotaValue) : null,
        quotaOverrideNote: quotaNote || null,
      }),
    })
    setShowQuotaModal(false)
    loadShops()
  }

  async function handleApproval(shopId: string, action: 'approve' | 'reject') {
    setApproving(shopId)
    await fetch('/api/admin/shops/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId, action }),
    })
    setApproving(null)
    loadShops()
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!resetUser) return
    setResetLoading(true)

    const res = await fetch('/api/admin/shops/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: resetUser.id, newPassword }),
    })

    setResetLoading(false)
    if (res.ok) {
      setResetSuccess(true)
      setTimeout(() => {
        setShowResetModal(false)
        setResetSuccess(false)
        setNewPassword('')
      }, 2000)
    }
  }

  function openResetPassword(shop: ShopData) {
    if (!shop.owner) return
    setResetUser({ ...shop.owner, shopName: shop.name })
    setNewPassword('')
    setResetSuccess(false)
    setShowResetModal(true)
  }

  const pendingShops = shops.filter((s) => s.upgradeStatus === 'pending')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shops</h1>
        <p className="text-sm text-gray-500">{shops.length} registered shops</p>
      </div>

      {/* Pending Approvals */}
      {pendingShops.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Clock className="h-5 w-5" />
              Pending Plan Approvals ({pendingShops.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingShops.map((shop) => {
                const price = shop.requestedBillingCycle === 'annual'
                  ? shop.requestedPackage?.annualPrice
                  : shop.requestedPackage?.monthlyPrice

                return (
                  <div key={shop.id} className="flex items-center justify-between rounded-lg bg-white p-4 border border-amber-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{shop.name}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Requesting <strong>{shop.requestedPackage?.name}</strong> plan
                        {' '}({shop.requestedBillingCycle})
                        {price !== undefined && (
                          <> — {formatCurrency(price)}/{shop.requestedBillingCycle === 'annual' ? 'yr' : 'mo'}</>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Registered {formatDate(shop.createdAt)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproval(shop.id, 'approve')}
                        disabled={approving === shop.id}
                      >
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApproval(shop.id, 'reject')}
                        disabled={approving === shop.id}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Shop</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Owner</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Plan</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Sales</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Users</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Created</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop) => (
              <tr key={shop.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{shop.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {shop.owner ? (
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{shop.owner.name}</p>
                      <p className="text-xs text-gray-400">{shop.owner.email}</p>
                    </div>
                  ) : (
                    <span className="text-gray-300 text-sm">—</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="info">{shop.package.name}</Badge>
                    {shop.upgradeStatus === 'pending' && (
                      <Badge variant="warning">Upgrade pending</Badge>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  {shop.saleCount} / {shop.quotaOverride ?? shop.package.saleLimit ?? '∞'}
                </td>
                <td className="py-3 px-4 text-right">{shop._count.users}</td>
                <td className="py-3 px-4">
                  <Badge variant={shop.status === 'ACTIVE' ? 'success' : 'danger'}>
                    {shop.status}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-gray-500">{formatDate(shop.createdAt)}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex gap-1 justify-end">
                    {shop.owner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openResetPassword(shop)}
                        title="Reset owner password"
                      >
                        <KeyRound className="h-4 w-4 text-amber-500" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedShop(shop)
                        setQuotaValue(shop.quotaOverride?.toString() || '')
                        setShowQuotaModal(true)
                      }}
                      title="Edit quota"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleStatus(shop)}
                      title={shop.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                    >
                      {shop.status === 'ACTIVE' ? (
                        <Ban className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showQuotaModal} onClose={() => setShowQuotaModal(false)} title={`Edit Quota: ${selectedShop?.name}`}>
        <form onSubmit={setQuotaOverride} className="space-y-4">
          <Input label="Quota Override (blank to use plan default)" type="number" value={quotaValue} onChange={(e) => setQuotaValue(e.target.value)} />
          <Input label="Reason" value={quotaNote} onChange={(e) => setQuotaNote(e.target.value)} />
          <Button type="submit" className="w-full">Save Override</Button>
        </form>
      </Modal>

      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title="Reset Owner Password">
        {resetUser && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 space-y-1">
              <p className="text-sm"><span className="text-gray-500">Shop:</span> <span className="font-medium text-gray-900">{resetUser.shopName}</span></p>
              <p className="text-sm"><span className="text-gray-500">Owner:</span> <span className="font-medium text-gray-900">{resetUser.name}</span></p>
              <p className="text-sm"><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-900">{resetUser.email}</span></p>
            </div>

            <Input
              label="New Password"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              minLength={8}
              required
            />

            {resetSuccess ? (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 font-medium text-center">
                Password reset successfully!
              </div>
            ) : (
              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            )}
          </form>
        )}
      </Modal>
    </div>
  )
}
