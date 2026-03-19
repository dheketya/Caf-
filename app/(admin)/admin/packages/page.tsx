'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { formatCurrency, cn } from '@/lib/utils'
import { Plus, Package, Edit2, Trash2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface PackageData {
  id: string
  name: string
  description: string | null
  saleLimit: number | null
  monthlyPrice: number
  annualPrice: number
  modules: string[]
  sortOrder: number
  isDefault: boolean
  isVisible: boolean
  _count: { shops: number }
}

const ALL_MODULES = [
  'pos', 'products', 'stock', 'income', 'reports', 'reports_full',
  'export', 'users', 'billing', 'chat', 'settings',
]

const emptyForm = {
  name: '',
  description: '',
  saleLimit: '',
  monthlyPrice: '0',
  annualPrice: '0',
  modules: ALL_MODULES as string[],
  isDefault: false,
  isVisible: true,
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<PackageData[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const { t, bilingual, lang } = useI18n()

  useEffect(() => { loadPackages() }, [])

  async function loadPackages() {
    const data = await fetch('/api/admin/packages').then((r) => r.json())
    setPackages(data)
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  function openEdit(pkg: PackageData) {
    setEditingId(pkg.id)
    setForm({
      name: pkg.name,
      description: pkg.description || '',
      saleLimit: pkg.saleLimit?.toString() || '',
      monthlyPrice: pkg.monthlyPrice.toString(),
      annualPrice: pkg.annualPrice.toString(),
      modules: pkg.modules as string[],
      isDefault: pkg.isDefault,
      isVisible: pkg.isVisible,
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      name: form.name,
      description: form.description || undefined,
      saleLimit: form.saleLimit ? parseInt(form.saleLimit) : null,
      monthlyPrice: parseFloat(form.monthlyPrice),
      annualPrice: parseFloat(form.annualPrice),
      modules: form.modules,
      isDefault: form.isDefault,
      isVisible: form.isVisible,
    }

    const res = await fetch('/api/admin/packages', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to save')
      setLoading(false)
      return
    }

    setShowModal(false)
    loadPackages()
    setLoading(false)
  }

  async function handleDelete(pkg: PackageData) {
    if (!confirm(`Delete "${pkg.name}" package? This cannot be undone.`)) return

    const res = await fetch(`/api/admin/packages?id=${pkg.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error || 'Failed to delete')
      return
    }
    loadPackages()
  }

  function toggleModule(mod: string) {
    setForm((f) => ({
      ...f,
      modules: f.modules.includes(mod) ? f.modules.filter((m) => m !== mod) : [...f.modules, mod],
    }))
  }

  const [mainTitle, subTitle] = bilingual('adminPkg.title')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={cn('text-2xl font-bold text-gray-900', lang === 'km' && 'font-khmer')}>
          {mainTitle}
          <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{subTitle}</span>
        </h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> {t('adminPkg.newPackage')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg) => {
          const annualSavings = pkg.monthlyPrice > 0
            ? Math.round((1 - pkg.annualPrice / (pkg.monthlyPrice * 12)) * 100)
            : 0

          return (
            <Card key={pkg.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-brand-500" />
                    {pkg.name}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {pkg.isDefault && <Badge variant="info">{t('adminPkg.default')}</Badge>}
                    {!pkg.isVisible && <Badge variant="warning">{t('adminPkg.hidden')}</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {pkg.description && (
                  <p className="text-sm text-gray-500">{pkg.description}</p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">{t('adminPkg.saleLimit')}</p>
                    <p className="font-semibold">{pkg.saleLimit?.toLocaleString() ?? t('auth.unlimited')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t('adminPkg.activeShops')}</p>
                    <p className="font-semibold">{pkg._count.shops}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-400">{t('adminPkg.pricing')}</p>
                  {pkg.monthlyPrice === 0 ? (
                    <p className="font-semibold text-green-600">{t('auth.free')}</p>
                  ) : (
                    <div>
                      <p className="font-semibold">
                        {formatCurrency(pkg.monthlyPrice)}/mo
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(pkg.annualPrice)}/yr
                        {annualSavings > 0 && (
                          <span className="text-green-600 ml-1">
                            (save {annualSavings}%)
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <Button variant="outline" size="sm" onClick={() => openEdit(pkg)}>
                    <Edit2 className="h-3 w-3 mr-1" /> {t('common.edit')}
                  </Button>
                  {pkg._count.shops === 0 && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(pkg)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-3 w-3 mr-1" /> {t('common.delete')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? t('adminPkg.editPackage') : t('adminPkg.newPackage')}
        className="max-w-xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label={t('products.categoryName')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <Input
            label={t('adminPkg.description')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={t('adminPkg.descHint')}
          />

          <Input
            label={t('adminPkg.saleLimitHint')}
            type="number"
            value={form.saleLimit}
            onChange={(e) => setForm({ ...form, saleLimit: e.target.value })}
            placeholder="e.g. 500"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('adminPkg.monthlyPrice')}
              type="number"
              step="0.01"
              value={form.monthlyPrice}
              onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })}
              required
            />
            <Input
              label={t('adminPkg.annualPrice')}
              type="number"
              step="0.01"
              value={form.annualPrice}
              onChange={(e) => setForm({ ...form, annualPrice: e.target.value })}
              required
            />
          </div>

          {parseFloat(form.monthlyPrice) > 0 && parseFloat(form.annualPrice) > 0 && (
            <p className="text-sm text-green-600">
              {t('adminPkg.annualDiscount')}: {Math.round((1 - parseFloat(form.annualPrice) / (parseFloat(form.monthlyPrice) * 12)) * 100)}% off
            </p>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{t('adminPkg.modules')}</p>
            <div className="grid grid-cols-3 gap-2">
              {ALL_MODULES.map((mod) => (
                <label key={mod} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.modules.includes(mod)}
                    onChange={() => toggleModule(mod)}
                    className="rounded border-gray-300"
                  />
                  {mod}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="rounded border-gray-300"
              />
              {t('adminPkg.defaultPlan')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isVisible}
                onChange={(e) => setForm({ ...form, isVisible: e.target.checked })}
                className="rounded border-gray-300"
              />
              {t('adminPkg.visibleRegistration')}
            </label>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('settings.saving') : editingId ? t('adminPkg.updatePackage') : t('adminPkg.createPackage')}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
