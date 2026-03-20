'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { cn, formatCurrency } from '@/lib/utils'
import {
  CreditCard, Check, QrCode, Clock, ArrowUpRight, RefreshCw,
  Shield, Zap, Sparkles, ChevronRight, AlertTriangle, History,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface PackageOption {
  id: string
  name: string
  description: string | null
  saleLimit: number | null
  monthlyPrice: number
  annualPrice: number
  isDefault: boolean
}

interface PlanHistoryEntry {
  id: string
  packageName: string
  billingCycle: string
  price: number
  action: string
  startDate: string
  endDate: string | null
  createdAt: string
}

interface BillingInfo {
  plan: string
  packageId: string
  saleLimit: number | null
  saleCount: number
  billingCycle: string
  monthlyPrice: number
  annualPrice: number
  modules: string[]
  upgradeStatus: string
  planExpiresAt: string | null
  planStartedAt: string | null
  daysUntilExpiry: number | null
  daysUntilDowngrade: number | null
  requestedPackage: { id: string; name: string; monthlyPrice: number; annualPrice: number } | null
  requestedBillingCycle: string | null
  packages: PackageOption[]
  khqrImage: string | null
  planHistory: PlanHistoryEntry[]
}

export default function BillingPage() {
  const { t, bilingual, lang } = useI18n()
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPkgId, setSelectedPkgId] = useState<string>('')
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'annual'>('monthly')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => { loadBilling() }, [])

  async function loadBilling() {
    const data = await fetch('/api/billing').then((r) => r.json())
    setBilling(data)
    setSelectedCycle(data.billingCycle || 'monthly')
  }

  function openUpgrade() {
    if (!billing) return
    setSelectedPkgId('')
    setSubmitted(false)
    setShowUpgradeModal(true)
  }

  function openRenew() {
    if (!billing) return
    setSelectedPkgId(billing.packageId)
    setSelectedCycle(billing.billingCycle as 'monthly' | 'annual')
    setSubmitted(false)
    setShowPaymentModal(true)
  }

  async function submitUpgrade() {
    if (!selectedPkgId) return
    setSubmitting(true)

    await fetch('/api/billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: selectedPkgId, billingCycle: selectedCycle }),
    })

    setSubmitting(false)
    setSubmitted(true)
    setShowUpgradeModal(false)
    setShowPaymentModal(true)
    loadBilling()
  }

  async function submitRenew() {
    if (!billing) return
    setSubmitting(true)

    await fetch('/api/billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: billing.packageId, billingCycle: selectedCycle }),
    })

    setSubmitting(false)
    setSubmitted(true)
    loadBilling()
  }

  if (!billing) {
    return <div className="text-center py-20 text-gray-400">{t('common.loading')}</div>
  }

  const selectedPkg = billing.packages.find((p) => p.id === selectedPkgId)
  const isFree = billing.monthlyPrice === 0
  const usagePercent = billing.saleLimit ? Math.min(100, Math.round((billing.saleCount / billing.saleLimit) * 100)) : 0

  const [titleMain, titleSub] = bilingual('billing.title')

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl">
      <div>
        <h1 className={cn('text-xl sm:text-2xl font-bold text-gray-900', lang === 'km' && 'font-khmer')}>{titleMain}
          <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{titleSub}</span>
        </h1>
        <p className="text-sm text-gray-500">{t('billing.manage')}</p>
      </div>

      {/* Pending upgrade banner */}
      {billing.upgradeStatus === 'pending' && billing.requestedPackage && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{t('billing.pendingApproval')}</p>
            <p className="text-sm text-amber-700 mt-0.5">
              <strong>{billing.requestedPackage.name}</strong> ({billing.requestedBillingCycle}) {t('billing.requestReview')}
            </p>
          </div>
        </div>
      )}

      {/* Expiration Alert - plan expired but still in 7-day grace period */}
      {billing.daysUntilExpiry !== null && billing.daysUntilExpiry <= 0 && billing.daysUntilDowngrade !== null && billing.daysUntilDowngrade > 0 && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-800">{t('billing.expired')}</p>
              <p className="text-xs sm:text-sm text-red-700 mt-0.5">
                {lang === 'en'
                  ? `Your plan has expired! You have ${billing.daysUntilDowngrade} days to renew before auto-downgrade to Free plan.`
                  : `គម្រោងរបស់អ្នកបានផុតកំណត់! អ្នកមាន ${billing.daysUntilDowngrade} ថ្ងៃដើម្បីបន្តមុនពេលបន្ថយស្វ័យប្រវត្តិទៅគម្រោងឥតគិតថ្លៃ។`}
              </p>
              <Button size="sm" variant="destructive" onClick={openRenew} className="mt-2 sm:hidden">{t('billing.renewNow')}</Button>
            </div>
            <Button size="sm" variant="destructive" onClick={openRenew} className="hidden sm:inline-flex shrink-0">{t('billing.renewNow')}</Button>
          </div>
        </div>
      )}
      {/* Already auto-downgraded */}
      {billing.daysUntilExpiry !== null && billing.daysUntilExpiry <= 0 && (billing.daysUntilDowngrade === null || billing.daysUntilDowngrade <= 0) && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-800">{t('billing.expired')}</p>
              <p className="text-xs sm:text-sm text-red-700 mt-0.5">{t('billing.expiredAlert')}</p>
              <Button size="sm" variant="destructive" onClick={openRenew} className="mt-2 sm:hidden">{t('billing.renewNow')}</Button>
            </div>
            <Button size="sm" variant="destructive" onClick={openRenew} className="hidden sm:inline-flex shrink-0">{t('billing.renewNow')}</Button>
          </div>
        </div>
      )}
      {billing.daysUntilExpiry !== null && billing.daysUntilExpiry > 0 && billing.daysUntilExpiry <= 7 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                {t('billing.expiresIn')} {billing.daysUntilExpiry} {t('billing.days')}
              </p>
              <p className="text-xs sm:text-sm text-amber-700 mt-0.5">{t('billing.dueDateAlert')}</p>
              <Button size="sm" onClick={openRenew} className="mt-2 sm:hidden">{t('billing.renewNow')}</Button>
            </div>
            <Button size="sm" onClick={openRenew} className="hidden sm:inline-flex shrink-0">{t('billing.renewNow')}</Button>
          </div>
        </div>
      )}

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-brand-500" />
              {t('billing.currentPlan')}
            </CardTitle>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Badge variant="info" className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1">{billing.plan}</Badge>
              {!isFree && (
                <Badge variant="default" className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 capitalize">{billing.billingCycle}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Pricing */}
          <div className="flex items-baseline gap-1">
            {isFree ? (
              <span className="text-3xl font-extrabold text-gray-900">{t('auth.free')}</span>
            ) : (
              <>
                <span className="text-3xl font-extrabold text-gray-900">
                  {formatCurrency(billing.billingCycle === 'annual' ? billing.annualPrice : billing.monthlyPrice)}
                </span>
                <span className="text-sm text-gray-400">{billing.billingCycle === 'annual' ? t('auth.yr') : t('auth.mo')}</span>
              </>
            )}
          </div>

          {/* Plan dates */}
          {!isFree && billing.planExpiresAt && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm">
              {billing.planStartedAt && (
                <span className="text-gray-500">
                  {t('billing.startedOn')}: <span className="font-medium text-gray-700">
                    {new Date(billing.planStartedAt).toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </span>
              )}
              <span className={cn(
                billing.daysUntilExpiry !== null && billing.daysUntilExpiry <= 7 ? 'text-red-600 font-semibold' : 'text-gray-500'
              )}>
                {t('billing.expiresOn')}: <span className="font-medium">
                  {new Date(billing.planExpiresAt).toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
                {billing.daysUntilExpiry !== null && billing.daysUntilExpiry > 0 && (
                  <span className="ml-1 text-xs opacity-70">({billing.daysUntilExpiry} {t('billing.days')})</span>
                )}
              </span>
            </div>
          )}

          {/* Usage */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">{t('billing.monthlyUsage')}</span>
              <span className="font-medium text-gray-900">
                {billing.saleCount.toLocaleString()} / {billing.saleLimit?.toLocaleString() ?? '∞'}
              </span>
            </div>
            {billing.saleLimit && (
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-green-500'
                  )}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <Button onClick={openUpgrade} disabled={billing.upgradeStatus === 'pending'} className="w-full sm:w-auto">
              <ArrowUpRight className="h-4 w-4 mr-1.5" />
              {isFree ? t('billing.upgrade') : t('billing.changePlan')}
            </Button>
            {!isFree && (
              <Button variant="outline" onClick={openRenew} disabled={billing.upgradeStatus === 'pending'} className="w-full sm:w-auto">
                <RefreshCw className="h-4 w-4 mr-1.5" />
                {t('billing.renew')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KHQR Payment */}
      {billing.khqrImage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              {t('billing.paymentViaKHQR')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
              <div className="p-2 bg-white rounded-xl border-2 border-gray-100 shadow-sm shrink-0">
                <img src={billing.khqrImage} alt="KHQR" className="w-[140px] sm:w-[160px] h-auto rounded-lg" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {t('billing.scanKHQRDesc')}
                </p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>{t('billing.step1')}</p>
                  <p>{t('billing.step2')}</p>
                  <p>{t('billing.step3')}</p>
                  <p>{t('billing.step4')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('billing.availablePlans')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          {billing.packages.map((pkg, i) => {
            const isCurrent = pkg.id === billing.packageId
            const icons = [Shield, Zap, Sparkles]
            const Icon = icons[i % icons.length]

            return (
              <div
                key={pkg.id}
                className={cn(
                  'rounded-xl border p-4 transition-all',
                  isCurrent
                    ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-200'
                    : 'border-gray-200 bg-white'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    'h-7 w-7 rounded-lg flex items-center justify-center',
                    isCurrent ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-bold text-gray-900 text-sm">{pkg.name}</span>
                  {isCurrent && (
                    <Badge variant="success" className="ml-auto text-[10px]">{t('auth.current')}</Badge>
                  )}
                </div>

                <div className="mb-2">
                  {pkg.monthlyPrice === 0 ? (
                    <span className="text-xl font-extrabold text-gray-900">{t('auth.free')}</span>
                  ) : (
                    <div>
                      <span className="text-xl font-extrabold text-gray-900">{formatCurrency(pkg.monthlyPrice)}</span>
                      <span className="text-xs text-gray-400">{t('auth.mo')}</span>
                      {pkg.annualPrice > 0 && (
                        <p className="text-[11px] text-gray-400">{formatCurrency(pkg.annualPrice)}{t('auth.yr')}</p>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500 mb-2">{pkg.description}</p>

                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Check className="h-3 w-3 text-green-500" />
                  {pkg.saleLimit ? `${pkg.saleLimit.toLocaleString()} ${t('auth.salesMo')}` : t('auth.unlimitedSales')}
                </div>

                {!isCurrent && pkg.monthlyPrice > billing.monthlyPrice && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3 text-xs"
                    onClick={() => {
                      setSelectedPkgId(pkg.id)
                      setSubmitted(false)
                      setShowUpgradeModal(true)
                    }}
                    disabled={billing.upgradeStatus === 'pending'}
                  >
                    {t('billing.upgrade')} <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Plan History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-400" />
            {t('billing.planHistory')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!billing.planHistory || billing.planHistory.length === 0) ? (
            <p className="text-sm text-gray-400 text-center py-4">{t('billing.noHistory')}</p>
          ) : (
            <div className="space-y-0">
              {billing.planHistory.map((entry, i) => {
                const actionKey = `billing.action.${entry.action}` as string
                const actionLabel = t(actionKey)
                const actionColors: Record<string, string> = {
                  subscribed: 'bg-green-100 text-green-700',
                  upgraded: 'bg-blue-100 text-blue-700',
                  downgraded: 'bg-amber-100 text-amber-700',
                  renewed: 'bg-emerald-100 text-emerald-700',
                  expired: 'bg-red-100 text-red-700',
                  cancelled: 'bg-gray-100 text-gray-600',
                }
                return (
                  <div key={entry.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center">
                      <div className={cn('w-2.5 h-2.5 rounded-full',
                        entry.action === 'expired' ? 'bg-red-400' :
                        entry.action === 'downgraded' ? 'bg-amber-400' :
                        'bg-green-400'
                      )} />
                      {i < billing.planHistory.length - 1 && <div className="w-px h-8 bg-gray-100 mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900">{entry.packageName}</span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', actionColors[entry.action] || 'bg-gray-100 text-gray-600')}>
                          {actionLabel}
                        </span>
                        <span className="text-xs text-gray-400 capitalize">{entry.billingCycle}</span>
                        {entry.price > 0 && <span className="text-xs font-medium text-gray-500">{formatCurrency(entry.price)}</span>}
                      </div>
                      <p className="mt-0.5 text-[10px] sm:text-xs text-gray-400 truncate">
                        {new Date(entry.startDate).toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {entry.endDate && ` — ${new Date(entry.endDate).toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Modal */}
      <Modal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title={t('billing.upgrade')}
        className="max-w-lg"
      >
        <div className="space-y-4">
          {/* Plan selection */}
          <div className="space-y-2">
            {billing.packages
              .filter((p) => p.id !== billing.packageId && p.monthlyPrice > billing.monthlyPrice)
              .map((pkg) => {
                const isSelected = selectedPkgId === pkg.id
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPkgId(pkg.id)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl border-2 p-4 transition-all text-left',
                      isSelected
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-100 hover:border-gray-200'
                    )}
                  >
                    <div>
                      <p className="font-bold text-gray-900">{pkg.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{pkg.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {selectedCycle === 'annual' ? formatCurrency(pkg.annualPrice) : formatCurrency(pkg.monthlyPrice)}
                      </p>
                      <p className="text-xs text-gray-400">{selectedCycle === 'annual' ? t('auth.yr') : t('auth.mo')}</p>
                    </div>
                  </button>
                )
              })}
          </div>

          {/* Billing cycle */}
          <div className="flex items-center gap-2 justify-center">
            <button
              onClick={() => setSelectedCycle('monthly')}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                selectedCycle === 'monthly' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t('auth.monthly')}
            </button>
            <button
              onClick={() => setSelectedCycle('annual')}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                selectedCycle === 'annual' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t('billing.annualSaveMore')}
            </button>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={submitUpgrade}
            disabled={!selectedPkgId || submitting}
          >
            {submitting ? t('common.loading') : `${t('billing.upgradeTo')} ${selectedPkg?.name || ''}`}
          </Button>
        </div>
      </Modal>

      {/* Payment / KHQR Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => { setShowPaymentModal(false); setSubmitted(false) }}
        title={t('auth.completePayment')}
        className="max-w-md"
      >
        <div className="space-y-4">
          {/* Price summary */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {submitted && selectedPkg ? selectedPkg.name : billing.plan}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">{selectedCycle}</p>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(
                  selectedCycle === 'annual'
                    ? (submitted && selectedPkg ? selectedPkg.annualPrice : billing.annualPrice)
                    : (submitted && selectedPkg ? selectedPkg.monthlyPrice : billing.monthlyPrice)
                )}
              </p>
            </div>
          </div>

          {/* KHQR */}
          <div className="flex justify-center">
            {billing.khqrImage ? (
              <div className="p-3 bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
                <img
                  src={billing.khqrImage}
                  alt={t('auth.khqrPaymentCode')}
                  className="w-[220px] h-auto rounded-xl"
                />
              </div>
            ) : (
              <div className="w-[220px] h-[220px] rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-400">
                  <QrCode className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{t('auth.khqrNotAvailable')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Notice */}
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
            <div className="flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                {t('billing.afterPaymentNote')}
              </p>
            </div>
          </div>

          {!submitted && (
            <Button className="w-full" onClick={submitRenew} disabled={submitting}>
              {submitting ? t('common.loading') : t('billing.completedPayment')}
            </Button>
          )}

          {submitted && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700 font-medium text-center">
              {t('billing.requestSubmitted')}
            </div>
          )}

          <button
            onClick={() => { setShowPaymentModal(false); setSubmitted(false) }}
            className="block w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
