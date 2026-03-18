'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { UtensilsCrossed, CheckCircle } from 'lucide-react'

interface KitchenOrder {
  id: string
  orderNumber: number
  status: string
  kitchenReady: boolean
  notes: string | null
  items: {
    id: string
    quantity: number
    notes: string | null
    product: { name: string }
  }[]
  createdAt: string
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([])

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 3000) // Poll every 3s
    return () => clearInterval(interval)
  }, [])

  async function loadOrders() {
    const data = await fetch('/api/orders?status=COMPLETED&today=true').then((r) => r.json())
    if (Array.isArray(data)) {
      setOrders(data.filter((o: KitchenOrder) => !o.kitchenReady))
    }
  }

  async function markReady(orderId: string) {
    await fetch(`/api/orders/${orderId}/ready`, { method: 'PATCH' })
    loadOrders()
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="flex items-center gap-3 mb-6">
        <UtensilsCrossed className="h-8 w-8 text-brand-400" />
        <h1 className="text-2xl font-bold text-white">Kitchen Display</h1>
        <Badge className="ml-auto bg-brand-600 text-white text-lg px-4">
          {orders.length} active
        </Badge>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <UtensilsCrossed className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No active orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold text-white">#{order.orderNumber}</span>
                <span className="text-sm text-gray-400">
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <span className="text-brand-400 font-bold">{item.quantity}x</span>
                    <div>
                      <span className="text-white">{item.product.name}</span>
                      {item.notes && (
                        <p className="text-xs text-amber-400 mt-0.5">{item.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {order.notes && (
                <p className="text-sm text-amber-400 bg-amber-400/10 rounded-lg p-2 mb-3">
                  {order.notes}
                </p>
              )}

              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => markReady(order.id)}
              >
                <CheckCircle className="h-4 w-4 mr-1" /> Mark Ready
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
