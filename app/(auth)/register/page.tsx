'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { Check, QrCode, Clock, Sparkles, Shield, Zap, ArrowLeft } from 'lucide-react'

interface PackageOption {
  id: string
  name: string
  description: string | null
  saleLimit: number | null
  monthlyPrice: number
  annualPrice: number
  isDefault: boolean
}

function StepIndicator({ current, showPayment }: { current: string; showPayment: boolean }) {
  const { t } = useI18n()
  const STEPS = [
    { key: 'plan', label: t('auth.choosePlan') },
    { key: 'details', label: t('auth.yourDetails') },
    { key: 'payment', label: t('auth.paymentStep') },
  ] as const

  const steps = showPayment ? STEPS : STEPS.filter((s) => s.key !== 'payment')
  const currentIdx = steps.findIndex((s) => s.key === current)

  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-2">
          <div className={cn(
            'flex items-center gap-1.5 text-xs font-medium transition-colors',
            i <= currentIdx ? 'text-brand-600' : 'text-gray-300'
          )}>
            <div className={cn(
              'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all',
              i < currentIdx
                ? 'bg-brand-600 text-white'
                : i === currentIdx
                  ? 'bg-brand-600 text-white ring-2 ring-brand-100'
                  : 'bg-gray-100 text-gray-400'
            )}>
              {i < currentIdx ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              'w-8 sm:w-12 h-0.5 rounded-full transition-colors',
              i < currentIdx ? 'bg-brand-600' : 'bg-gray-200'
            )} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const { t, bilingual, lang } = useI18n()
  const [step, setStep] = useState<'plan' | 'details' | 'payment'>('plan')
  const [packages, setPackages] = useState<PackageOption[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState<string>('')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [khqrImage, setKhqrImage] = useState<string | null>(null)
  const [form, setForm] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    password: '',
    country: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/packages')
      .then((r) => r.json())
      .then((data: PackageOption[]) => {
        setPackages(data)
        const defaultPkg = data.find((p) => p.isDefault) || data[0]
        if (defaultPkg) setSelectedPackageId(defaultPkg.id)
      })
  }, [])

  useEffect(() => {
    fetch('/api/platform-settings/khqr')
      .then((r) => r.json())
      .then((data) => {
        if (data.khqrImage) setKhqrImage(data.khqrImage)
      })
      .catch(() => {})
  }, [])

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const selectedPackage = packages.find((p) => p.id === selectedPackageId)
  const isPaidPlan = selectedPackage && selectedPackage.monthlyPrice > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          packageId: selectedPackageId,
          billingCycle,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }

      if (isPaidPlan) {
        setStep('payment')
        setLoading(false)
        return
      }

      const signInResult = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      })

      if (signInResult?.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        router.push('/login')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  async function handlePaymentDone() {
    const signInResult = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    })

    if (signInResult?.ok) {
      router.push('/dashboard')
      router.refresh()
    } else {
      router.push('/login')
    }
  }

  // Feature list for showcase section
  const features = [
    { icon: '\u{1F4B3}', titleKey: 'auth.posFeature', descKey: 'auth.posDesc' },
    { icon: '\u2615', titleKey: 'auth.coffeeFeature', descKey: 'auth.coffeeDesc' },
    { icon: '\u{1F389}', titleKey: 'auth.loyaltyFeature', descKey: 'auth.loyaltyDesc' },
    { icon: '\u{1F4CA}', titleKey: 'auth.reportsFeature', descKey: 'auth.reportsDesc' },
    { icon: '\u{1F465}', titleKey: 'auth.customersFeature', descKey: 'auth.customersDesc' },
    { icon: '\u{1F9FE}', titleKey: 'auth.invoiceFeature', descKey: 'auth.invoiceDesc' },
  ]

  // ─── Step 1: Choose Plan ─────────────────────────────────
  if (step === 'plan') {
    const [mainChoose, subChoose] = bilingual('auth.chooseYourPlan')

    return (
      <div className="max-w-3xl mx-auto">
        <StepIndicator current="plan" showPayment={!!isPaidPlan} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 pt-5 pb-2">
            <h2 className={cn('text-lg font-bold text-gray-900 text-center', lang === 'km' && 'font-khmer')}>
              {mainChoose}
              <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{subChoose}</span>
            </h2>
            <p className="text-xs text-gray-500 text-center mt-1">
              {t('auth.allFeaturesIncluded')}
            </p>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-2 py-2">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                billingCycle === 'monthly'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t('auth.monthly')}
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5',
                billingCycle === 'annual'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t('auth.annual')}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-semibold',
                billingCycle === 'annual'
                  ? 'bg-green-400 text-green-950'
                  : 'bg-green-100 text-green-700'
              )}>
                {t('auth.save')}
              </span>
            </button>
          </div>

          {/* Plan cards */}
          <div className="px-4 pb-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {packages.map((pkg, i) => {
                const isSelected = selectedPackageId === pkg.id
                const annualSavings = pkg.monthlyPrice > 0
                  ? Math.round((1 - pkg.annualPrice / (pkg.monthlyPrice * 12)) * 100)
                  : 0
                const icons = [Shield, Zap, Sparkles]
                const Icon = icons[i % icons.length]

                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={cn(
                      'relative rounded-xl border-2 p-3 text-left transition-all group',
                      isSelected
                        ? 'border-brand-500 bg-brand-50/60 shadow-sm shadow-brand-500/10'
                        : 'border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-white'
                    )}
                  >
                    {pkg.isDefault && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-600 to-orange-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                        {t('auth.popular')}
                      </span>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        'h-6 w-6 rounded-md flex items-center justify-center',
                        isSelected ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">{pkg.name}</h3>
                    </div>

                    <div className="mb-2">
                      {pkg.monthlyPrice === 0 ? (
                        <div>
                          <span className="text-2xl font-extrabold text-gray-900">$0</span>
                          <span className="text-xs text-gray-400 ml-1">{t('auth.free').toLowerCase()}</span>
                        </div>
                      ) : billingCycle === 'monthly' ? (
                        <div>
                          <span className="text-2xl font-extrabold text-gray-900">{formatCurrency(pkg.monthlyPrice)}</span>
                          <span className="text-xs text-gray-400">{t('auth.mo')}</span>
                          {annualSavings > 0 && <p className="text-[10px] text-green-600 font-medium">{t('auth.save')} {annualSavings}%</p>}
                        </div>
                      ) : (
                        <div>
                          <span className="text-2xl font-extrabold text-gray-900">{formatCurrency(pkg.annualPrice)}</span>
                          <span className="text-xs text-gray-400">{t('auth.yr')}</span>
                          {annualSavings > 0 && <p className="text-[10px] text-green-600 font-medium">{annualSavings}% off</p>}
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5 border-t border-gray-100 pt-2">
                      {[
                        pkg.saleLimit ? `${pkg.saleLimit.toLocaleString()} ${t('auth.salesMo')}` : t('auth.unlimitedSales'),
                        'POS & Dual Currency',
                        'Product Sizes & Sugar',
                        'Customer Loyalty',
                        'Income & Reports',
                        'Staff Management',
                      ].map((f) => (
                        <div key={f} className="flex items-center gap-1.5 text-[10px]">
                          <Check className="h-2.5 w-2.5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-600">{f}</span>
                        </div>
                      ))}
                    </div>

                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-brand-600 flex items-center justify-center shadow-sm">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Features showcase */}
          <div className="px-4 pb-2">
            <div className="grid grid-cols-3 gap-2">
              {features.map((f) => {
                const [mainTitle, subTitle] = bilingual(f.titleKey)
                return (
                  <div key={f.titleKey} className="text-center p-2 rounded-lg bg-gray-50">
                    <span className="text-lg">{f.icon}</span>
                    <p className={cn('text-[10px] font-bold text-gray-800 mt-0.5', lang === 'km' && 'font-khmer')}>
                      {mainTitle}
                      <span className={cn('block text-[9px] font-normal opacity-60', lang === 'km' ? '' : 'font-khmer')}>{subTitle}</span>
                    </p>
                    <p className="text-[9px] text-gray-400">{t(f.descKey)}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="px-4 py-3">
            <Button className="w-full" onClick={() => setStep('details')} disabled={!selectedPackageId}>
              {t('auth.continueWith')} {selectedPackage?.name || 'selected'} {t('auth.plan')}
            </Button>
            <p className="mt-2 text-center text-xs text-gray-400">
              {t('auth.hasAccount')}{' '}
              <Link href="/login" className="text-brand-600 font-medium hover:text-brand-700">{t('auth.signIn')}</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Step 3: KHQR Payment ────────────────────────────────
  if (step === 'payment') {
    const price = billingCycle === 'annual'
      ? selectedPackage?.annualPrice
      : selectedPackage?.monthlyPrice

    const [mainPayment, subPayment] = bilingual('auth.completePayment')

    return (
      <div className="max-w-md mx-auto">
        <StepIndicator current="payment" showPayment={true} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 px-8 py-8 text-center border-b border-blue-100">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20 mb-4">
              <QrCode className="h-7 w-7 text-white" />
            </div>
            <h2 className={cn('text-xl font-bold text-gray-900', lang === 'km' && 'font-khmer')}>
              {mainPayment}
              <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{subPayment}</span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('auth.scanKHQR')} <strong>{selectedPackage?.name}</strong> {t('auth.plan')}
            </p>
          </div>

          <div className="p-8">
            {/* Price summary */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedPackage?.name} {t('auth.plan')}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{billingCycle === 'monthly' ? t('auth.monthly') : t('auth.annual')} {t('auth.billing')}</p>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(price || 0)}</p>
              </div>
            </div>

            {/* KHQR Image */}
            <div className="flex justify-center mb-6">
              {khqrImage ? (
                <div className="p-3 bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
                  <img
                    src={khqrImage}
                    alt={t('auth.khqrPaymentCode')}
                    className="w-[240px] h-auto rounded-xl"
                  />
                </div>
              ) : (
                <div className="w-[240px] h-[240px] rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                  <div className="text-center text-gray-400">
                    <QrCode className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">{t('auth.khqrNotAvailable')}</p>
                    <p className="text-xs mt-1">{t('auth.contactSupport')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Pending notice */}
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 mb-6">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">{t('auth.awaitingVerification')}</p>
                  <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                    {t('auth.afterPaymentNote')}
                  </p>
                </div>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handlePaymentDone}>
              {t('auth.completedPayment')}
            </Button>

            <button
              onClick={handlePaymentDone}
              className="block w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3 transition-colors"
            >
              {t('auth.skipFree')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Step 2: Business Details ────────────────────────────
  const [mainRegister, subRegister] = bilingual('auth.registerYourShop')

  return (
    <div className="max-w-md mx-auto">
      <StepIndicator current="details" showPayment={!!isPaidPlan} />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Selected plan summary bar */}
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => setStep('plan')}
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('auth.changePlan')}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{selectedPackage?.name}</span>
            {selectedPackage && selectedPackage.monthlyPrice > 0 && (
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                {billingCycle === 'annual'
                  ? formatCurrency(selectedPackage.annualPrice) + t('auth.yr')
                  : formatCurrency(selectedPackage.monthlyPrice) + t('auth.mo')
                }
              </span>
            )}
            {selectedPackage && selectedPackage.monthlyPrice === 0 && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                {t('auth.free')}
              </span>
            )}
          </div>
        </div>

        <div className="p-5">
          <h2 className={cn('text-lg font-bold text-gray-900 mb-1', lang === 'km' && 'font-khmer')}>
            {mainRegister}
            <span className={cn('block text-sm font-normal opacity-60', lang === 'km' ? '' : 'font-khmer')}>{subRegister}</span>
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            {!isPaidPlan
              ? t('auth.noPaymentRequired')
              : t('auth.completeRegistration')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="businessName"
                label={t('auth.businessName')}
                placeholder="My Coffee Shop"
                value={form.businessName}
                onChange={(e) => updateField('businessName', e.target.value)}
                required
              />
              <Input
                id="ownerName"
                label={t('auth.ownerName')}
                placeholder={t('auth.ownerNamePlaceholder')}
                value={form.ownerName}
                onChange={(e) => updateField('ownerName', e.target.value)}
                required
              />
            </div>

            <Input
              id="email"
              label={t('auth.email')}
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              required
            />

            <Input
              id="password"
              label={t('auth.password')}
              type="password"
              placeholder={t('auth.atLeast8Chars')}
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              minLength={8}
              required
            />

            <div className="w-full">
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.country')}
              </label>
              <select
                id="country"
                value={form.country}
                onChange={(e) => updateField('country', e.target.value)}
                required
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
              >
                <option value="">{t('auth.selectCountry')}</option>
                <option value="KH">{t('auth.cambodia')}</option>
                <option value="TH">{t('auth.thailand')}</option>
                <option value="VN">{t('auth.vietnam')}</option>
                <option value="MY">{t('auth.malaysia')}</option>
                <option value="SG">{t('auth.singapore')}</option>
                <option value="ID">{t('auth.indonesia')}</option>
                <option value="PH">{t('auth.philippines')}</option>
                <option value="US">{t('auth.unitedStates')}</option>
                <option value="OTHER">{t('auth.other')}</option>
              </select>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading
                ? t('auth.creatingAccount')
                : isPaidPlan
                  ? t('auth.createAccountPay')
                  : t('auth.createAccount')
              }
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            {t('auth.hasAccount')}{' '}
            <Link href="/login" className="text-brand-600 font-medium hover:text-brand-700">
              {t('auth.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
