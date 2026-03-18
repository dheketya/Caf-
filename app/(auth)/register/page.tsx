'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency } from '@/lib/utils'
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

const STEPS = [
  { key: 'plan', label: 'Choose Plan' },
  { key: 'details', label: 'Your Details' },
  { key: 'payment', label: 'Payment' },
] as const

function StepIndicator({ current, showPayment }: { current: string; showPayment: boolean }) {
  const steps = showPayment ? STEPS : STEPS.filter((s) => s.key !== 'payment')
  const currentIdx = steps.findIndex((s) => s.key === current)

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-2">
          <div className={cn(
            'flex items-center gap-2 text-sm font-medium transition-colors',
            i <= currentIdx ? 'text-brand-600' : 'text-gray-300'
          )}>
            <div className={cn(
              'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              i < currentIdx
                ? 'bg-brand-600 text-white'
                : i === currentIdx
                  ? 'bg-brand-600 text-white ring-4 ring-brand-100'
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

  // ─── Step 1: Choose Plan ─────────────────────────────────
  if (step === 'plan') {
    return (
      <div className="max-w-3xl mx-auto">
        <StepIndicator current="plan" showPayment={!!isPaidPlan} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 pt-8 pb-4">
            <h2 className="text-2xl font-bold text-gray-900 text-center">Choose your plan</h2>
            <p className="text-sm text-gray-500 text-center mt-2">
              All features included on every plan. Upgrade or downgrade anytime.
            </p>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 py-4">
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
              Monthly
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
              Annual
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-semibold',
                billingCycle === 'annual'
                  ? 'bg-green-400 text-green-950'
                  : 'bg-green-100 text-green-700'
              )}>
                Save
              </span>
            </button>
          </div>

          {/* Plan cards */}
          <div className="px-6 pb-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      'relative rounded-xl border-2 p-5 text-left transition-all group',
                      isSelected
                        ? 'border-brand-500 bg-brand-50/60 shadow-sm shadow-brand-500/10'
                        : 'border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-white'
                    )}
                  >
                    {/* Popular badge */}
                    {pkg.isDefault && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-600 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                        Most Popular
                      </span>
                    )}

                    {/* Icon + Name */}
                    <div className="flex items-center gap-2 mb-3 mt-1">
                      <div className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center',
                        isSelected ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900">{pkg.name}</h3>
                    </div>

                    {/* Price */}
                    <div className="mb-3">
                      {pkg.monthlyPrice === 0 ? (
                        <div>
                          <span className="text-3xl font-extrabold text-gray-900">$0</span>
                          <span className="text-sm text-gray-400 ml-1">forever</span>
                        </div>
                      ) : billingCycle === 'monthly' ? (
                        <div>
                          <span className="text-3xl font-extrabold text-gray-900">
                            {formatCurrency(pkg.monthlyPrice)}
                          </span>
                          <span className="text-sm text-gray-400 ml-1">/mo</span>
                          {annualSavings > 0 && (
                            <p className="text-xs text-green-600 font-medium mt-1">
                              Save {annualSavings}% annually
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="text-3xl font-extrabold text-gray-900">
                            {formatCurrency(pkg.annualPrice)}
                          </span>
                          <span className="text-sm text-gray-400 ml-1">/yr</span>
                          {annualSavings > 0 && (
                            <p className="text-xs text-green-600 font-medium mt-1">
                              {annualSavings}% off vs monthly
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-500 mb-3 leading-relaxed">{pkg.description}</p>

                    {/* Features */}
                    <div className="space-y-1.5 border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-2 text-xs">
                        <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-600">
                          {pkg.saleLimit ? `${pkg.saleLimit.toLocaleString()} sales/month` : 'Unlimited sales'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-600">All features included</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-600">Full POS & reporting</span>
                      </div>
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

          {/* CTA */}
          <div className="px-8 py-6">
            <Button
              className="w-full"
              size="lg"
              onClick={() => setStep('details')}
              disabled={!selectedPackageId}
            >
              Continue with {selectedPackage?.name || 'selected'} plan
            </Button>

            <p className="mt-4 text-center text-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-brand-600 font-medium hover:text-brand-700">
                Sign in
              </Link>
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

    return (
      <div className="max-w-md mx-auto">
        <StepIndicator current="payment" showPayment={true} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 px-8 py-8 text-center border-b border-blue-100">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20 mb-4">
              <QrCode className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Complete Payment</h2>
            <p className="text-sm text-gray-500 mt-1">
              Scan the KHQR code to pay for your <strong>{selectedPackage?.name}</strong> plan
            </p>
          </div>

          <div className="p-8">
            {/* Price summary */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedPackage?.name} plan</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{billingCycle} billing</p>
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
                    alt="KHQR Payment Code"
                    className="w-[240px] h-auto rounded-xl"
                  />
                </div>
              ) : (
                <div className="w-[240px] h-[240px] rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                  <div className="text-center text-gray-400">
                    <QrCode className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">KHQR not available</p>
                    <p className="text-xs mt-1">Contact support</p>
                  </div>
                </div>
              )}
            </div>

            {/* Pending notice */}
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 mb-6">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Awaiting verification</p>
                  <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                    After payment, the platform owner will verify and approve your upgrade. You can start using CaféOS on the Free plan right away.
                  </p>
                </div>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handlePaymentDone}>
              I&apos;ve completed payment
            </Button>

            <button
              onClick={handlePaymentDone}
              className="block w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3 transition-colors"
            >
              Skip for now — start with Free plan
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Step 2: Business Details ────────────────────────────
  return (
    <div className="max-w-md mx-auto">
      <StepIndicator current="details" showPayment={!!isPaidPlan} />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Selected plan summary bar */}
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => setStep('plan')}
            className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Change plan
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{selectedPackage?.name}</span>
            {selectedPackage && selectedPackage.monthlyPrice > 0 && (
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                {billingCycle === 'annual'
                  ? formatCurrency(selectedPackage.annualPrice) + '/yr'
                  : formatCurrency(selectedPackage.monthlyPrice) + '/mo'
                }
              </span>
            )}
            {selectedPackage && selectedPackage.monthlyPrice === 0 && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                Free
              </span>
            )}
          </div>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Register your shop</h2>
          <p className="text-sm text-gray-500 mb-6">
            {!isPaidPlan
              ? 'No payment required — start using all features immediately.'
              : 'Complete registration, then proceed to payment.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="businessName"
                label="Business name"
                placeholder="My Coffee Shop"
                value={form.businessName}
                onChange={(e) => updateField('businessName', e.target.value)}
                required
              />
              <Input
                id="ownerName"
                label="Owner name"
                placeholder="John Doe"
                value={form.ownerName}
                onChange={(e) => updateField('ownerName', e.target.value)}
                required
              />
            </div>

            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              required
            />

            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              minLength={8}
              required
            />

            <div className="w-full">
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <select
                id="country"
                value={form.country}
                onChange={(e) => updateField('country', e.target.value)}
                required
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
              >
                <option value="">Select country</option>
                <option value="KH">Cambodia</option>
                <option value="TH">Thailand</option>
                <option value="VN">Vietnam</option>
                <option value="MY">Malaysia</option>
                <option value="SG">Singapore</option>
                <option value="ID">Indonesia</option>
                <option value="PH">Philippines</option>
                <option value="US">United States</option>
                <option value="OTHER">Other</option>
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
                ? 'Creating account...'
                : isPaidPlan
                  ? 'Create account & proceed to payment'
                  : 'Create account'
              }
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-600 font-medium hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
