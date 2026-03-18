'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { BarChart3, Store, ShoppingCart, DollarSign, Download } from 'lucide-react'

interface PlatformReport {
  shopCount: number
  totalSales: number
  totalRevenue: number
  packages: { name: string; _count: { shops: number } }[]
}

export default function AdminReportsPage() {
  const [data, setData] = useState<PlatformReport | null>(null)

  useEffect(() => {
    fetch('/api/admin')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
  }, [])

  if (!data) return <div className="text-center py-20 text-gray-400">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Platform Reports</h1>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Store className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Shops</p>
              <p className="text-2xl font-bold text-gray-900">{data.shopCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{data.totalSales}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.packages.map((pkg) => (
              <div key={pkg.name} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{pkg.name}</span>
                <span className="text-sm text-gray-500">{pkg._count.shops} shops</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
