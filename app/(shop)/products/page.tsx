'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { cn, formatCurrency } from '@/lib/utils'
import { Plus, Search, Package, Trash2, Settings2 } from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  sku: string | null
  image: string | null
  isActive: boolean
  isOutOfStock: boolean
  category: { id: string; name: string } | null
}

interface Category {
  id: string
  name: string
  color: string | null
}

interface ModifierOption {
  name: string
  priceAdjustment: number
}

interface ModifierGroup {
  id: string
  name: string
  isRequired: boolean
  modifiers: { id: string; name: string; priceAdjustment: number }[]
  products: { productId: string }[]
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([])
  const [search, setSearch] = useState('')
  const [showProductModal, setShowProductModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showModifierModal, setShowModifierModal] = useState(false)
  const [editingModGroup, setEditingModGroup] = useState<ModifierGroup | null>(null)

  // Product form
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    sku: '',
    categoryId: '',
  })

  // Category form
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#6366f1' })

  // Modifier group form
  const [modGroupForm, setModGroupForm] = useState({
    name: '',
    isRequired: false,
    modifiers: [{ name: '', priceAdjustment: 0 }] as ModifierOption[],
    productIds: [] as string[],
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [prods, cats, mods] = await Promise.all([
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/modifier-groups').then((r) => r.json()),
    ])
    setProducts(prods)
    setCategories(cats)
    setModifierGroups(mods)
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description || undefined,
        price: parseFloat(form.price),
        sku: form.sku || undefined,
        categoryId: form.categoryId || undefined,
      }),
    })
    setShowProductModal(false)
    setForm({ name: '', description: '', price: '', sku: '', categoryId: '' })
    loadData()
    setLoading(false)
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryForm),
    })
    setShowCategoryModal(false)
    setCategoryForm({ name: '', color: '#6366f1' })
    loadData()
    setLoading(false)
  }

  function openCreateModGroup() {
    setEditingModGroup(null)
    setModGroupForm({
      name: '',
      isRequired: false,
      modifiers: [{ name: '', priceAdjustment: 0 }],
      productIds: [],
    })
    setShowModifierModal(true)
  }

  function openEditModGroup(group: ModifierGroup) {
    setEditingModGroup(group)
    setModGroupForm({
      name: group.name,
      isRequired: group.isRequired,
      modifiers: group.modifiers.map((m) => ({ name: m.name, priceAdjustment: m.priceAdjustment })),
      productIds: group.products.map((p) => p.productId),
    })
    setShowModifierModal(true)
  }

  function addModifierRow() {
    setModGroupForm((f) => ({
      ...f,
      modifiers: [...f.modifiers, { name: '', priceAdjustment: 0 }],
    }))
  }

  function removeModifierRow(idx: number) {
    setModGroupForm((f) => ({
      ...f,
      modifiers: f.modifiers.filter((_, i) => i !== idx),
    }))
  }

  function updateModifier(idx: number, field: keyof ModifierOption, value: string | number) {
    setModGroupForm((f) => ({
      ...f,
      modifiers: f.modifiers.map((m, i) => i === idx ? { ...m, [field]: value } : m),
    }))
  }

  function toggleProduct(productId: string) {
    setModGroupForm((f) => ({
      ...f,
      productIds: f.productIds.includes(productId)
        ? f.productIds.filter((id) => id !== productId)
        : [...f.productIds, productId],
    }))
  }

  async function handleSaveModGroup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const validModifiers = modGroupForm.modifiers.filter((m) => m.name.trim())
    const payload = {
      name: modGroupForm.name,
      isRequired: modGroupForm.isRequired,
      modifiers: validModifiers,
      productIds: modGroupForm.productIds,
    }

    if (editingModGroup) {
      await fetch('/api/modifier-groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingModGroup.id, ...payload }),
      })
    } else {
      await fetch('/api/modifier-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    setShowModifierModal(false)
    loadData()
    setLoading(false)
  }

  async function deleteModGroup(id: string) {
    if (!confirm('Delete this modifier group?')) return
    await fetch(`/api/modifier-groups?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">{products.length} products</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCategoryModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> Category
          </Button>
          <Button variant="outline" onClick={openCreateModGroup}>
            <Settings2 className="h-4 w-4 mr-1" /> Modifier Group
          </Button>
          <Button onClick={() => setShowProductModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> Product
          </Button>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm"
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color || '#6366f1' }} />
              {cat.name}
            </div>
          ))}
        </div>
      )}

      {/* Modifier Groups */}
      {modifierGroups.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Modifier Groups</h2>
          <div className="flex gap-3 flex-wrap">
            {modifierGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => openEditModGroup(group)}
                className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200 text-left hover:border-gray-300 transition-colors max-w-xs"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{group.name}</p>
                    {group.isRequired && <Badge variant="warning" className="text-[10px]">Required</Badge>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {group.modifiers.map((m) => m.name).join(' · ')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {group.products.length} product{group.products.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((product) => (
          <Card key={product.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">
                  {product.image ? (
                    <img src={product.image} alt="" className="h-full w-full object-cover rounded-xl" />
                  ) : (
                    <Package className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                    {product.isOutOfStock && <Badge variant="warning">Out of stock</Badge>}
                    {!product.isActive && <Badge variant="danger">Inactive</Badge>}
                  </div>
                  {product.category && (
                    <p className="text-xs text-gray-500">{product.category.name}</p>
                  )}
                  <p className="text-sm font-semibold text-brand-600 mt-1">
                    {formatCurrency(product.price)}
                  </p>
                  {product.sku && <p className="text-xs text-gray-400">SKU: {product.sku}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Product Modal */}
      <Modal isOpen={showProductModal} onClose={() => setShowProductModal(false)} title="Add Product">
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <Input label="SKU (optional)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Saving...' : 'Save Product'}</Button>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} title="Add Category">
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <Input label="Name" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input type="color" value={categoryForm.color} onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })} className="h-10 w-20 rounded border border-gray-300 cursor-pointer" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Saving...' : 'Save Category'}</Button>
        </form>
      </Modal>

      {/* Modifier Group Modal */}
      <Modal
        isOpen={showModifierModal}
        onClose={() => setShowModifierModal(false)}
        title={editingModGroup ? 'Edit Modifier Group' : 'New Modifier Group'}
        className="max-w-lg"
      >
        <form onSubmit={handleSaveModGroup} className="space-y-4">
          <Input
            label="Group Name (e.g. Size, Sugar Level)"
            value={modGroupForm.name}
            onChange={(e) => setModGroupForm({ ...modGroupForm, name: e.target.value })}
            placeholder="e.g. Size, Sugar Level, Ice Level"
            required
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={modGroupForm.isRequired}
              onChange={(e) => setModGroupForm({ ...modGroupForm, isRequired: e.target.checked })}
              className="rounded border-gray-300"
            />
            Customer must choose one (required)
          </label>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Options</p>
              <button type="button" onClick={addModifierRow} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                + Add option
              </button>
            </div>
            <div className="space-y-2">
              {modGroupForm.modifiers.map((mod, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Option name"
                    value={mod.name}
                    onChange={(e) => updateModifier(idx, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <div className="w-28">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="+$0.00"
                      value={mod.priceAdjustment || ''}
                      onChange={(e) => updateModifier(idx, 'priceAdjustment', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  {modGroupForm.modifiers.length > 1 && (
                    <button type="button" onClick={() => removeModifierRow(idx)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Assign to products */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Apply to products</p>
            <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-gray-200 p-2">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modGroupForm.productIds.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-gray-700">{p.name}</span>
                  <span className="text-gray-400 ml-auto text-xs">{formatCurrency(p.price)}</span>
                </label>
              ))}
              {products.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No products yet</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Saving...' : editingModGroup ? 'Update' : 'Create'}
            </Button>
            {editingModGroup && (
              <Button
                type="button"
                variant="outline"
                onClick={() => { deleteModGroup(editingModGroup.id); setShowModifierModal(false) }}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  )
}
