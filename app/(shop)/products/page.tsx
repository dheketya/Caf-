'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { formatCurrency } from '@/lib/utils'
import { Plus, Search, Package, Trash2, Edit2 } from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  sku: string | null
  image: string | null
  isActive: boolean
  isOutOfStock: boolean
  hasSugarLevel: boolean
  sizes: { name: string; price: number | null }[] | null
  discountType: string | null
  discountValue: number | null
  category: { id: string; name: string } | null
}

interface Category {
  id: string
  name: string
  color: string | null
}

interface SizeEntry {
  name: string
  price: string
}

const DEFAULT_SIZES: SizeEntry[] = [
  { name: 'S', price: '' },
  { name: 'M', price: '' },
  { name: 'L', price: '' },
]

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [showProductModal, setShowProductModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Product | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    sku: '',
    categoryId: '',
    hasSugarLevel: false,
    hasSize: false,
    sizes: DEFAULT_SIZES as SizeEntry[],
    hasDiscount: false,
    discountType: 'percentage' as string,
    discountValue: '',
  })

  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#6366f1' })
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [prods, cats] = await Promise.all([
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
    ])
    setProducts(prods)
    setCategories(cats)
  }

  function resetForm() {
    setEditingId(null)
    setForm({
      name: '', description: '', price: '', sku: '', categoryId: '',
      hasSugarLevel: false, hasSize: false, sizes: DEFAULT_SIZES.map((s) => ({ ...s })),
      hasDiscount: false, discountType: 'percentage', discountValue: '',
    })
  }

  function openCreate() {
    resetForm()
    setShowProductModal(true)
  }

  function openEdit(product: Product) {
    const productSizes = (product.sizes as { name: string; price: number | null }[]) || []
    setEditingId(product.id)
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      sku: product.sku || '',
      categoryId: product.category?.id || '',
      hasSugarLevel: product.hasSugarLevel,
      hasSize: productSizes.length > 0,
      sizes: productSizes.length > 0
        ? productSizes.map((s) => ({ name: s.name, price: s.price !== null ? s.price.toString() : '' }))
        : DEFAULT_SIZES.map((s) => ({ ...s })),
      hasDiscount: !!product.discountType,
      discountType: product.discountType || 'percentage',
      discountValue: product.discountValue?.toString() || '',
    })
    setShowProductModal(true)
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const sizes = form.hasSize
      ? form.sizes.map((s) => ({ name: s.name, price: s.price ? parseFloat(s.price) : null }))
      : null

    const payload = {
      name: form.name,
      description: form.description || undefined,
      price: parseFloat(form.price),
      sku: form.sku || undefined,
      categoryId: form.categoryId || undefined,
      hasSugarLevel: form.hasSugarLevel,
      sizes,
      discountType: form.hasDiscount ? form.discountType : null,
      discountValue: form.hasDiscount && form.discountValue ? parseFloat(form.discountValue) : null,
    }

    if (editingId) {
      await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...payload }),
      })
    } else {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    setShowProductModal(false)
    resetForm()
    loadData()
    setLoading(false)
  }

  async function handleDeleteProduct() {
    if (!showDeleteConfirm) return
    await fetch(`/api/products?id=${showDeleteConfirm.id}`, { method: 'DELETE' })
    setShowDeleteConfirm(null)
    loadData()
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

  function addSizeRow() {
    setForm((f) => ({ ...f, sizes: [...f.sizes, { name: '', price: '' }] }))
  }

  function removeSizeRow(idx: number) {
    setForm((f) => ({ ...f, sizes: f.sizes.filter((_, i) => i !== idx) }))
  }

  function updateSize(idx: number, field: 'name' | 'price', value: string) {
    setForm((f) => ({
      ...f,
      sizes: f.sizes.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }))
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
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Product
          </Button>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color || '#6366f1' }} />
              {cat.name}
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((product) => {
          const availableSizes = (product.sizes as any[])?.filter((s: any) => s.price !== null) || []
          return (
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
                    </div>
                    {product.category && (
                      <p className="text-xs text-gray-500">{product.category.name}</p>
                    )}
                    {availableSizes.length > 0 ? (
                      <div className="flex gap-2 mt-1">
                        {availableSizes.map((s: any) => (
                          <span key={s.name} className="text-xs text-gray-600">
                            <span className="font-medium">{s.name}</span> {formatCurrency(s.price)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-brand-600 mt-1">{formatCurrency(product.price)}</p>
                    )}
                    <div className="flex gap-1.5 mt-1">
                      {product.hasSugarLevel && <Badge variant="info" className="text-[10px]">Sugar</Badge>}
                      {availableSizes.length > 0 && <Badge variant="default" className="text-[10px]">Sizes</Badge>}
                      {product.discountType && (
                        <Badge variant="success" className="text-[10px]">
                          {product.discountType === 'percentage' ? `${product.discountValue}% off` : `$${product.discountValue} off`}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(product)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(product)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create / Edit Product Modal */}
      <Modal isOpen={showProductModal} onClose={() => setShowProductModal(false)} title={editingId ? 'Edit Product' : 'Add Product'} className="max-w-lg">
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Base Price ($)" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <Input label="SKU (optional)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={form.hasSugarLevel} onChange={(e) => setForm({ ...form, hasSugarLevel: e.target.checked })} className="rounded border-gray-300 h-4 w-4" />
            <div>
              <p className="text-sm font-medium text-gray-900">Has Sugar Level</p>
              <p className="text-xs text-gray-400">Customer can choose sugar level (set in Settings)</p>
            </div>
          </label>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <label className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={form.hasSize} onChange={(e) => setForm({ ...form, hasSize: e.target.checked })} className="rounded border-gray-300 h-4 w-4" />
              <div>
                <p className="text-sm font-medium text-gray-900">Has Size</p>
                <p className="text-xs text-gray-400">Define sizes with prices. Leave price empty if not available.</p>
              </div>
            </label>

            {form.hasSize && (
              <div className="border-t border-gray-100 px-4 py-3 space-y-2 bg-gray-50">
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium px-1">
                  <span className="flex-1">Size Name</span>
                  <span className="w-28">Price ($)</span>
                  <span className="w-8" />
                </div>
                {form.sizes.map((size, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input value={size.name} onChange={(e) => updateSize(idx, 'name', e.target.value)} placeholder="e.g. S, M, L" className="flex-1" />
                    <Input type="number" step="0.01" value={size.price} onChange={(e) => updateSize(idx, 'price', e.target.value)} placeholder="Not available" className="w-28" />
                    {form.sizes.length > 1 && (
                      <button type="button" onClick={() => removeSizeRow(idx)} className="text-gray-400 hover:text-red-500 w-8 flex justify-center">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addSizeRow} className="text-xs text-brand-600 hover:text-brand-700 font-medium">+ Add size</button>
              </div>
            )}
          </div>

          {/* Product Discount */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <label className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={form.hasDiscount} onChange={(e) => setForm({ ...form, hasDiscount: e.target.checked })} className="rounded border-gray-300 h-4 w-4" />
              <div>
                <p className="text-sm font-medium text-gray-900">Product Discount</p>
                <p className="text-xs text-gray-400">Apply a special discount to this product</p>
              </div>
            </label>
            {form.hasDiscount && (
              <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm({ ...form, discountType: 'percentage' })} className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium ${form.discountType === 'percentage' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'}`}>
                    Percentage (%)
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, discountType: 'fixed' })} className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium ${form.discountType === 'fixed' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'}`}>
                    Fixed ($)
                  </button>
                </div>
                <Input
                  type="number"
                  step={form.discountType === 'percentage' ? '1' : '0.01'}
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  placeholder={form.discountType === 'percentage' ? 'e.g. 20' : 'e.g. 1.00'}
                  className="w-32"
                />
                {form.discountValue && form.price && (
                  <p className="text-xs text-green-600">
                    {form.discountType === 'percentage'
                      ? `${form.discountValue}% off → $${(parseFloat(form.price) * (1 - parseFloat(form.discountValue) / 100)).toFixed(2)}`
                      : `$${form.discountValue} off → $${(parseFloat(form.price) - parseFloat(form.discountValue)).toFixed(2)}`
                    }
                  </p>
                )}
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : editingId ? 'Update Product' : 'Save Product'}
          </Button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Delete Product">
        {showDeleteConfirm && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>? This product will be removed from the POS and product list.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteProduct}
              >
                Delete Product
              </Button>
            </div>
          </div>
        )}
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
    </div>
  )
}
