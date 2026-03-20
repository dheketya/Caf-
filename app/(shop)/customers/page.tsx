'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { formatCurrency, formatDate, toKHR, cn } from '@/lib/utils'
import { Search, UserCheck, Phone, ShoppingCart, Award, Plus, Edit2, Trash2, Users } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface Customer {
  id: string
  phone: string
  name: string | null
  totalVisits: number
  totalSpent: number
  lastVisitAt: string | null
  note: string | null
  createdAt: string
}

interface OrderHistory {
  id: string
  orderNumber: number
  total: number
  createdAt: string
  items: { quantity: number; unitPrice: number; product: { name: string } }[]
}

interface CustomerDetail extends Customer {
  orders: OrderHistory[]
}

export default function CustomersPage() {
  const { t, bilingual, lang } = useI18n()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Customer | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [exchangeRate, setExchangeRate] = useState(4100)
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false)
  const [loyaltyTarget, setLoyaltyTarget] = useState(10)
  const [loyaltyDiscountType, setLoyaltyDiscountType] = useState('percentage')
  const [loyaltyDiscountValue, setLoyaltyDiscountValue] = useState(10)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({ phone: '', name: '', note: '' })
  const [walkIn, setWalkIn] = useState<{ totalVisits: number; totalSpent: number } | null>(null)

  useEffect(() => {
    loadCustomers()
    fetch('/api/customers?walkin=true').then((r) => r.json()).then(setWalkIn)
    fetch('/api/shops/me').then((r) => r.json()).then((shop) => {
      if (shop && !shop.error) {
        setExchangeRate(shop.exchangeRate || 4100)
        setLoyaltyEnabled(shop.loyaltyEnabled ?? false)
        setLoyaltyTarget(shop.loyaltyTarget || 10)
        setLoyaltyDiscountType(shop.loyaltyDiscountType || 'percentage')
        setLoyaltyDiscountValue(shop.loyaltyDiscountValue || 10)
      }
    })
  }, [])

  async function loadCustomers() {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const data = await fetch(`/api/customers?${params}`).then((r) => r.json())
    setCustomers(data)
  }

  useEffect(() => {
    const timer = setTimeout(loadCustomers, 300)
    return () => clearTimeout(timer)
  }, [search])

  async function openDetail(customer: Customer) {
    setLoading(true)
    const data = await fetch(`/api/customers/${customer.id}`).then((r) => r.json())
    setSelectedCustomer(data)
    setShowDetail(true)
    setLoading(false)
  }

  function openCreate() {
    setEditingCustomer(null)
    setForm({ phone: '', name: '', note: '' })
    setShowFormModal(true)
  }

  function openEdit(customer: Customer, e?: React.MouseEvent) {
    e?.stopPropagation()
    setEditingCustomer(customer)
    setForm({ phone: customer.phone, name: customer.name || '', note: customer.note || '' })
    setShowFormModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (editingCustomer) {
      await fetch(`/api/customers/${editingCustomer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } else {
      await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    }

    setShowFormModal(false)
    loadCustomers()
    setLoading(false)
  }

  async function handleDelete() {
    if (!showDeleteConfirm) return
    await fetch(`/api/customers/${showDeleteConfirm.id}`, { method: 'DELETE' })
    setShowDeleteConfirm(null)
    loadCustomers()
  }

  const totalCustomers = customers.length
  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0)
  const avgVisits = totalCustomers > 0 ? Math.round(customers.reduce((s, c) => s + c.totalVisits, 0) / totalCustomers) : 0

  const [titleMain, titleSub] = bilingual('customers.title')

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className={cn('text-xl sm:text-2xl font-bold text-gray-900', lang === 'km' && 'font-khmer')}>{titleMain}
            <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{titleSub}</span>
          </h1>
          <p className="text-sm text-gray-500">{totalCustomers} {t('customers.registered')}</p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">{t('customers.add')}</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-blue-50 flex items-center justify-center mb-2">
              <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('customers.totalCustomers')}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{totalCustomers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-green-50 flex items-center justify-center mb-2">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </div>
            <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('customers.customerRevenue')}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            <p className="text-[9px] sm:text-xs text-gray-400">{toKHR(totalRevenue, exchangeRate)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-purple-50 flex items-center justify-center mb-2">
              <Award className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
            </div>
            <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('customers.avgVisits')}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{avgVisits}</p>
          </CardContent>
        </Card>
      </div>

      {/* Walk-in Customer Summary */}
      {walkIn && walkIn.totalVisits > 0 && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700">{t('customers.walkIn')}</p>
                <p className="text-xs text-gray-400">{t('customers.walkInDesc')}</p>
              </div>
              <div className="flex gap-4 sm:gap-6 shrink-0 text-right">
                <div>
                  <p className="text-lg sm:text-xl font-bold text-gray-700">{walkIn.totalVisits}</p>
                  <p className="text-[10px] text-gray-400">{t('customers.totalVisits')}</p>
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-bold text-gray-700">{formatCurrency(walkIn.totalSpent)}</p>
                  <p className="text-[10px] text-gray-400">{toKHR(walkIn.totalSpent, exchangeRate)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder={t('customers.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Customer List - Table on md+, Cards on mobile */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('customers.name')}</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('customers.phone')}</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">{t('customers.totalVisits')}</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">{t('customers.totalSpent')}</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('customers.lastVisit')}</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                onClick={() => openDetail(customer)}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-brand-50 flex items-center justify-center">
                      <UserCheck className="h-4 w-4 text-brand-600" />
                    </div>
                    <span className="font-medium text-gray-900">{customer.name || '—'}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Phone className="h-3.5 w-3.5" />
                    {customer.phone}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-medium text-gray-900">{customer.totalVisits}</span>
                  {loyaltyEnabled && customer.totalVisits >= loyaltyTarget && <Badge variant="success" className="ml-2 text-[10px]">{t('customers.loyalty')}</Badge>}
                </td>
                <td className="py-3 px-4 text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(customer.totalSpent)}</p>
                  <p className="text-[11px] text-gray-400">{toKHR(customer.totalSpent, exchangeRate)}</p>
                </td>
                <td className="py-3 px-4 text-gray-500">
                  {customer.lastVisitAt ? formatDate(customer.lastVisitAt) : '—'}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => openEdit(customer, e)} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand-600 hover:bg-brand-50" title={t('customers.edit')}>
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => setShowDeleteConfirm(customer)} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50" title={t('customers.delete')}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  {search ? t('customers.noCustomersFound') : t('customers.noCustomersYet')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50"
            onClick={() => openDetail(customer)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                  <UserCheck className="h-5 w-5 text-brand-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{customer.name || '—'}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" /> {customer.phone}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-900">{formatCurrency(customer.totalSpent)}</p>
                <p className="text-[10px] text-gray-400">{customer.totalVisits} {t('customers.totalVisits').toLowerCase()}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-400">{customer.lastVisitAt ? formatDate(customer.lastVisitAt) : t('customers.noOrdersYet')}</p>
                {loyaltyEnabled && customer.totalVisits >= loyaltyTarget && <Badge variant="success" className="text-[10px]">{t('customers.loyalty')}</Badge>}
              </div>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={(e) => openEdit(customer, e)} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand-600 hover:bg-brand-50">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(customer) }} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {customers.length === 0 && (
          <p className="py-8 text-center text-gray-400 text-sm">
            {search ? t('customers.noCustomersFound') : t('customers.noCustomersYet')}
          </p>
        )}
      </div>

      {/* Create / Edit Customer Modal */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={editingCustomer ? t('customers.edit') : t('customers.add')}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label={t('customers.phoneRequired')}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="012 345 678"
            required
          />
          <Input
            label={t('customers.nameOptional')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t('customers.name')}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('customers.noteOptional')}</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="e.g. Allergies, preferences..."
              className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent min-h-[80px]"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '...' : editingCustomer ? t('customers.updateCustomer') : t('customers.addCustomer')}
          </Button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title={t('customers.deleteCustomer')}>
        {showDeleteConfirm && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t('customers.deleteMsg')} (<strong>{showDeleteConfirm.name || showDeleteConfirm.phone}</strong>)
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(null)}>{t('common.cancel')}</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>{t('customers.deleteCustomer')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Customer Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title={t('customers.customerDetails')} className="max-w-lg">
        {selectedCustomer && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                  <UserCheck className="h-5 w-5 sm:h-7 sm:w-7 text-brand-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-base sm:text-lg font-bold text-gray-900 truncate">{selectedCustomer.name || '—'}</p>
                  <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {selectedCustomer.phone}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setShowDetail(false); openEdit(selectedCustomer) }} className="shrink-0">
                <Edit2 className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">{t('customers.edit')}</span>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-lg bg-gray-50 p-2 sm:p-3 text-center">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{selectedCustomer.totalVisits}</p>
                <p className="text-[10px] sm:text-xs text-gray-500">{t('customers.totalVisits')}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-2 sm:p-3 text-center">
                <p className="text-sm sm:text-lg font-bold text-gray-900">{formatCurrency(selectedCustomer.totalSpent)}</p>
                <p className="text-[9px] sm:text-[11px] text-gray-400">{toKHR(selectedCustomer.totalSpent, exchangeRate)}</p>
                <p className="text-[10px] sm:text-xs text-gray-500">{t('customers.spent')}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-2 sm:p-3 text-center">
                <p className="text-sm sm:text-lg font-bold text-gray-900">
                  {selectedCustomer.totalVisits > 0 ? formatCurrency(selectedCustomer.totalSpent / selectedCustomer.totalVisits) : '$0'}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500">{t('customers.avgPerVisit')}</p>
              </div>
            </div>

            {/* Loyalty */}
            {loyaltyEnabled && selectedCustomer.totalVisits > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">{t('pos.loyaltyProgress')}</span>
                  </div>
                  <span className="text-sm font-bold text-amber-700">{selectedCustomer.totalVisits % loyaltyTarget} / {loyaltyTarget}</span>
                </div>
                <div className="h-2 bg-amber-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${Math.min(100, ((selectedCustomer.totalVisits % loyaltyTarget) / loyaltyTarget) * 100)}%` }} />
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  {selectedCustomer.totalVisits >= loyaltyTarget
                    ? `${Math.floor(selectedCustomer.totalVisits / loyaltyTarget)} ${t('customers.earnedRewards')} ${loyaltyTarget - (selectedCustomer.totalVisits % loyaltyTarget || loyaltyTarget)} ${t('customers.moreForNextReward')}`
                    : `${loyaltyTarget - selectedCustomer.totalVisits} ${t('customers.moreForNext')}`}
                  {' '}({loyaltyDiscountType === 'percentage' ? `${loyaltyDiscountValue}% off` : `$${loyaltyDiscountValue} off`})
                </p>
              </div>
            )}
            {!loyaltyEnabled && selectedCustomer.totalVisits > 0 && (
              <p className="text-xs text-gray-400 text-center">{t('customers.loyaltyNotActive')}</p>
            )}

            {/* Note */}
            {selectedCustomer.note && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500 mb-1">{t('customers.noteOptional')}</p>
                <p className="text-sm text-gray-700">{selectedCustomer.note}</p>
              </div>
            )}

            {/* Purchase History */}
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">{t('customers.purchaseHistory')}</p>
              {selectedCustomer.orders.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">{t('customers.noOrdersYet')}</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedCustomer.orders.map((order) => (
                    <div key={order.id} className="rounded-lg border border-gray-100 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{t('customers.order')} #{order.orderNumber}</span>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(order.total)}</span>
                          <p className="text-[10px] text-gray-400">{toKHR(order.total, exchangeRate)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                      <div className="mt-1 space-y-0.5">
                        {order.items.map((item, i) => (
                          <p key={i} className="text-xs text-gray-500">
                            {item.quantity}x {item.product.name} — {formatCurrency(item.unitPrice * item.quantity)}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400 text-center">
              {t('customers.customerSince')} {formatDate(selectedCustomer.createdAt)}
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
