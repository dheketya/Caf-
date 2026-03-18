'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-sm text-gray-500">{items.length} items tracked</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Item
        </Button>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span className="text-sm text-amber-700 font-medium">
              {lowStock.length} item{lowStock.length > 1 ? 's' : ''} below reorder threshold
            </span>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Item</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Quantity</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Unit</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Reorder At</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Cost/Unit</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Status</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
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
                    <Badge variant="warning">Low</Badge>
                  ) : (
                    <Badge variant="success">OK</Badge>
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
                    Adjust
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Item Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Stock Item">
        <form onSubmit={handleAddItem} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="pcs">Pieces</option>
              <option value="g">Grams</option>
              <option value="kg">Kilograms</option>
              <option value="ml">Milliliters</option>
              <option value="L">Liters</option>
            </select>
          </div>
          <Input label="Initial Quantity" type="number" value={form.currentQuantity} onChange={(e) => setForm({ ...form, currentQuantity: e.target.value })} />
          <Input label="Reorder Threshold" type="number" value={form.reorderThreshold} onChange={(e) => setForm({ ...form, reorderThreshold: e.target.value })} />
          <Input label="Cost per Unit" type="number" step="0.01" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} />
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Saving...' : 'Add Item'}</Button>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal isOpen={showAdjustModal} onClose={() => setShowAdjustModal(false)} title={`Adjust: ${selectedItem?.name}`}>
        <form onSubmit={handleAdjust} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={adjustForm.type} onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value as any })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="RECEIVE">Receive Stock</option>
              <option value="WASTAGE">Wastage</option>
              <option value="CORRECTION">Correction</option>
            </select>
          </div>
          <Input label="Quantity" type="number" value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })} required />
          {adjustForm.type === 'RECEIVE' && (
            <>
              <Input label="Supplier" value={adjustForm.supplierName} onChange={(e) => setAdjustForm({ ...adjustForm, supplierName: e.target.value })} />
              <Input label="Purchase Price" type="number" step="0.01" value={adjustForm.purchasePrice} onChange={(e) => setAdjustForm({ ...adjustForm, purchasePrice: e.target.value })} />
            </>
          )}
          <Input label="Reason / Notes" value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} />
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Saving...' : 'Save Adjustment'}</Button>
        </form>
      </Modal>
    </div>
  )
}
