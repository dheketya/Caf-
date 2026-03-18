'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { formatCurrency, formatDate, toKHR } from '@/lib/utils'
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

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

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  QR_EWALLET: 'Bank Transfer',
  SPLIT: 'Cash + Bank',
}

export default function IncomePage() {
  const [entries, setEntries] = useState<FinanceEntry[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>('')
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
  }, [filterType])

  async function loadEntries() {
    const params = new URLSearchParams()
    if (filterType) params.set('type', filterType)
    const res = await fetch(`/api/income?${params}`)
    if (res.ok) {
      setEntries(await res.json())
    } else if (res.status === 403) {
      setError('You do not have permission to access this feature.')
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <DollarSign className="h-12 w-12 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900">Income & Expense</h2>
        <p className="text-gray-500">{error}</p>
        <Button onClick={() => window.location.href = '/billing'}>Upgrade Plan</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Income & Expense</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Income</p>
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
              <p className="text-sm text-gray-500">Total Expenses</p>
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
              <p className="text-sm text-gray-500">Net Profit/Loss</p>
              <p className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalIncome - totalExpense)}
              </p>
              <p className="text-xs text-gray-400">{toKHR(totalIncome - totalExpense, exchangeRate)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        {['', 'INCOME', 'EXPENSE'].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${filterType === t ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {t || 'All'}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Category</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Payment</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Note</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Amount</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-600">{formatDate(entry.date)}</td>
                <td className="py-3 px-4">
                  <Badge variant={entry.type === 'INCOME' ? 'success' : 'danger'}>
                    {entry.type}
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Entry">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </div>
          <Input label="Amount" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          {form.type === 'EXPENSE' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.expenseCategory} onChange={(e) => setForm({ ...form, expenseCategory: e.target.value })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                  <option value="">Select category</option>
                  <option value="INGREDIENTS">Ingredients</option>
                  <option value="RENT">Rent</option>
                  <option value="UTILITIES">Utilities</option>
                  <option value="SALARIES">Salaries</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <Input label="Vendor" value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} />
            </>
          )}
          {form.type === 'INCOME' && (
            <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Catering, Events" />
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="">Not specified</option>
              <option value="CASH">Cash</option>
              <option value="QR_EWALLET">Bank Transfer</option>
              <option value="SPLIT">Cash + Bank Transfer</option>
            </select>
          </div>
          <Input label="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
        </form>
      </Modal>
    </div>
  )
}
