'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { cn, formatCurrency, formatDate, toKHR } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { Plus, TrendingUp, TrendingDown, DollarSign, CalendarDays, Banknote, QrCode, ArrowLeftRight } from 'lucide-react'

interface FinanceEntry {
  id: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  category: string | null
  expenseCategory: string | null
  vendorName: string | null
  note: string | null
  paymentMethod: string | null
  date: string
  approvalStatus: string
  createdBy: { name: string }
}

export default function IncomePage() {
  const { t, bilingual, lang } = useI18n()

  const PAYMENT_LABELS: Record<string, string> = {
    CASH: t('pos.cash'),
    QR_EWALLET: t('pos.bank'),
    SPLIT: t('pos.cashAndBank'),
  }

  const [entries, setEntries] = useState<FinanceEntry[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>('')
  const [filterPayment, setFilterPayment] = useState<string>('')
  const [period, setPeriod] = useState<'all' | 'month'>('month')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    type: 'INCOME' as 'INCOME' | 'EXPENSE',
    amount: '',
    category: '',
    expenseCategory: '',
    vendorName: '',
    note: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: '',
  })

  const [exchangeRate, setExchangeRate] = useState(4100)

  useEffect(() => {
    fetch('/api/shops/me').then((r) => r.json()).then((shop) => {
      if (shop && !shop.error) setExchangeRate(shop.exchangeRate || 4100)
    })
  }, [])

  useEffect(() => {
    loadEntries()
  }, [filterType, filterPayment, period, selectedMonth])

  async function loadEntries() {
    const params = new URLSearchParams()
    if (filterType) params.set('type', filterType)
    if (filterPayment) params.set('payment', filterPayment)
    if (period === 'month') params.set('month', selectedMonth)
    const res = await fetch(`/api/income?${params}`)
    if (res.ok) {
      setEntries(await res.json())
    } else if (res.status === 403) {
      setError(t('income.noPermission'))
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        amount: parseFloat(form.amount),
        expenseCategory: form.type === 'EXPENSE' ? form.expenseCategory : undefined,
        paymentMethod: form.paymentMethod || undefined,
      }),
    })
    setShowModal(false)
    setForm({ type: 'INCOME', amount: '', category: '', expenseCategory: '', vendorName: '', note: '', date: new Date().toISOString().split('T')[0], paymentMethod: '' })
    loadEntries()
    setLoading(false)
  }

  const totalIncome = entries.filter((e) => e.type === 'INCOME').reduce((s, e) => s + e.amount, 0)
  const totalExpense = entries.filter((e) => e.type === 'EXPENSE').reduce((s, e) => s + e.amount, 0)

  const [titleMain, titleSub] = bilingual('income.title')

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <DollarSign className="h-12 w-12 text-gray-300" />
        <h2 className={cn('text-xl font-semibold text-gray-900', lang === 'km' && 'font-khmer')}>
          {titleMain}
          <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{titleSub}</span>
        </h2>
        <p className="text-gray-500">{error}</p>
        <Button onClick={() => window.location.href = '/billing'}>{t('income.upgradePlan')}</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={cn('text-2xl font-bold text-gray-900', lang === 'km' && 'font-khmer')}>
          {titleMain}
          <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{titleSub}</span>
        </h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-1" /> {t('income.addEntry')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('income.totalIncomeSummary')}</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
              <p className="text-xs text-gray-400">{toKHR(totalIncome, exchangeRate)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('income.totalExpenseSummary')}</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
              <p className="text-xs text-gray-400">{toKHR(totalExpense, exchangeRate)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('income.netProfitLoss')}</p>
              <p className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalIncome - totalExpense)}
              </p>
              <p className="text-xs text-gray-400">{toKHR(totalIncome - totalExpense, exchangeRate)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period */}
        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
          <button onClick={() => setPeriod('all')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors', period === 'all' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
            {t('income.allTime')}
          </button>
          <button onClick={() => setPeriod('month')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors', period === 'month' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
            {t('income.month')}
          </button>
        </div>

        {period === 'month' && (
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700">
              {(() => {
                const months = []
                const now = new Date()
                for (let i = 0; i < 12; i++) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
                  const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                  const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
                  months.push(<option key={value} value={value}>{label}</option>)
                }
                return months
              })()}
            </select>
          </div>
        )}

        {/* Type filter */}
        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
          {[
            { value: '', label: t('income.all') },
            { value: 'INCOME', label: t('income.income'), color: 'text-green-600' },
            { value: 'EXPENSE', label: t('income.expense'), color: 'text-red-600' },
          ].map((ft) => (
            <button key={ft.value} onClick={() => setFilterType(ft.value)} className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors', filterType === ft.value ? 'bg-gray-900 text-white' : `${ft.color || 'text-gray-600'} hover:bg-gray-50`)}>
              {ft.label}
            </button>
          ))}
        </div>

        {/* Payment filter */}
        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
          {[
            { value: '', label: t('income.allPay'), icon: undefined },
            { value: 'CASH', label: t('pos.cash'), icon: <Banknote className="h-3.5 w-3.5" /> },
            { value: 'QR_EWALLET', label: t('pos.bank'), icon: <QrCode className="h-3.5 w-3.5" /> },
            { value: 'SPLIT', label: t('income.mixed'), icon: <ArrowLeftRight className="h-3.5 w-3.5" /> },
          ].map((opt) => (
            <button key={opt.value} onClick={() => setFilterPayment(opt.value)} className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors', filterPayment === opt.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50')}>
              {opt.icon}{opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('income.date')}</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('income.type')}</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('income.category')}</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('income.paymentMethod')}</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('income.note')}</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">{t('income.amount')}</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">{t('common.status')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-600">{formatDate(entry.date)}</td>
                <td className="py-3 px-4">
                  <Badge variant={entry.type === 'INCOME' ? 'success' : 'danger'}>
                    {entry.type === 'INCOME' ? t('income.income') : t('income.expense')}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-gray-600">{entry.expenseCategory || entry.category || '—'}</td>
                <td className="py-3 px-4 text-gray-600 text-sm">
                  {entry.paymentMethod ? PAYMENT_LABELS[entry.paymentMethod] || entry.paymentMethod : '—'}
                </td>
                <td className="py-3 px-4 text-gray-600 truncate max-w-[200px]">{entry.note || '—'}</td>
                <td className="py-3 px-4 text-right">
                  <p className={`font-medium ${entry.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                    {entry.type === 'INCOME' ? '+' : '-'}{formatCurrency(entry.amount)}
                  </p>
                  <p className="text-[11px] text-gray-400">{toKHR(entry.amount, exchangeRate)}</p>
                </td>
                <td className="py-3 px-4 text-right">
                  <Badge variant={entry.approvalStatus === 'APPROVED' ? 'success' : entry.approvalStatus === 'PENDING' ? 'warning' : 'danger'}>
                    {entry.approvalStatus}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t('income.addEntry')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('income.type')}</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="INCOME">{t('income.income')}</option>
              <option value="EXPENSE">{t('income.expense')}</option>
            </select>
          </div>
          <Input label={t('income.amount')} type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <Input label={t('income.date')} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          {form.type === 'EXPENSE' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('income.category')}</label>
                <select value={form.expenseCategory} onChange={(e) => setForm({ ...form, expenseCategory: e.target.value })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                  <option value="">{t('income.category')}</option>
                  <option value="INGREDIENTS">{t('income.ingredients')}</option>
                  <option value="RENT">{t('income.rent')}</option>
                  <option value="UTILITIES">{t('income.utilities')}</option>
                  <option value="SALARIES">{t('income.salaries')}</option>
                  <option value="OTHER">{t('income.otherCategory')}</option>
                </select>
              </div>
              <Input label={t('income.vendor')} value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} />
            </>
          )}
          {form.type === 'INCOME' && (
            <Input label={t('income.category')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Catering, Events" />
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('income.paymentMethod')}</label>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="">{t('income.notSpecified')}</option>
              <option value="CASH">{t('pos.cash')}</option>
              <option value="QR_EWALLET">{t('pos.bank')}</option>
              <option value="SPLIT">{t('pos.cashAndBank')}</option>
            </select>
          </div>
          <Input label={t('income.note')} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <Button type="submit" className="w-full" disabled={loading}>{loading ? t('common.loading') : t('common.save')}</Button>
        </form>
      </Modal>
    </div>
  )
}
