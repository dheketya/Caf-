'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { Plus, Warehouse, AlertTriangle } from 'lucide-react'

interface StockItem {
  id: string
  name: string
  unit: string
  currentQuantity: number
  reorderThreshold: number
  costPerUnit: number
}

export default function StockPage() {
  const { t, bilingual, lang } = useI18n()
  const [items, setItems] = useState<StockItem[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    unit: 'pcs',
    currentQuantity: '',
    reorderThreshold: '',
    costPerUnit: '',
  })

  const [adjustForm, setAdjustForm] = useState({
    type: 'RECEIVE' as 'RECEIVE' | 'WASTAGE' | 'CORRECTION',
    quantity: '',
    supplierName: '',
    purchasePrice: '',
    reason: '',
  })

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    const data = await fetch('/api/stock').then((r) => r.json())
    setItems(data)
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        unit: form.unit,
        currentQuantity: parseFloat(form.currentQuantity) || 0,
        reorderThreshold: parseFloat(form.reorderThreshold) || 0,
        costPerUnit: parseFloat(form.costPerUnit) || 0,
      }),
    })
    setShowAddModal(false)
    setForm({ name: '', unit: 'pcs', currentQuantity: '', reorderThreshold: '', costPerUnit: '' })
    loadItems()
    setLoading(false)
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedItem) return
    setLoading(true)
    await fetch('/api/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stockItemId: selectedItem.id,
        type: adjustForm.type,
        quantity: parseFloat(adjustForm.quantity),
        supplierName: adjustForm.supplierName || undefined,
        purchasePrice: adjustForm.purchasePrice ? parseFloat(adjustForm.purchasePrice) : undefined,
        reason: adjustForm.reason || undefined,
      }),
    })
    setShowAdjustModal(false)
    setAdjustForm({ type: 'RECEIVE', quantity: '', supplierName: '', purchasePrice: '', reason: '' })
    loadItems()
    setLoading(false)
  }

  const lowStock = items.filter((i) => i.currentQuantity <= i.reorderThreshold)

  const [titleMain, titleSub] = bilingual('stock.title')

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className={cn('text-xl sm:text-2xl font-bold text-gray-900', lang === 'km' && 'font-khmer')}>
            {titleMain}
            <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{titleSub}</span>
          </h1>
          <p className="text-sm text-gray-500">{items.length} {t('stock.itemsTracked')}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="shrink-0">
          <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">{t('stock.addItem')}</span>
        </Button>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span className="text-sm text-amber-700 font-medium">
              {lowStock.length} {t('stock.belowThreshold')}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Table - desktop */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">{t('stock.item')}</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">{t('stock.quantity')}</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">{t('stock.unit')}</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">{t('stock.reorderAt')}</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">{t('stock.costPerUnit')}</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">{t('common.status')}</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">{t('stock.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                <td className="py-3 px-4 text-right">{item.currentQuantity}</td>
                <td className="py-3 px-4 text-right text-gray-500">{item.unit}</td>
                <td className="py-3 px-4 text-right text-gray-500">{item.reorderThreshold}</td>
                <td className="py-3 px-4 text-right text-gray-500">${item.costPerUnit.toFixed(2)}</td>
                <td className="py-3 px-4 text-right">
                  {item.currentQuantity <= item.reorderThreshold ? (
                    <Badge variant="warning">{t('stock.low')}</Badge>
                  ) : (
                    <Badge variant="success">{t('stock.ok')}</Badge>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedItem(item)
                      setShowAdjustModal(true)
                    }}
                  >
                    {t('stock.adjust')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {items.map((item) => {
          const isLow = item.currentQuantity <= item.reorderThreshold
          return (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', isLow ? 'bg-amber-50' : 'bg-gray-50')}>
                    <Warehouse className={cn('h-4 w-4', isLow ? 'text-amber-500' : 'text-gray-400')} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">${item.costPerUnit.toFixed(2)} / {item.unit}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn('text-lg font-bold', isLow ? 'text-amber-600' : 'text-gray-900')}>{item.currentQuantity}</p>
                  <p className="text-[10px] text-gray-400">{item.unit}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {isLow ? (
                    <Badge variant="warning" className="text-[10px]">{t('stock.low')}</Badge>
                  ) : (
                    <Badge variant="success" className="text-[10px]">{t('stock.ok')}</Badge>
                  )}
                  <span className="text-[10px] text-gray-400">{t('stock.reorderAt')}: {item.reorderThreshold}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    setSelectedItem(item)
                    setShowAdjustModal(true)
                  }}
                >
                  {t('stock.adjust')}
                </Button>
              </div>
            </div>
          )
        })}
        {items.length === 0 && (
          <p className="py-8 text-center text-gray-400 text-sm">{t('stock.noItems')}</p>
        )}
      </div>

      {/* Add Item Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={t('stock.addItem')}>
        <form onSubmit={handleAddItem} className="space-y-4">
          <Input label={t('stock.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('stock.unit')}</label>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="pcs">{t('stock.pieces')}</option>
              <option value="g">{t('stock.grams')}</option>
              <option value="kg">{t('stock.kilograms')}</option>
              <option value="ml">{t('stock.milliliters')}</option>
              <option value="L">{t('stock.liters')}</option>
            </select>
          </div>
          <Input label={t('stock.initialQty')} type="number" value={form.currentQuantity} onChange={(e) => setForm({ ...form, currentQuantity: e.target.value })} />
          <Input label={t('stock.reorderThreshold')} type="number" value={form.reorderThreshold} onChange={(e) => setForm({ ...form, reorderThreshold: e.target.value })} />
          <Input label={t('stock.costPerUnit')} type="number" step="0.01" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} />
          <Button type="submit" className="w-full" disabled={loading}>{loading ? t('common.loading') : t('stock.addItem')}</Button>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal isOpen={showAdjustModal} onClose={() => setShowAdjustModal(false)} title={`${t('stock.adjust')}: ${selectedItem?.name}`}>
        <form onSubmit={handleAdjust} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('income.type')}</label>
            <select value={adjustForm.type} onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value as any })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="RECEIVE">{t('stock.receiveStock')}</option>
              <option value="WASTAGE">{t('stock.wastage')}</option>
              <option value="CORRECTION">{t('stock.correction')}</option>
            </select>
          </div>
          <Input label={t('stock.quantity')} type="number" value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })} required />
          {adjustForm.type === 'RECEIVE' && (
            <>
              <Input label={t('stock.supplier')} value={adjustForm.supplierName} onChange={(e) => setAdjustForm({ ...adjustForm, supplierName: e.target.value })} />
              <Input label={t('stock.purchasePrice')} type="number" step="0.01" value={adjustForm.purchasePrice} onChange={(e) => setAdjustForm({ ...adjustForm, purchasePrice: e.target.value })} />
            </>
          )}
          <Input label={t('stock.reasonNotes')} value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} />
          <Button type="submit" className="w-full" disabled={loading}>{loading ? t('common.loading') : t('stock.saveAdjustment')}</Button>
        </form>
      </Modal>
    </div>
  )
}
