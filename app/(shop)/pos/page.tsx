'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { cn, formatCurrency, toKHR } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  Banknote, QrCode, Printer, UserPlus, X,
} from 'lucide-react'

interface SizeOption {
  name: string
  price: number | null
}

interface Product {
  id: string
  name: string
  price: number
  image: string | null
  isOutOfStock: boolean
  hasSugarLevel: boolean
  sizes: SizeOption[] | null
  discountType: string | null
  discountValue: number | null
  category: { id: string; name: string; color: string | null } | null
}

interface CartItem {
  id: string
  product: Product
  quantity: number
  notes: string
  sizeName: string | null
  originalPrice: number
  sizePrice: number // final price after product discount
  sugarLevel: string | null
}

interface Category {
  id: string
  name: string
  color: string | null
  parentId: string | null
  children?: Category[]
}

interface ShopInfo {
  sugarLevels: string[] | null
  exchangeRate: number
  name: string
  phone: string
  address: string
  loyaltyEnabled: boolean
  loyaltyTarget: number
  loyaltyDiscountType: string
  loyaltyDiscountValue: number
}

function cartItemKey(productId: string, sizeName: string | null, sugarLevel: string | null): string {
  return `${productId}:${sizeName || '-'}:${sugarLevel || '-'}`
}

function applyProductDiscount(price: number, discountType: string | null, discountValue: number | null): number {
  if (!discountType || !discountValue) return price
  if (discountType === 'percentage') return Math.max(0, price * (1 - discountValue / 100))
  return Math.max(0, price - discountValue)
}

function ProductCard({ product, onClick, shopInfo, t }: { product: Product; onClick: (p: Product) => void; shopInfo: ShopInfo; t: (k: string) => string }) {
  const availableSizes = (product.sizes as SizeOption[])?.filter((s) => s.price !== null) || []
  const rawPrice = availableSizes.length > 0
    ? Math.min(...availableSizes.map((s) => s.price!))
    : product.price
  const displayPrice = applyProductDiscount(rawPrice, product.discountType, product.discountValue)
  const hasProductDiscount = product.discountType && product.discountValue

  return (
    <button
      onClick={() => onClick(product)}
      disabled={product.isOutOfStock}
      className={cn(
        'relative rounded-xl border text-left transition-all hover:shadow-md flex flex-col p-3 h-[140px]',
        product.isOutOfStock ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200 hover:border-brand-300'
      )}
    >
      {product.isOutOfStock && <Badge variant="warning" className="absolute top-2 right-2 text-[10px]">{t('products.outOfStock')}</Badge>}
      {hasProductDiscount && !product.isOutOfStock && (
        <span className="absolute top-2 right-2 text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded">
          {product.discountType === 'percentage' ? `${product.discountValue}% ${t('pos.off')}` : `$${product.discountValue} ${t('pos.off')}`}
        </span>
      )}
      <div className="h-10 w-10 rounded-lg bg-gray-100 mb-2 flex items-center justify-center text-lg shrink-0">
        {product.image ? <img src={product.image} alt="" className="h-full w-full object-cover rounded-lg" /> : '☕'}
      </div>
      <p className="text-sm font-medium text-gray-900 truncate w-full">{product.name}</p>
      <div className="mt-auto">
        <div className="flex items-center gap-1.5">
          {hasProductDiscount && (
            <span className="text-[11px] text-gray-400 line-through">
              {formatCurrency(rawPrice)}
            </span>
          )}
          <p className={cn('text-sm font-semibold', hasProductDiscount ? 'text-red-600' : 'text-brand-600')}>
            {availableSizes.length > 0 ? `${t('pos.from')} ${formatCurrency(displayPrice)}` : formatCurrency(displayPrice)}
          </p>
        </div>
        <p className="text-[10px] text-gray-400">
          {availableSizes.length > 0 ? `${t('pos.from')} ${toKHR(displayPrice, shopInfo.exchangeRate)}` : toKHR(displayPrice, shopInfo.exchangeRate)}
        </p>
      </div>
    </button>
  )
}

