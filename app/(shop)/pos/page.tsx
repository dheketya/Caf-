'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { cn, formatCurrency, toKHR } from '@/lib/utils'
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  Banknote, QrCode, Printer,
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
  category: { id: string; name: string; color: string | null } | null
}

interface CartItem {
  id: string
  product: Product
  quantity: number
  notes: string
  sizeName: string | null
  sizePrice: number
  sugarLevel: string | null
}

interface Category {
  id: string
  name: string
  color: string | null
}

interface ShopInfo {
  sugarLevels: string[] | null
  exchangeRate: number
  name: string
  phone: string
  address: string
}

function cartItemKey(productId: string, sizeName: string | null, sugarLevel: string | null): string {
  return `${productId}:${sizeName || '-'}:${sugarLevel || '-'}`
}

export default function POSPage() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [shopInfo, setShopInfo] = useState<ShopInfo>({ sugarLevels: null, exchangeRate: 4100, name: '', phone: '', address: '' })
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

  // Customization modal
  const [customProduct, setCustomProduct] = useState<Product | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedSugar, setSelectedSugar] = useState<string | null>(null)

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
        })
      }
    })
  }, [])

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !activeCategory || p.category?.id === activeCategory
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
    setCart((prev) => {
      const existing = prev.find((item) => item.id === key)
      if (existing) {
        return prev.map((item) => item.id === key ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { id: key, product, quantity: 1, notes: '', sizeName, sizePrice: price, sugarLevel }]
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

  let discountAmount = 0
  if (discountType && discountValue) {
    const val = parseFloat(discountValue)
    discountAmount = discountType === 'percentage' ? subtotal * (val / 100) : val
  }
  const total = Math.max(0, subtotal - discountAmount)

  // Dual currency tendered: convert KHR to USD and sum
  const usdPart = parseFloat(amountUsd) || 0
  const khrPart = parseFloat(amountKhr) || 0
  const khrAsUsd = khrPart / shopInfo.exchangeRate
  const totalTendered = usdPart + khrAsUsd
  const changeUsd = totalTendered - total

  async function handleCompleteSale() {
    if (!paymentMethod || cart.length === 0) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.sizePrice,
            sizeName: item.sizeName || undefined,
            sugarLevel: item.sugarLevel || undefined,
            notes: item.notes || undefined,
          })),
          discountType: discountType || undefined,
          discountValue: discountValue ? parseFloat(discountValue) : undefined,
          paymentMethod,
          amountTendered: totalTendered > 0 ? totalTendered : undefined,
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
    } catch { setError('Failed to create order') }
    setLoading(false)
  }

  function printInvoice(order: any) {
    const rate = shopInfo.exchangeRate
    const items = order.items || []
    const now = new Date(order.createdAt || Date.now())
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    const receiptHtml = `
      <html>
      <head>
        <title>Invoice #${order.orderNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; width: 300px; padding: 16px; font-size: 12px; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .item-name { font-weight: bold; }
          .item-detail { color: #555; font-size: 11px; padding-left: 8px; }
          .total-row { font-size: 14px; font-weight: bold; }
          .khr { color: #666; font-size: 11px; }
          h2 { font-size: 16px; margin-bottom: 2px; }
          .footer { margin-top: 12px; font-size: 11px; color: #666; }
        </style>
      </head>
      <body>
        <div class="center">
          <h2>${shopInfo.name || 'Shop'}</h2>
          ${shopInfo.address ? `<p>${shopInfo.address}</p>` : ''}
          ${shopInfo.phone ? `<p>Tel: ${shopInfo.phone}</p>` : ''}
        </div>
        <div class="line"></div>
        <div class="row"><span>Invoice #${order.orderNumber}</span><span>${dateStr}</span></div>
        <div class="row"><span></span><span>${timeStr}</span></div>
        <div class="line"></div>
        ${items.map((item: any) => {
          const price = item.unitPrice
          const itemTotal = item.total
          const khrTotal = Math.round(itemTotal * rate)
          return `
            <div style="margin: 4px 0;">
              <div class="row">
                <span class="item-name">${item.product?.name || 'Item'}</span>
                <span>$${itemTotal.toFixed(2)}</span>
              </div>
              ${item.sizeName ? `<div class="item-detail">Size: ${item.sizeName}</div>` : ''}
              ${item.sugarLevel ? `<div class="item-detail">Sugar: ${item.sugarLevel}</div>` : ''}
              <div class="item-detail">${item.quantity} x $${price.toFixed(2)} <span class="khr">(${khrTotal.toLocaleString()}៛)</span></div>
            </div>
          `
        }).join('')}
        <div class="line"></div>
        ${order.discountValue ? `
          <div class="row"><span>Subtotal</span><span>$${order.subtotal.toFixed(2)}</span></div>
          <div class="row"><span>Discount${order.discountType === 'percentage' ? ` (${order.discountValue}%)` : ''}</span><span>-$${(order.subtotal - order.total).toFixed(2)}</span></div>
        ` : ''}
        <div class="row total-row">
          <span>TOTAL</span>
          <span>$${order.total.toFixed(2)}</span>
        </div>
        <div class="row khr"><span></span><span>${Math.round(order.total * rate).toLocaleString()}៛</span></div>
        <div class="line"></div>
        <div class="row"><span>Payment</span><span>${order.paymentMethod?.replace('_', ' ')}</span></div>
        ${order.amountTendered ? `
          <div class="row"><span>Tendered</span><span>$${order.amountTendered.toFixed(2)}</span></div>
          <div class="row"><span>Change</span><span>$${(order.changeAmount || 0).toFixed(2)}</span></div>
        ` : ''}
        <div class="line"></div>
        <div class="center footer">
          <p>Thank you for your visit!</p>
          <p>Powered by CaféOS</p>
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank', 'width=320,height=600')
    if (printWindow) {
      printWindow.document.write(receiptHtml)
      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }

  // Computed for customization modal
  const customAvailableSizes = customProduct ? (customProduct.sizes as SizeOption[])?.filter((s) => s.price !== null) || [] : []
  const customPrice = (() => {
    if (!customProduct) return 0
    if (selectedSize && customAvailableSizes.length > 0) {
      const s = customAvailableSizes.find((s) => s.name === selectedSize)
      return s?.price ?? customProduct.price
    }
    return customProduct.price
  })()

  return (
    <div className="flex gap-6 h-[calc(100vh-7rem)]">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button onClick={() => setActiveCategory(null)} className={cn('px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors', !activeCategory ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>All</button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={cn('px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors', activeCategory === cat.id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>{cat.name}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto flex-1 auto-rows-min">
          {filteredProducts.map((product) => {
            const availableSizes = (product.sizes as SizeOption[])?.filter((s) => s.price !== null) || []
            const displayPrice = availableSizes.length > 0
              ? Math.min(...availableSizes.map((s) => s.price!))
              : product.price

            return (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                disabled={product.isOutOfStock}
                className={cn(
                  'relative rounded-xl border text-left transition-all hover:shadow-md flex flex-col p-3 h-[140px]',
                  product.isOutOfStock ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200 hover:border-brand-300'
                )}
              >
                {product.isOutOfStock && <Badge variant="warning" className="absolute top-2 right-2 text-[10px]">Out of stock</Badge>}
                <div className="h-10 w-10 rounded-lg bg-gray-100 mb-2 flex items-center justify-center text-lg shrink-0">
                  {product.image ? <img src={product.image} alt="" className="h-full w-full object-cover rounded-lg" /> : '☕'}
                </div>
                <p className="text-sm font-medium text-gray-900 truncate w-full">{product.name}</p>
                <div className="mt-auto">
                  <p className="text-sm text-brand-600 font-semibold">
                    {availableSizes.length > 0 ? `from ${formatCurrency(displayPrice)}` : formatCurrency(displayPrice)}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {availableSizes.length > 0 ? `from ${toKHR(displayPrice, shopInfo.exchangeRate)}` : toKHR(displayPrice, shopInfo.exchangeRate)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Cart */}
      <Card className="w-80 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Current Order</h2>
          <Badge className="ml-auto">{cart.reduce((s, i) => s + i.quantity, 0)}</Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Add products to start an order</p>
          ) : cart.map((item) => (
            <div key={item.id} className="pb-3 border-b border-gray-50">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                  {(item.sizeName || item.sugarLevel) && (
                    <div className="flex gap-2 mt-0.5">
                      {item.sizeName && <span className="text-[11px] text-gray-500">Size: <span className="font-medium text-gray-700">{item.sizeName}</span></span>}
                      {item.sugarLevel && <span className="text-[11px] text-gray-500">Sugar: <span className="font-medium text-gray-700">{item.sugarLevel}</span></span>}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(item.sizePrice)} · {toKHR(item.sizePrice, shopInfo.exchangeRate)}</p>
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
                <option value="">No discount</option>
                <option value="percentage">%</option>
                <option value="fixed">Fixed</option>
              </select>
              {discountType && <Input type="number" placeholder={discountType === 'percentage' ? '10' : '5.00'} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="h-7 text-xs" />}
            </div>
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-200 space-y-1">
          <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          {discountAmount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}
          <div className="flex justify-between text-base font-bold text-gray-900 pt-1"><span>Total</span><span>{formatCurrency(total)}</span></div>
          <div className="flex justify-between text-xs text-gray-400"><span></span><span>{toKHR(total, shopInfo.exchangeRate)}</span></div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <Button className="w-full" size="lg" disabled={cart.length === 0} onClick={() => setShowPayment(true)}>Charge {formatCurrency(total)}</Button>
        </div>
      </Card>

      {/* Customization Modal */}
      <Modal isOpen={!!customProduct} onClose={() => setCustomProduct(null)} title={`Customize: ${customProduct?.name || ''}`}>
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
                <p className="text-sm font-semibold text-gray-900 mb-2">Size</p>
                <div className="grid grid-cols-3 gap-2">
                  {customAvailableSizes.map((size) => (
                    <button
                      key={size.name}
                      type="button"
                      onClick={() => setSelectedSize(size.name)}
                      className={cn(
                        'flex flex-col items-center rounded-lg border-2 px-3 py-3 transition-all',
                        selectedSize === size.name
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-100 hover:border-gray-200 text-gray-700'
                      )}
                    >
                      <span className="text-base font-bold">{size.name}</span>
                      <span className={cn('text-xs font-medium mt-0.5', selectedSize === size.name ? 'text-brand-600' : 'text-gray-400')}>
                        {formatCurrency(size.price!)}
                      </span>
                      <span className="text-[10px] text-gray-400">{toKHR(size.price!, shopInfo.exchangeRate)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sugar level selection */}
            {customProduct.hasSugarLevel && shopInfo.sugarLevels && shopInfo.sugarLevels.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Sugar Level</p>
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
              <span className="text-sm text-gray-500">Item price</span>
              <div className="text-right">
                <span className="text-lg font-bold text-gray-900">{formatCurrency(customPrice)}</span>
                <p className="text-xs text-gray-400">{toKHR(customPrice, shopInfo.exchangeRate)}</p>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={confirmCustomization}>
              Add to Order
            </Button>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={showPayment} onClose={() => setShowPayment(false)} title="Complete Payment">
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(total)}</p>
            <p className="text-sm text-gray-400">{toKHR(total, shopInfo.exchangeRate)}</p>
            <p className="text-sm text-gray-500 mt-1">Select payment method</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'CASH', label: 'Cash', icon: <Banknote className="h-5 w-5" /> },
              { value: 'QR_EWALLET', label: 'Bank Transfer', icon: <QrCode className="h-5 w-5" /> },
              { value: 'SPLIT', label: 'Cash + Bank', icon: <><Banknote className="h-4 w-4" /><QrCode className="h-4 w-4" /></> },
            ].map((method) => (
              <button key={method.value} onClick={() => setPaymentMethod(method.value)} className={cn('flex items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-colors', paymentMethod === method.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-gray-300 text-gray-600')}>
                {method.icon}<span className="text-sm font-medium">{method.label}</span>
              </button>
            ))}
          </div>
          {(paymentMethod === 'CASH' || paymentMethod === 'SPLIT') && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500">Amount Received</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">USD ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">KHR (៛)</label>
                  <Input
                    type="number"
                    step="100"
                    value={amountKhr}
                    onChange={(e) => setAmountKhr(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              {totalTendered > 0 && (
                <div className="rounded-lg bg-gray-50 p-3 space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Total received</span>
                    <span>{formatCurrency(totalTendered)} · {toKHR(totalTendered, shopInfo.exchangeRate)}</span>
                  </div>
                  {totalTendered >= total && (
                    <div className="flex justify-between text-sm font-semibold text-green-600">
                      <span>Change</span>
                      <span>{formatCurrency(changeUsd)} · {toKHR(changeUsd, shopInfo.exchangeRate)}</span>
                    </div>
                  )}
                  {totalTendered < total && (
                    <div className="flex justify-between text-sm font-medium text-red-500">
                      <span>Remaining</span>
                      <span>{formatCurrency(total - totalTendered)} · {toKHR(total - totalTendered, shopInfo.exchangeRate)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <Button className="w-full" size="lg" disabled={!paymentMethod || loading || ((paymentMethod === 'CASH' || paymentMethod === 'SPLIT') && totalTendered < total)} onClick={handleCompleteSale}>
            {loading ? 'Processing...' : 'Complete Sale'}
          </Button>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={!!lastOrder} onClose={() => setLastOrder(null)} title="Sale Complete">
        {lastOrder && (
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto"><ShoppingCart className="h-8 w-8 text-green-600" /></div>
            <div>
              <p className="text-lg font-semibold text-gray-900">Order #{lastOrder.orderNumber}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(lastOrder.total)}</p>
              <p className="text-sm text-gray-400">{toKHR(lastOrder.total, shopInfo.exchangeRate)}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => printInvoice(lastOrder)} className="flex-1">
                <Printer className="h-4 w-4 mr-1.5" /> Print Invoice
              </Button>
              <Button variant="outline" onClick={() => setLastOrder(null)} className="flex-1">
                New Order
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
