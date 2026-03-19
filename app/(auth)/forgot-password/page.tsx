'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export default function ForgotPasswordPage() {
  const { t, bilingual, lang } = useI18n()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // TODO: implement password reset email sending
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    const [mainCheck, subCheck] = bilingual('auth.checkEmail')
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <h2 className={cn('text-xl font-semibold text-gray-900 mb-2', lang === 'km' && 'font-khmer')}>
          {mainCheck}
          <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{subCheck}</span>
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {t('auth.resetSent')}
        </p>
        <Link href="/login" className="text-sm text-brand-600 font-medium hover:text-brand-700">
          {t('auth.backToSignIn')}
        </Link>
      </div>
    )
  }

  const [mainReset, subReset] = bilingual('auth.resetPassword')

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <h2 className={cn('text-xl font-semibold text-gray-900 mb-2', lang === 'km' && 'font-khmer')}>
        {mainReset}
        <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{subReset}</span>
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        {t('auth.resetDesc')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="email"
          label={t('auth.email')}
          type="email"
          placeholder={t('auth.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? t('auth.sending') : t('auth.sendResetLink')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/login" className="text-brand-600 font-medium hover:text-brand-700">
          {t('auth.backToSignIn')}
        </Link>
      </p>
    </div>
  )
}
