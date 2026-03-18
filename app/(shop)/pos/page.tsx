'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { cn, formatCurrency } from '@/lib/utils'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  QrCode,
  Split,
  X,
} from 'lucide-react'

interface Product {
  id: string
  name: string
  price: number
  image: string | null
  isOutOfStock: boolean
  category: { id: string; name: string; color: string | null } | null
}

interface CartItem {
  product: Product
  quantity: number
  notes: string
}

interface Category {
  id: string
  name: string
  color: string | null
}

export default function POSPage() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [amountTendered, setAmountTendered] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastOrder, setLastOrder] = useState<any>(null)

  // Discount
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | ''>('')
  const [discountValue, setDiscountValue] = useState('')
  const [discountReason, setDiscountReason] = useState('')

  const canDiscount = ['PLATFORM_OWNER', 'SHOP_OWNER', 'MANAGER'].includes(
    session?.user?.role || ''
  )

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then(setProducts)
      .catch(console.error)

    fetch('/api/categories')
      .then((r) => r.json())
      .then(setCategories)
      .catch(console.error)
  }, [])

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !activeCategory || p.category?.id === activeCategory
    return matchesSearch && matchesCategory
  })

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1, notes: '' }]
    })
  }, [])

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  let discountAmount = 0
  if (discountType && discountValue) {
    const val = parseFloat(discountValue)
    if (discountType === 'percentage') {
      discountAmount = subtotal * (val / 100)
    } else {
      discountAmount = val
    }
  }

  const total = Math.max(0, subtotal - discountAmount)

  const changeAmount =
    paymentMethod === 'CASH' && amountTendered
      ? parseFloat(amountTendered) - total
      : 0

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
            notes: item.notes || undefined,
          })),
          discountType: discountType || undefined,
          discountValue: discountValue ? parseFloat(discountValue) : undefined,
          discountReason: discountReason || undefined,
          paymentMethod,
          amountTendered: amountTendered ? parseFloat(amountTendered) : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create order')
        setLoading(false)
        return
      }

      setLastOrder(data)
      setCart([])
      setShowPayment(false)
      setPaymentMethod('')
      setAmountTendered('')
      setDiscountType('')
      setDiscountValue('')
      setDiscountReason('')
    } catch {
      setError('Failed to create order')
    }
    setLoading(false)
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-7rem)]">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              !activeCategory
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                activeCategory === cat.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto flex-1">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => !product.isOutOfStock && addToCart(product)}
              disabled={product.isOutOfStock}
              className={cn(
                'relative p-4 rounded-xl border text-left transition-all hover:shadow-md',
                product.isOutOfStock
                  ? 'bg-gray-50 border-gray-200 opacity-60'
                  : 'bg-white border-gray-200 hover:border-brand-300'
              )}
            >
              {product.isOutOfStock && (
                <Badge variant="warning" className="absolute top-2 right-2">
                  Out of stock
                </Badge>
              )}
              <div className="h-16 w-16 rounded-lg bg-gray-100 mb-3 flex items-center justify-center text-2xl">
                {product.image ? (
                  <img src={product.image} alt="" className="h-full w-full object-cover rounded-lg" />
                ) : (
                  '☕'
                )}
              </div>
              <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
              <p className="text-sm text-brand-600 font-semibold mt-1">
                {formatCurrency(product.price)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Sidebar */}
      <Card className="w-80 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Current Order</h2>
          <Badge className="ml-auto">{cart.length}</Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Add products to start an order
            </p>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="flex items-start gap-3 pb-3 border-b border-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(item.product.price)} each
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="h-7 w-7 rounded-md bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="h-7 w-7 rounded-md bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="h-7 w-7 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Discount */}
        {canDiscount && cart.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100">
            <div className="flex gap-2">
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="text-xs rounded border border-gray-200 px-2 py-1"
              >
                <option value="">No discount</option>
                <option value="percentage">%</option>
                <option value="fixed">Fixed</option>
              </select>
              {discountType && (
                <Input
                  type="number"
                  placeholder={discountType === 'percentage' ? '10' : '5.00'}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="h-7 text-xs"
                />
              )}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="px-4 py-3 border-t border-gray-200 space-y-1">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-gray-900 pt-1">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <Button
            className="w-full"
            size="lg"
            disabled={cart.length === 0}
            onClick={() => setShowPayment(true)}
          >
            Charge {formatCurrency(total)}
          </Button>
        </div>
      </Card>

      {/* Payment Modal */}
      <Modal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        title="Complete Payment"
      >
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(total)}</p>
            <p className="text-sm text-gray-500 mt-1">Select payment method</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'CASH', label: 'Cash', icon: <Banknote className="h-5 w-5" /> },
              { value: 'CARD', label: 'Card', icon: <CreditCard className="h-5 w-5" /> },
              { value: 'QR_EWALLET', label: 'QR / e-Wallet', icon: <QrCode className="h-5 w-5" /> },
              { value: 'SPLIT', label: 'Split', icon: <Split className="h-5 w-5" /> },
            ].map((method) => (
              <button
                key={method.value}
                onClick={() => setPaymentMethod(method.value)}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-xl border-2 transition-colors',
                  paymentMethod === method.value
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                )}
              >
                {method.icon}
                <span className="text-sm font-medium">{method.label}</span>
              </button>
            ))}
          </div>

          {paymentMethod === 'CASH' && (
            <div>
              <Input
                label="Amount tendered"
                type="number"
                step="0.01"
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
                placeholder="0.00"
              />
              {parseFloat(amountTendered) >= total && (
                <p className="mt-2 text-sm font-medium text-green-600">
                  Change: {formatCurrency(parseFloat(amountTendered) - total)}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={!paymentMethod || loading || (paymentMethod === 'CASH' && parseFloat(amountTendered) < total)}
            onClick={handleCompleteSale}
          >
            {loading ? 'Processing...' : 'Complete Sale'}
          </Button>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={!!lastOrder}
        onClose={() => setLastOrder(null)}
        title="Sale Complete"
      >
        {lastOrder && (
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <ShoppingCart className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                Order #{lastOrder.orderNumber}
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(lastOrder.total)}
              </p>
            </div>
            <Button variant="outline" onClick={() => setLastOrder(null)} className="w-full">
              New Order
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
