'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import { Store, Ban, CheckCircle, Edit2, Clock, Check, X, KeyRound } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

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
  const [confirmAction, setConfirmAction] = useState<{ shopId: string; shopName: string; planName: string; action: 'approve' | 'reject' } | null>(null)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetUser, setResetUser] = useState<{ id: string; name: string; email: string; shopName: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const { t, bilingual, lang } = useI18n()

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

  function requestApproval(shop: ShopData, action: 'approve' | 'reject') {
    setConfirmAction({
      shopId: shop.id,
      shopName: shop.name,
      planName: shop.requestedPackage?.name || 'Unknown',
      action,
    })
  }

  async function executeApproval() {
    if (!confirmAction) return
    setApproving(confirmAction.shopId)
    await fetch('/api/admin/shops/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId: confirmAction.shopId, action: confirmAction.action }),
    })
    setApproving(null)
    setConfirmAction(null)
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
  const [mainTitle, subTitle] = bilingual('adminShops.title')

  return (
    <div className="space-y-6">
      <div>
        <h1 className={cn('text-2xl font-bold text-gray-900', lang === 'km' && 'font-khmer')}>
          {mainTitle}
          <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{subTitle}</span>
        </h1>
        <p className="text-sm text-gray-500">{shops.length} {t('adminShops.registeredShops')}</p>
      </div>

      {/* Pending Approvals */}
      {pendingShops.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Clock className="h-5 w-5" />
              {t('adminShops.pendingApprovals')} ({pendingShops.length})
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
                        {t('adminShops.requesting')} <strong>{shop.requestedPackage?.name}</strong>
                        {' '}({shop.requestedBillingCycle})
                        {price !== undefined && (
                          <> — {formatCurrency(price)}/{shop.requestedBillingCycle === 'annual' ? 'yr' : 'mo'}</>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{t('adminShops.registered')} {formatDate(shop.createdAt)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => requestApproval(shop, 'approve')}
                        disabled={approving === shop.id}
                      >
                        <Check className="h-4 w-4 mr-1" /> {t('adminShops.approve')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => requestApproval(shop, 'reject')}
                        disabled={approving === shop.id}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-1" /> {t('adminShops.reject')}
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
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('adminShops.shop')}</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('adminShops.owner')}</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('adminShops.plan')}</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">{t('adminShops.sales')}</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">{t('adminShops.users')}</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('common.status')}</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('adminShops.created')}</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">{t('common.actions')}</th>
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
                      <Badge variant="warning">{t('adminShops.upgradePending')}</Badge>
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
                        title={t('adminShops.resetPassword')}
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
                      title={t('adminShops.editQuota')}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleStatus(shop)}
                      title={shop.status === 'ACTIVE' ? t('adminShops.suspend') : t('adminShops.reactivate')}
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

      <Modal isOpen={showQuotaModal} onClose={() => setShowQuotaModal(false)} title={`${t('adminShops.editQuotaTitle')}: ${selectedShop?.name}`}>
        <form onSubmit={setQuotaOverride} className="space-y-4">
          <Input label={t('adminShops.quotaOverride')} type="number" value={quotaValue} onChange={(e) => setQuotaValue(e.target.value)} />
          <Input label={t('adminShops.reason')} value={quotaNote} onChange={(e) => setQuotaNote(e.target.value)} />
          <Button type="submit" className="w-full">{t('adminShops.saveOverride')}</Button>
        </form>
      </Modal>

      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title={t('adminShops.resetOwnerPassword')}>
        {resetUser && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 space-y-1">
              <p className="text-sm"><span className="text-gray-500">{t('adminShops.shop')}:</span> <span className="font-medium text-gray-900">{resetUser.shopName}</span></p>
              <p className="text-sm"><span className="text-gray-500">{t('adminShops.owner')}:</span> <span className="font-medium text-gray-900">{resetUser.name}</span></p>
              <p className="text-sm"><span className="text-gray-500">{t('adminShops.email')}:</span> <span className="font-medium text-gray-900">{resetUser.email}</span></p>
            </div>

            <Input
              label={t('users.newPassword')}
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('adminShops.min8Chars')}
              minLength={8}
              required
            />

            {resetSuccess ? (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 font-medium text-center">
                {t('users.passwordResetSuccess')}
              </div>
            ) : (
              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading ? t('users.resetting') : t('adminShops.resetPassword')}
              </Button>
            )}
          </form>
        )}
      </Modal>

      {/* Approve/Reject Confirmation Modal */}
      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.action === 'approve' ? t('adminShops.confirmApproval') : t('adminShops.confirmRejection')}>
        {confirmAction && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {confirmAction.action === 'approve' ? (
                <>{t('adminShops.approveMsg')} <strong>{confirmAction.planName}</strong> — <strong>{confirmAction.shopName}</strong></>
              ) : (
                <>{t('adminShops.rejectMsg')} <strong>{confirmAction.planName}</strong> — <strong>{confirmAction.shopName}</strong></>
              )}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmAction(null)}>
                {t('common.cancel')}
              </Button>
              {confirmAction.action === 'approve' ? (
                <Button className="flex-1" onClick={executeApproval} disabled={approving === confirmAction.shopId}>
                  {approving ? t('pos.processing') : t('adminShops.yesApprove')}
                </Button>
              ) : (
                <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={executeApproval} disabled={approving === confirmAction.shopId}>
                  {approving ? t('pos.processing') : t('adminShops.yesReject')}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