export default function POSPage() {
  const { data: session } = useSession()
  const { t, bilingual, lang } = useI18n()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [shopInfo, setShopInfo] = useState<ShopInfo>({ sugarLevels: null, exchangeRate: 4100, name: '', phone: '', address: '', loyaltyEnabled: false, loyaltyTarget: 10, loyaltyDiscountType: 'percentage', loyaltyDiscountValue: 10 })
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [amountUsd, setAmountUsd] = useState('')
  const [amountKhr, setAmountKhr] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastOrder, setLastOrder] = useState<any>(null)
  const [showInvoice, setShowInvoice] = useState(false)
  const [showMobileCart, setShowMobileCart] = useState(false)
  const invoiceRef = useRef<HTMLDivElement>(null)

  // Customization modal
  const [customProduct, setCustomProduct] = useState<Product | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedSugar, setSelectedSugar] = useState<string | null>(null)

  // Customer
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [attachedCustomer, setAttachedCustomer] = useState<{ id: string; phone: string; name: string | null; totalVisits: number } | null>(null)
  const [customerSearching, setCustomerSearching] = useState(false)
  const [customerNotFound, setCustomerNotFound] = useState(false)

  // Discount
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | ''>('')
  const [discountValue, setDiscountValue] = useState('')

  const canDiscount = ['PLATFORM_OWNER', 'SHOP_OWNER', 'MANAGER'].includes(session?.user?.role || '')

  useEffect(() => {
    fetch('/api/products').then((r) => r.json()).then(setProducts)
    fetch('/api/categories').then((r) => r.json()).then(setCategories)
    fetch('/api/shops/me').then((r) => r.json()).then((shop) => {
      if (shop && !shop.error) {
        setShopInfo({
          sugarLevels: (shop.sugarLevels as string[])?.length > 0
            ? shop.sugarLevels
            : ['0%', '25%', '50%', '75%', '100%'],
          exchangeRate: shop.exchangeRate || 4100,
          name: shop.name || '',
          phone: shop.phone || '',
          address: shop.address || '',
          loyaltyEnabled: shop.loyaltyEnabled ?? false,
          loyaltyTarget: shop.loyaltyTarget || 10,
          loyaltyDiscountType: shop.loyaltyDiscountType || 'percentage',
          loyaltyDiscountValue: shop.loyaltyDiscountValue || 10,
        })
      }
    })
  }, [])

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    if (!activeCategory) return matchesSearch
    // Match direct category or parent category (show all sub-category products)
    const parentCat = categories.find((c) => c.id === activeCategory)
    const childIds = parentCat?.children?.map((c) => c.id) || []
    const matchesCategory = p.category?.id === activeCategory || childIds.includes(p.category?.id || '')
    return matchesSearch && matchesCategory
  })

  const handleProductClick = useCallback((product: Product) => {
    if (product.isOutOfStock) return

    const availableSizes = (product.sizes as SizeOption[])?.filter((s) => s.price !== null) || []
    const needsCustomization = product.hasSugarLevel || availableSizes.length > 0

    if (needsCustomization) {
      setCustomProduct(product)
      setSelectedSize(availableSizes.length > 0 ? availableSizes[0].name : null)
      setSelectedSugar(product.hasSugarLevel && shopInfo.sugarLevels?.length ? shopInfo.sugarLevels[0] : null)
    } else {
      addToCart(product, null, product.price, null)
    }
  }, [shopInfo])

  function addToCart(product: Product, sizeName: string | null, price: number, sugarLevel: string | null) {
    const key = cartItemKey(product.id, sizeName, sugarLevel)
    const discountedPrice = applyProductDiscount(price, product.discountType, product.discountValue)
    setCart((prev) => {
      const existing = prev.find((item) => item.id === key)
      if (existing) {
        return prev.map((item) => item.id === key ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { id: key, product, quantity: 1, notes: '', sizeName, originalPrice: price, sizePrice: discountedPrice, sugarLevel }]
    })
  }

  function confirmCustomization() {
    if (!customProduct) return
    const availableSizes = (customProduct.sizes as SizeOption[])?.filter((s) => s.price !== null) || []

    let price = customProduct.price
    if (selectedSize && availableSizes.length > 0) {
      const size = availableSizes.find((s) => s.name === selectedSize)
      if (size?.price != null) price = size.price
    }

    addToCart(customProduct, selectedSize, price, selectedSugar)
    setCustomProduct(null)
  }

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => item.id === itemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)
        .filter((item) => item.quantity > 0)
    )
  }

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.sizePrice * item.quantity, 0)

  // Check loyalty reward eligibility
  // This order is visit (totalVisits + 1), so reward triggers when (totalVisits + 1) hits the target
  const nextVisit = (attachedCustomer?.totalVisits ?? 0) + 1
  const loyaltyEligible = shopInfo.loyaltyEnabled
    && attachedCustomer
    && nextVisit % shopInfo.loyaltyTarget === 0

  // Calculate discounts — product discounts are already in sizePrice
  // Loyalty and manual discounts apply on top of the subtotal (which already has product discounts)
  let loyaltyDiscountAmount = 0
  let manualDiscountAmount = 0

  if (loyaltyEligible) {
    loyaltyDiscountAmount = shopInfo.loyaltyDiscountType === 'percentage'
      ? subtotal * (shopInfo.loyaltyDiscountValue / 100)
      : shopInfo.loyaltyDiscountValue
  }

  if (discountType && discountValue) {
    const val = parseFloat(discountValue)
    manualDiscountAmount = discountType === 'percentage' ? subtotal * (val / 100) : val
  }

  const discountAmount = loyaltyDiscountAmount + manualDiscountAmount
  const total = Math.max(0, subtotal - discountAmount)

  // Dual currency tendered: convert KHR to USD and sum
  const usdPart = parseFloat(amountUsd) || 0
  const khrPart = parseFloat(amountKhr) || 0
  const khrAsUsd = khrPart / shopInfo.exchangeRate
  const totalTendered = usdPart + khrAsUsd
  const changeUsd = totalTendered - total

  async function lookupCustomer() {
    if (!customerPhone.trim()) return
    setCustomerSearching(true)
    setCustomerNotFound(false)
    const res = await fetch(`/api/customers?phone=${encodeURIComponent(customerPhone.trim())}`)
    const data = await res.json()
    if (data && data.id) {
      setAttachedCustomer(data)
      setCustomerName(data.name || '')
    } else {
      setCustomerNotFound(true)
    }
    setCustomerSearching(false)
  }

  async function createNewCustomer() {
    if (!customerPhone.trim()) return
    setCustomerSearching(true)
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: customerPhone.trim(), name: customerName.trim() || undefined }),
    })
    const created = await res.json()
    if (created.id) {
      setAttachedCustomer(created)
      setCustomerNotFound(false)
    }
    setCustomerSearching(false)
  }

  async function handleCompleteSale() {
    if (!paymentMethod || cart.length === 0) return
    setLoading(true)
    setError('')

    try {
      // Auto-create/find customer if phone was entered but not attached
      let customerId = attachedCustomer?.id
      if (!customerId && customerPhone.trim()) {
        const custRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: customerPhone.trim(), name: customerName.trim() || undefined }),
        })
        const custData = await custRes.json()
        if (custData.id) customerId = custData.id
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.sizePrice,
            originalPrice: item.originalPrice !== item.sizePrice ? item.originalPrice : undefined,
            sizeName: item.sizeName || undefined,
            sugarLevel: item.sugarLevel || undefined,
            notes: item.notes || undefined,
          })),
          discountType: discountAmount > 0 ? 'fixed' : undefined,
          discountValue: discountAmount > 0 ? discountAmount : undefined,
          discountReason: [
            loyaltyDiscountAmount > 0 ? `${t('pos.loyaltyLabel')} (-${formatCurrency(loyaltyDiscountAmount)})` : '',
            manualDiscountAmount > 0 ? `${t('pos.manualDiscount')} (-${formatCurrency(manualDiscountAmount)})` : '',
          ].filter(Boolean).join(' + ') || undefined,
          paymentMethod,
          amountTendered: totalTendered > 0 ? totalTendered : undefined,
          customerId: customerId || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create order'); setLoading(false); return }

      setLastOrder(data)
      setCart([])
      setShowPayment(false)
      setPaymentMethod('')
      setAmountUsd('')
      setAmountKhr('')
      setDiscountType('')
      setDiscountValue('')
      setAttachedCustomer(null)
      setCustomerPhone('')
      setCustomerName('')
      setCustomerNotFound(false)
    } catch { setError('Failed to create order') }
    setLoading(false)
  }

  function printInvoice() {
    setShowInvoice(true)
  }

  function handlePrint() {
    const content = invoiceRef.current
    if (!content) return
    const printWindow = window.open('', '', 'width=800,height=900')
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t('pos.invoice')}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; max-width: 300px; margin: 0 auto; padding: 16px; font-size: 12px; color: #000; }
  .text-center, [class*="text-center"] { text-align: center; }
  .text-right, [class*="text-right"] { text-align: right; }
  .text-lg { font-size: 16px; }
  .text-base { font-size: 14px; }
  .text-sm { font-size: 12px; }
  .text-xs { font-size: 10px; }
  .text-\\[10px\\], .text-\\[11px\\] { font-size: 10px; }
  .font-extrabold { font-weight: 800; }
  .font-semibold { font-weight: 600; }
  .font-bold { font-weight: 700; }
  .text-gray-900 { color: #111; }
  .text-gray-500 { color: #666; }
  .text-gray-400 { color: #999; }
  .text-green-600 { color: #16a34a; }
  .line-through { text-decoration: line-through; }
  hr { border: none; border-top: 1px dashed #ccc; margin: 8px 0; }
  .flex { display: flex; }
  .justify-between { justify-content: space-between; }
  .items-baseline { align-items: baseline; }
  .gap-3 { gap: 8px; }
  .space-y-2 > * + * { margin-top: 6px; }
  .space-y-0\\.5 > * + * { margin-top: 2px; }
  .py-1 { padding-top: 4px; padding-bottom: 4px; }
  .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
  .pt-1 { padding-top: 4px; }
  .mt-1 { margin-top: 4px; }
  .mt-3 { margin-top: 10px; }
  .my-2 { margin-top: 6px; margin-bottom: 6px; }
  .my-3 { margin-top: 10px; margin-bottom: 10px; }
  .pb-3 { padding-bottom: 10px; }
  .p-3 { padding: 8px; }
  .ml-1 { margin-left: 4px; }
  .mr-1\\.5 { margin-right: 4px; }
  .border-t-2 { border-top: 2px solid #111; }
  .border-b { border-bottom: 1px solid #f0f0f0; }
  .border-dashed { border-style: dashed; }
  .border-gray-300 { border-color: #ccc; }
  .border-gray-900 { border-color: #111; }
  .border-gray-50 { border-color: #f8f8f8; }
  .bg-gray-50 { background: #f8f8f8; }
  .rounded-lg { border-radius: 6px; }
  .last\\:border-0:last-child { border-bottom: none; }
</style>
</head><body>${content.innerHTML}</body></html>`)
    printWindow.document.close()
    printWindow.onload = () => { printWindow.print(); printWindow.close() }
  }

  // Computed for customization modal
  const customAvailableSizes = customProduct ? (customProduct.sizes as SizeOption[])?.filter((s) => s.price !== null) || [] : []
  const customRawPrice = (() => {
    if (!customProduct) return 0
    if (selectedSize && customAvailableSizes.length > 0) {
      const s = customAvailableSizes.find((s) => s.name === selectedSize)
      return s?.price ?? customProduct.price
    }
    return customProduct.price
  })()
  const customPrice = customProduct ? applyProductDiscount(customRawPrice, customProduct.discountType, customProduct.discountValue) : 0
  const customHasDiscount = customProduct?.discountType && customProduct?.discountValue

  // Payment method labels for invoice
  const payLabel: Record<string, string> = {
    CASH: t('pos.cash'),
    QR_EWALLET: t('pos.bank'),
    SPLIT: t('pos.cashAndBank'),
  }

  return (
    <div className="flex flex-col xl:flex-row gap-4 xl:gap-6 h-[calc(100vh-5rem)] xl:h-[calc(100vh-7rem)]">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder={t('pos.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>

        <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
          <button onClick={() => setActiveCategory(null)} className={cn('px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors', !activeCategory ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>{t('pos.all')}</button>
          {categories.filter((c) => !c.parentId).map((cat) => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={cn('px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors', activeCategory === cat.id || cat.children?.some((s) => s.id === activeCategory) ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>{cat.name}</button>
          ))}
        </div>
        {/* Sub-category row */}
        {(() => {
          const activeCat = activeCategory ? categories.find((c) => c.id === activeCategory) : null
          // Show sub-cats if a parent is active, or if a sub-cat is active (show siblings)
          const parentCat = activeCat?.parentId ? categories.find((c) => c.id === activeCat.parentId) : activeCat
          const subs = parentCat?.children || []
          if (subs.length === 0) return null
          return (
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
              <button onClick={() => setActiveCategory(parentCat!.id)} className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors', activeCategory === parentCat!.id ? 'bg-brand-100 text-brand-700 border border-brand-300' : 'bg-gray-50 text-gray-500 hover:bg-gray-100')}>{t('pos.all')}</button>
              {subs.map((sub) => (
                <button key={sub.id} onClick={() => setActiveCategory(sub.id)} className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors', activeCategory === sub.id ? 'bg-brand-100 text-brand-700 border border-brand-300' : 'bg-gray-50 text-gray-500 hover:bg-gray-100')}>{sub.name}</button>
              ))}
            </div>
          )
        })()}

        <div className="overflow-y-auto flex-1">
          {(() => {
            // Group products by sub-category when a parent category is active
            const activeCat = activeCategory ? categories.find((c) => c.id === activeCategory) : null
            const hasSubCategories = activeCat && !activeCat.parentId && activeCat.children && activeCat.children.length > 0

            if (hasSubCategories) {
              // Products directly in parent (no sub-category)
              const directProducts = filteredProducts.filter((p) => p.category?.id === activeCat.id)
              const sections = [
                ...(directProducts.length > 0 ? [{ label: activeCat.name, products: directProducts }] : []),
                ...activeCat.children!.map((sub) => ({
                  label: sub.name,
                  products: filteredProducts.filter((p) => p.category?.id === sub.id),
                })).filter((s) => s.products.length > 0),
              ]

              return sections.map((section) => (
                <div key={section.label} className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">{section.label}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {section.products.map((product) => <ProductCard key={product.id} product={product} onClick={handleProductClick} shopInfo={shopInfo} t={t} />)}
                  </div>
                </div>
              ))
            }

            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-min">
                {filteredProducts.map((product) => <ProductCard key={product.id} product={product} onClick={handleProductClick} shopInfo={shopInfo} t={t} />)}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Floating cart button - mobile/tablet only */}
      {!showMobileCart && (
        <button
          onClick={() => setShowMobileCart(true)}
          className="xl:hidden fixed bottom-4 right-4 z-30 flex items-center gap-2 bg-brand-600 text-white px-4 py-3 rounded-full shadow-lg hover:bg-brand-700 transition-colors"
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="font-semibold">{formatCurrency(total)}</span>
          {cart.length > 0 && (
            <span className="bg-white text-brand-600 text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>
      )}

      {/* Cart - desktop inline, mobile/tablet as overlay */}
      {showMobileCart && (
        <div className="xl:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowMobileCart(false)} />
        </div>
      )}
      <Card className={cn(
        'xl:w-80 xl:flex flex-col shrink-0',
        showMobileCart
          ? 'fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] rounded-b-none rounded-t-2xl flex'
          : 'hidden xl:flex'
      )}>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-gray-500" />
          <h2 className={cn('font-semibold text-gray-900', lang === 'km' && 'font-khmer')}>{t('pos.cart')}</h2>
          <Badge className="ml-auto">{cart.reduce((s, i) => s + i.quantity, 0)}</Badge>
          <button onClick={() => setShowMobileCart(false)} className="xl:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 ml-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <p className={cn('text-sm text-gray-400 text-center py-8', lang === 'km' && 'font-khmer')}>{t('pos.addItems')}</p>
          ) : cart.map((item) => (
            <div key={item.id} className="pb-3 border-b border-gray-50">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                  {(item.sizeName || item.sugarLevel) && (
                    <div className="flex gap-2 mt-0.5">
                      {item.sizeName && <span className="text-[11px] text-gray-500">{t('pos.size')}: <span className="font-medium text-gray-700">{item.sizeName}</span></span>}
                      {item.sugarLevel && <span className="text-[11px] text-gray-500">{t('pos.sugar')}: <span className="font-medium text-gray-700">{item.sugarLevel}</span></span>}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {item.originalPrice !== item.sizePrice && (
                      <span className="text-[11px] text-gray-400 line-through">{formatCurrency(item.originalPrice)}</span>
                    )}
                    <span className="text-xs text-gray-500">{formatCurrency(item.sizePrice)} · {toKHR(item.sizePrice, shopInfo.exchangeRate)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQuantity(item.id, -1)} className="h-7 w-7 rounded-md bg-gray-100 flex items-center justify-center hover:bg-gray-200"><Minus className="h-3 w-3" /></button>
                  <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="h-7 w-7 rounded-md bg-gray-100 flex items-center justify-center hover:bg-gray-200"><Plus className="h-3 w-3" /></button>
                  <button onClick={() => removeFromCart(item.id)} className="h-7 w-7 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {canDiscount && cart.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100">
            <div className="flex gap-2">
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)} className="text-xs rounded border border-gray-200 px-2 py-1">
                <option value="">{t('pos.noDiscount')}</option>
                <option value="percentage">%</option>
                <option value="fixed">{t('pos.fixed')}</option>
              </select>
              {discountType && <Input type="number" placeholder={discountType === 'percentage' ? '10' : '5.00'} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="h-7 text-xs" />}
            </div>
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-200 space-y-1">
          <div className="flex justify-between text-sm text-gray-500">
            <span>{t('pos.subtotal')}</span>
            <span className={discountAmount > 0 ? 'line-through text-gray-400' : ''}>{formatCurrency(subtotal)}</span>
          </div>
          {loyaltyDiscountAmount > 0 && (
            <div className="flex justify-between text-sm text-amber-600">
              <span>{t('pos.loyaltyLabel')} ({shopInfo.loyaltyDiscountType === 'percentage' ? `${shopInfo.loyaltyDiscountValue}%` : `$${shopInfo.loyaltyDiscountValue}`})</span>
              <span>-{formatCurrency(loyaltyDiscountAmount)}</span>
            </div>
          )}
          {manualDiscountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>{t('pos.discount')}</span>
              <span>-{formatCurrency(manualDiscountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-gray-900 pt-1"><span>{t('pos.total')}</span><span>{formatCurrency(total)}</span></div>
          <div className="flex justify-between text-xs text-gray-400"><span></span><span>{toKHR(total, shopInfo.exchangeRate)}</span></div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <Button className="w-full" size="lg" disabled={cart.length === 0} onClick={() => setShowPayment(true)}>{t('pos.charge')} {formatCurrency(total)}</Button>
        </div>
      </Card>

      {/* Customization Modal */}
      <Modal isOpen={!!customProduct} onClose={() => setCustomProduct(null)} title={`${t('pos.customize')}: ${customProduct?.name || ''}`}>
        {customProduct && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
                {customProduct.image ? <img src={customProduct.image} alt="" className="h-full w-full object-cover rounded-lg" /> : '☕'}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{customProduct.name}</p>
                <p className="text-sm text-brand-600 font-medium">{formatCurrency(customProduct.price)}</p>
              </div>
            </div>

            {/* Size selection */}
            {customAvailableSizes.length > 0 && (
              <div>
                <p className={cn('text-sm font-semibold text-gray-900 mb-2', lang === 'km' && 'font-khmer')}>{t('pos.size')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {customAvailableSizes.map((size) => {
                    const sizeDiscounted = applyProductDiscount(size.price!, customProduct!.discountType, customProduct!.discountValue)
                    const hasDsc = sizeDiscounted !== size.price!
                    return (
                      <button
                        key={size.name}
                        type="button"
                        onClick={() => setSelectedSize(size.name)}
                        className={cn(
                          'flex flex-col items-center rounded-lg border-2 px-3 py-2.5 transition-all',
                          selectedSize === size.name
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-gray-100 hover:border-gray-200 text-gray-700'
                        )}
                      >
                        <span className="text-base font-bold">{size.name}</span>
                        {hasDsc && <span className="text-[10px] text-gray-400 line-through">{formatCurrency(size.price!)}</span>}
                        <span className={cn('text-xs font-medium', hasDsc ? 'text-red-600' : selectedSize === size.name ? 'text-brand-600' : 'text-gray-400')}>
                          {formatCurrency(sizeDiscounted)}
                        </span>
                        <span className="text-[10px] text-gray-400">{toKHR(sizeDiscounted, shopInfo.exchangeRate)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Sugar level selection */}
            {customProduct.hasSugarLevel && shopInfo.sugarLevels && shopInfo.sugarLevels.length > 0 && (
              <div>
                <p className={cn('text-sm font-semibold text-gray-900 mb-2', lang === 'km' && 'font-khmer')}>{t('pos.selectSugar')}</p>
                <div className="flex flex-wrap gap-2">
                  {shopInfo.sugarLevels.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSelectedSugar(level)}
                      className={cn(
                        'px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                        selectedSugar === level
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-100 hover:border-gray-200 text-gray-700'
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className={cn('text-sm text-gray-500', lang === 'km' && 'font-khmer')}>{t('pos.itemPrice')}</span>
              <div className="text-right">
                {customHasDiscount && (
                  <span className="text-xs text-gray-400 line-through mr-2">{formatCurrency(customRawPrice)}</span>
                )}
                <span className={cn('text-lg font-bold', customHasDiscount ? 'text-red-600' : 'text-gray-900')}>{formatCurrency(customPrice)}</span>
                <p className="text-xs text-gray-400">{toKHR(customPrice, shopInfo.exchangeRate)}</p>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={confirmCustomization}>
              {t('pos.addToCart')}
            </Button>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={showPayment} onClose={() => setShowPayment(false)} title={t('pos.payment')}>
        <div className="space-y-3">
          <div className="text-center">
            {discountAmount > 0 && (
              <p className="text-sm text-gray-400 line-through">{formatCurrency(subtotal)}</p>
            )}
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)} <span className="text-sm font-normal text-gray-400">{toKHR(total, shopInfo.exchangeRate)}</span></p>
            {discountAmount > 0 && (
              <p className="text-xs text-green-600 font-medium">
                {loyaltyDiscountAmount > 0 && `${t('pos.loyaltyLabel')} -${formatCurrency(loyaltyDiscountAmount)}`}
                {loyaltyDiscountAmount > 0 && manualDiscountAmount > 0 && ' + '}
                {manualDiscountAmount > 0 && `${t('pos.discount')} -${formatCurrency(manualDiscountAmount)}`}
                {!loyaltyDiscountAmount && !manualDiscountAmount && `${t('pos.save')} ${formatCurrency(discountAmount)}`}
              </p>
            )}
          </div>

          {/* Customer */}
          <div className="rounded-lg border border-gray-200 p-2.5 space-y-2">
            <p className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
              <UserPlus className="h-3 w-3" /> {t('pos.customerOptional')}
            </p>
            {attachedCustomer ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{attachedCustomer.name || attachedCustomer.phone}</p>
                    <p className="text-xs text-gray-500">
                      {attachedCustomer.phone} · {attachedCustomer.totalVisits} {t('pos.visits')}
                      {shopInfo.loyaltyEnabled && !loyaltyEligible && (
                        <span className="text-gray-400"> · {shopInfo.loyaltyTarget - (nextVisit % shopInfo.loyaltyTarget)} {t('pos.toReward')}</span>
                      )}
                      {loyaltyEligible && (
                        <span className="text-amber-600 font-medium"> · #{nextVisit}!</span>
                      )}
                    </p>
                  </div>
                  <button onClick={() => { setAttachedCustomer(null); setCustomerPhone(''); setCustomerName('') }} className="text-gray-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {loyaltyEligible && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <span className="text-base">🎉</span>
                    <div className="flex-1">
                      <p className={cn('text-xs font-semibold text-amber-800', lang === 'km' && 'font-khmer')}>{t('pos.loyaltyReward')}</p>
                      <p className="text-[11px] text-amber-600">
                        {shopInfo.loyaltyDiscountType === 'percentage'
                          ? `${shopInfo.loyaltyDiscountValue}% ${t('pos.offThisOrder')}`
                          : `$${shopInfo.loyaltyDiscountValue} ${t('pos.offThisOrder')}`
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder={t('pos.customerPhone')}
                    value={customerPhone}
                    onChange={(e) => { setCustomerPhone(e.target.value); setCustomerNotFound(false) }}
                    className="flex-1"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookupCustomer() } }}
                  />
                  <Button variant="outline" size="sm" onClick={lookupCustomer} disabled={customerSearching || !customerPhone.trim()}>
                    {customerSearching ? '...' : t('pos.findCustomer')}
                  </Button>
                </div>
                {customerNotFound && (
                  <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 space-y-2">
                    <p className={cn('text-xs text-amber-700', lang === 'km' && 'font-khmer')}>{t('pos.customerNotFound')}</p>
                    <Input
                      placeholder={t('customers.nameOptional')}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                    <Button size="sm" onClick={createNewCustomer} disabled={customerSearching} className="w-full">
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> {t('pos.newCustomer')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'CASH', label: t('pos.cash'), icon: <Banknote className="h-4 w-4" /> },
              { value: 'QR_EWALLET', label: t('pos.bank'), icon: <QrCode className="h-4 w-4" /> },
              { value: 'SPLIT', label: t('pos.cashAndBank'), icon: <><Banknote className="h-3.5 w-3.5" /><QrCode className="h-3.5 w-3.5" /></> },
            ].map((method) => (
              <button key={method.value} onClick={() => setPaymentMethod(method.value)} className={cn('flex items-center justify-center gap-1 py-2 rounded-lg border-2 transition-colors', paymentMethod === method.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-gray-300 text-gray-600')}>
                {method.icon}<span className="text-xs font-medium">{method.label}</span>
              </button>
            ))}
          </div>
          {(paymentMethod === 'CASH' || paymentMethod === 'SPLIT') && (
            <div className="space-y-2">
              {/* Exact buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setAmountUsd(total.toFixed(2)); setAmountKhr('') }}
                  className="py-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold shadow-sm hover:shadow-md transition-all"
                >
                  <span className="text-green-200 text-[9px] font-medium block leading-none">{t('pos.exact')} USD</span>
                  <span className="text-base">${total.toFixed(2)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setAmountKhr(Math.round(total * shopInfo.exchangeRate).toString()); setAmountUsd('') }}
                  className="py-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold shadow-sm hover:shadow-md transition-all"
                >
                  <span className="text-blue-200 text-[9px] font-medium block leading-none">{t('pos.exact')} KHR</span>
                  <span className="text-base">{toKHR(total, shopInfo.exchangeRate)}</span>
                </button>
              </div>

              {/* USD + KHR bills in two rows */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] font-bold text-green-600 uppercase tracking-wider mb-1">$ {t('pos.dollar')}</p>
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 2, 5, 10, 20, 50, 100].map((amt) => (
                      <button
                        key={`usd-${amt}`}
                        type="button"
                        onClick={() => setAmountUsd(amt.toString())}
                        className={cn(
                          'py-1.5 rounded text-xs font-bold transition-all',
                          amountUsd === amt.toString()
                            ? 'border-2 border-green-500 bg-green-50 text-green-700'
                            : 'border border-green-100 text-green-700 hover:bg-green-50'
                        )}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mb-1">៛ {t('pos.riel')}</p>
                  <div className="grid grid-cols-4 gap-1">
                    {[1000, 2000, 5000, 10000, 20000, 50000, 100000].map((amt) => (
                      <button
                        key={`khr-${amt}`}
                        type="button"
                        onClick={() => setAmountKhr(amt.toString())}
                        className={cn(
                          'py-1.5 rounded text-xs font-bold transition-all',
                          amountKhr === amt.toString()
                            ? 'border-2 border-blue-500 bg-blue-50 text-blue-700'
                            : 'border border-blue-100 text-blue-700 hover:bg-blue-50'
                        )}
                      >
                        {(amt / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Manual input */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="number"
                    step="0.01"
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(e.target.value)}
                    placeholder={t('pos.customUSD')}
                    className="h-8 text-xs border-green-200 focus:ring-green-500"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    step="100"
                    value={amountKhr}
                    onChange={(e) => setAmountKhr(e.target.value)}
                    placeholder={t('pos.customKHR')}
                    className="h-8 text-xs border-blue-200 focus:ring-blue-500"
                  />
                </div>
              </div>
              {totalTendered > 0 && (
                <div className={cn(
                  'rounded-lg p-2.5 flex items-center justify-between',
                  totalTendered >= total ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                )}>
                  <span className={cn('text-xs font-medium', totalTendered >= total ? 'text-green-700' : 'text-red-600')}>
                    {totalTendered >= total ? t('pos.change') : t('pos.remaining')}
                  </span>
                  <span className={cn('text-sm font-bold', totalTendered >= total ? 'text-green-700' : 'text-red-600')}>
                    {totalTendered >= total
                      ? `${formatCurrency(changeUsd)} · ${toKHR(changeUsd, shopInfo.exchangeRate)}`
                      : `${formatCurrency(total - totalTendered)} · ${toKHR(total - totalTendered, shopInfo.exchangeRate)}`
                    }
                  </span>
                </div>
              )}
            </div>
          )}
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <Button className="w-full" size="lg" disabled={!paymentMethod || loading || ((paymentMethod === 'CASH' || paymentMethod === 'SPLIT') && totalTendered < total)} onClick={handleCompleteSale}>
            {loading ? t('pos.processing') : t('pos.completeSale')}
          </Button>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={!!lastOrder} onClose={() => setLastOrder(null)} title={t('pos.orderComplete')}>
        {lastOrder && (
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto"><ShoppingCart className="h-8 w-8 text-green-600" /></div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{t('pos.invoice')} #{lastOrder.orderNumber}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(lastOrder.total)}</p>
              <p className="text-sm text-gray-400">{toKHR(lastOrder.total, shopInfo.exchangeRate)}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => printInvoice()} className="flex-1">
                <Printer className="h-4 w-4 mr-1.5" /> {t('pos.printInvoice')}
              </Button>
              <Button variant="outline" onClick={() => setLastOrder(null)} className="flex-1">
                {t('pos.newOrder')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Fullscreen Invoice Preview */}
      {showInvoice && lastOrder && (() => {
        const order = lastOrder
        const rate = shopInfo.exchangeRate
        const items = order.items || []
        const now = new Date(order.createdAt || Date.now())
        const dateStr = now.toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        const timeStr = now.toLocaleTimeString(lang === 'km' ? 'km-KH' : 'en-US', { hour: '2-digit', minute: '2-digit' })

        return (
          <div className="fixed inset-0 z-[100] bg-gray-900/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] flex flex-col">
              {/* Header bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                <h2 className={cn('text-base font-bold text-gray-900', lang === 'km' && 'font-khmer')}>{t('pos.invoicePreview')}</h2>
                <button onClick={() => setShowInvoice(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>

              {/* Scrollable receipt */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div ref={invoiceRef}>
                  {/* Shop header */}
                  <div className="text-center pb-3">
                    <h3 className="text-lg font-extrabold text-gray-900">{shopInfo.name || t('pos.shop')}</h3>
                    {shopInfo.address && <p className="text-xs text-gray-500">{shopInfo.address}</p>}
                    {shopInfo.phone && <p className="text-xs text-gray-500">{t('pos.tel')}: {shopInfo.phone}</p>}
                  </div>
                  <hr className="border-dashed border-gray-300 my-2" />

                  {/* Meta */}
                  <div className="flex justify-between text-xs text-gray-500 py-1">
                    <span className="font-semibold text-gray-700">{t('pos.invoice')} #{order.orderNumber}</span>
                    <span>{dateStr} {timeStr}</span>
                  </div>
                  <hr className="border-dashed border-gray-300 my-2" />

                  {/* Items */}
                  <div className="space-y-2 py-1">
                    {items.map((item: any, idx: number) => {
                      const price = item.unitPrice
                      const itemTotal = item.total
                      const khrTotal = Math.round(itemTotal * rate)
                      const hasDisc = item.originalPrice && item.originalPrice > price
                      return (
                        <div key={idx} className="py-1 border-b border-gray-50 last:border-0">
                          <div className="flex justify-between">
                            <span className="text-sm font-semibold text-gray-900">{item.product?.name || 'Item'}</span>
                            <span className="text-sm font-semibold text-gray-900">${itemTotal.toFixed(2)}</span>
                          </div>
                          {(item.sizeName || item.sugarLevel) && (
                            <div className="flex gap-3 mt-0.5">
                              {item.sizeName && <span className="text-[10px] text-gray-500">{t('pos.size')}: {item.sizeName}</span>}
                              {item.sugarLevel && <span className="text-[10px] text-gray-500">{t('pos.sugar')}: {item.sugarLevel}</span>}
                            </div>
                          )}
                          {hasDisc && <p className="text-[10px] text-gray-400 line-through">{item.quantity} x ${item.originalPrice.toFixed(2)}</p>}
                          <p className="text-[11px] text-gray-500">{item.quantity} x ${price.toFixed(2)} <span className="text-gray-400">({khrTotal.toLocaleString()}៛)</span></p>
                        </div>
                      )
                    })}
                  </div>
                  <hr className="border-dashed border-gray-300 my-2" />

                  {/* Summary */}
                  {order.discountValue > 0 && (
                    <>
                      <div className="flex justify-between text-xs py-0.5"><span>{t('pos.subtotal')}</span><span>${order.subtotal.toFixed(2)}</span></div>
                      <div className="flex justify-between text-xs text-green-600 py-0.5">
                        <span>{order.discountReason || t('pos.discount')}</span>
                        <span>-${(order.subtotal - order.total).toFixed(2)} <span className="text-gray-400">(-{Math.round((order.subtotal - order.total) * rate).toLocaleString()}៛)</span></span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-baseline pt-1 mt-1 border-t-2 border-gray-900">
                    <span className="text-base font-extrabold">{t('pos.total').toUpperCase()}</span>
                    <div className="text-right">
                      <span className="text-lg font-extrabold">${order.total.toFixed(2)}</span>
                      <span className="text-xs text-gray-400 ml-1">{Math.round(order.total * rate).toLocaleString()}៛</span>
                    </div>
                  </div>

                  {/* Payment */}
                  <div className="bg-gray-50 rounded-lg p-3 mt-3 text-xs space-y-0.5">
                    <div className="flex justify-between"><span className="text-gray-500">{t('pos.payment')}</span><span className="font-semibold">{payLabel[order.paymentMethod] || order.paymentMethod}</span></div>
                    {order.amountTendered && (
                      <>
                        <div className="flex justify-between"><span className="text-gray-500">{t('pos.tendered')}</span><span className="font-semibold">${order.amountTendered.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">{t('pos.change')}</span><span className="font-semibold">${(order.changeAmount || 0).toFixed(2)}</span></div>
                      </>
                    )}
                  </div>
                  <hr className="border-dashed border-gray-300 my-3" />
                  <div className="text-center text-[10px] text-gray-400">
                    <p>{t('common.thankYou')}</p>
                    <p className="mt-1">{t('common.poweredBy')}</p>
                  </div>
                </div>
              </div>

              {/* Action buttons - fixed at bottom */}
              <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
                <Button className="flex-1" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-1.5" /> {t('pos.print')}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowInvoice(false)}>
                  {t('common.close')}
                </Button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
