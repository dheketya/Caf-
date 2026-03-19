'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const { t, bilingual, lang } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError(t('auth.invalidCredentials'))
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const [mainHeading, subHeading] = bilingual('auth.signInToAccount')

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <h2 className={cn('text-xl font-semibold text-gray-900 mb-6', lang === 'km' && 'font-khmer')}>
        {mainHeading}
        <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{subHeading}</span>
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="email"
          label={t('auth.usernameOrEmail')}
          type="text"
          placeholder={t('auth.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          id="password"
          label={t('auth.password')}
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" className="rounded border-gray-300" />
            {t('auth.rememberMe')}
          </label>
          <Link href="/forgot-password" className="text-sm text-brand-600 hover:text-brand-700">
            {t('auth.forgotPassword')}
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        {t('auth.noAccount')}{' '}
        <Link href="/register" className="text-brand-600 font-medium hover:text-brand-700">
          {t('auth.registerYourShop')}
        </Link>
      </p>
    </div>
  )
}
