'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { formatCurrency, cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
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
  parentId: string | null
  children?: Category[]
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
  const { t, bilingual, lang } = useI18n()
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

  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#6366f1', parentId: '' })
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] = useState<Category | null>(null)
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
    const payload = {
      ...(editingCategoryId && { id: editingCategoryId }),
      name: categoryForm.name,
      color: categoryForm.color,
      parentId: categoryForm.parentId || null,
    }
    await fetch('/api/categories', {
      method: editingCategoryId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setShowCategoryModal(false)
    setCategoryForm({ name: '', color: '#6366f1', parentId: '' })
    setEditingCategoryId(null)
    loadData()
    setLoading(false)
  }

  function openEditCategory(cat: Category) {
    setEditingCategoryId(cat.id)
    setCategoryForm({ name: cat.name, color: cat.color || '#6366f1', parentId: cat.parentId || '' })
    setShowCategoryModal(true)
  }

  async function handleDeleteCategory() {
    if (!showDeleteCategoryConfirm) return
    await fetch(`/api/categories?id=${showDeleteCategoryConfirm.id}`, { method: 'DELETE' })
    setShowDeleteCategoryConfirm(null)
    loadData()
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

  const [titleMain, titleSub] = bilingual('products.title')

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className={cn('text-xl sm:text-2xl font-bold text-gray-900', lang === 'km' && 'font-khmer')}>
            {titleMain}
            <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{titleSub}</span>
          </h1>
          <p className="text-sm text-gray-500">{products.length} {t('products.count')}</p>
        </div>
        <div className="flex gap-1.5 sm:gap-2 shrink-0">
          <Button variant="outline" onClick={() => setShowCategoryModal(true)} size="sm" className="hidden sm:inline-flex">
            <Plus className="h-4 w-4 mr-1" /> {t('products.addCategory')}
          </Button>
          <Button onClick={openCreate} size="sm" className="sm:hidden">
            <Plus className="h-4 w-4" />
          </Button>
          <Button onClick={openCreate} className="hidden sm:inline-flex">
            <Plus className="h-4 w-4 mr-1" /> {t('products.add')}
          </Button>
        </div>
      </div>

      {/* Mobile category add button */}
      <button onClick={() => setShowCategoryModal(true)} className="sm:hidden text-xs text-brand-600 font-medium">
        + {t('products.addCategory')}
      </button>

      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap overflow-x-auto">
          {categories.filter((c) => !c.parentId).map((cat) => (
            <div key={cat.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm group">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color || '#6366f1' }} />
                <span className="font-medium">{cat.name}</span>
                <button onClick={() => openEditCategory(cat)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded" title={t('common.edit')}>
                  <Edit2 className="h-3 w-3 text-gray-400" />
                </button>
                <button onClick={() => setShowDeleteCategoryConfirm(cat)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-50 rounded" title={t('common.delete')}>
                  <Trash2 className="h-3 w-3 text-red-400" />
                </button>
              </div>
              {cat.children && cat.children.length > 0 && (
                <div className="flex gap-1.5 ml-4 flex-wrap">
                  {cat.children.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 border border-gray-150 text-xs group/sub">
                      {sub.name}
                      <button onClick={() => openEditCategory(sub)} className="opacity-0 group-hover/sub:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded" title={t('common.edit')}>
                        <Edit2 className="h-2.5 w-2.5 text-gray-400" />
                      </button>
                      <button onClick={() => setShowDeleteCategoryConfirm(sub)} className="opacity-0 group-hover/sub:opacity-100 transition-opacity p-0.5 hover:bg-red-50 rounded" title={t('common.delete')}>
                        <Trash2 className="h-2.5 w-2.5 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder={t('products.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-2 sm:gap-3">
        {filtered.map((product) => {
          const availableSizes = (product.sizes as any[])?.filter((s: any) => s.price !== null) || []
          return (
            <Card key={product.id}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    {product.image ? (
                      <img src={product.image} alt="" className="h-full w-full object-cover rounded-lg" />
                    ) : (
                      <Package className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
                      {product.isOutOfStock && <Badge variant="warning" className="text-[9px] shrink-0">{t('products.outOfStock')}</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      {product.category && <span>{product.category.name}</span>}
                      {product.category && (availableSizes.length > 0 || product.price) && <span>·</span>}
                      {availableSizes.length > 0 ? (
                        <span className="font-semibold text-brand-600">
                          {availableSizes.map((s: any) => `${s.name} ${formatCurrency(s.price)}`).join(' / ')}
                        </span>
                      ) : (
                        <span className="font-semibold text-brand-600">{formatCurrency(product.price)}</span>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-0.5 shrink-0">
                    <button
                      onClick={() => openEdit(product)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      title={t('products.edit')}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(product)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title={t('products.deleteProduct')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {/* Badges row */}
                {(product.hasSugarLevel || availableSizes.length > 0 || product.discountType) && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {product.hasSugarLevel && <Badge variant="info" className="text-[9px]">{t('products.hasSugar')}</Badge>}
                    {availableSizes.length > 0 && <Badge variant="default" className="text-[9px]">{t('products.hasSize')}</Badge>}
                    {product.discountType && (
                      <Badge variant="success" className="text-[9px]">
                        {product.discountType === 'percentage' ? `${product.discountValue}%` : `$${product.discountValue}`} off
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create / Edit Product Modal */}
      <Modal isOpen={showProductModal} onClose={() => setShowProductModal(false)} title={editingId ? t('products.edit') : t('products.add')} className="max-w-lg">
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <Input label={t('products.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label={t('income.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <div className="grid grid-cols-2 gap-3">
            <Input label={t('products.basePrice')} type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <Input label={t('products.sku')} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.category')}</label>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="">{t('products.noCategory')}</option>
              {categories.filter((c) => !c.parentId).map((c) => (
                <optgroup key={c.id} label={c.name}>
                  <option value={c.id}>{c.name}</option>
                  {c.children?.map((sub) => (
                    <option key={sub.id} value={sub.id}>↳ {sub.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={form.hasSugarLevel} onChange={(e) => setForm({ ...form, hasSugarLevel: e.target.checked })} className="rounded border-gray-300 h-4 w-4" />
            <div>
              <p className="text-sm font-medium text-gray-900">{t('products.hasSugar')}</p>
              <p className="text-xs text-gray-400">{t('products.sugarDesc')}</p>
            </div>
          </label>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <label className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={form.hasSize} onChange={(e) => setForm({ ...form, hasSize: e.target.checked })} className="rounded border-gray-300 h-4 w-4" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('products.hasSize')}</p>
                <p className="text-xs text-gray-400">{t('products.sizeDesc')}</p>
              </div>
            </label>

            {form.hasSize && (
              <div className="border-t border-gray-100 px-4 py-3 space-y-2 bg-gray-50">
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium px-1">
                  <span className="flex-1">{t('products.sizeName')}</span>
                  <span className="w-28">{t('products.priceDollar')}</span>
                  <span className="w-8" />
                </div>
                {form.sizes.map((size, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input value={size.name} onChange={(e) => updateSize(idx, 'name', e.target.value)} placeholder="e.g. S, M, L" className="flex-1" />
                    <Input type="number" step="0.01" value={size.price} onChange={(e) => updateSize(idx, 'price', e.target.value)} placeholder={t('products.notAvailable')} className="w-28" />
                    {form.sizes.length > 1 && (
                      <button type="button" onClick={() => removeSizeRow(idx)} className="text-gray-400 hover:text-red-500 w-8 flex justify-center">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addSizeRow} className="text-xs text-brand-600 hover:text-brand-700 font-medium">{t('products.addSize')}</button>
              </div>
            )}
          </div>

          {/* Product Discount */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <label className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={form.hasDiscount} onChange={(e) => setForm({ ...form, hasDiscount: e.target.checked })} className="rounded border-gray-300 h-4 w-4" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('products.productDiscount')}</p>
                <p className="text-xs text-gray-400">{t('products.discountDesc')}</p>
              </div>
            </label>
            {form.hasDiscount && (
              <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm({ ...form, discountType: 'percentage' })} className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium ${form.discountType === 'percentage' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'}`}>
                    {t('products.percentage')}
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, discountType: 'fixed' })} className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium ${form.discountType === 'fixed' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'}`}>
                    {t('products.fixed')}
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
            {loading ? t('products.saving') : editingId ? t('products.updateProduct') : t('products.saveProduct')}
          </Button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title={t('products.deleteProduct')}>
        {showDeleteConfirm && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t('products.deleteConfirmMsg')} <strong>{showDeleteConfirm.name}</strong>
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteProduct}
              >
                {t('products.deleteProduct')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit Category Modal */}
      <Modal isOpen={showCategoryModal} onClose={() => { setShowCategoryModal(false); setEditingCategoryId(null); setCategoryForm({ name: '', color: '#6366f1', parentId: '' }) }} title={editingCategoryId ? t('products.editCategory') : t('products.addCategory')}>
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.parentCategory')}</label>
            <select
              value={categoryForm.parentId}
              onChange={(e) => setCategoryForm({ ...categoryForm, parentId: e.target.value })}
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">{t('products.noParent')}</option>
              {categories.filter((c) => !c.parentId && c.id !== editingCategoryId).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Input label={t('products.categoryName')} value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.categoryColor')}</label>
            <input type="color" value={categoryForm.color} onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })} className="h-10 w-20 rounded border border-gray-300 cursor-pointer" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? t('products.saving') : t('products.saveCategory')}</Button>
        </form>
      </Modal>

      {/* Delete Category Confirm */}
      <Modal isOpen={!!showDeleteCategoryConfirm} onClose={() => setShowDeleteCategoryConfirm(null)} title={t('products.deleteCategory')}>
        {showDeleteCategoryConfirm && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('products.deleteCategoryConfirm')}</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteCategoryConfirm(null)}>
                {t('common.cancel')}
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteCategory}>
                {t('common.delete')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
