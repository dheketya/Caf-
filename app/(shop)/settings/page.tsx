'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Image as ImageIcon, Plus, X } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    shopCode: '',
    name: '',
    phone: '',
    address: '',
    currency: 'USD',
    exchangeRate: '4100',
    timezone: 'Asia/Phnom_Penh',
    brandColor: '#e85d3a',
    logo: '',
    sugarLevels: ['0%', '25%', '50%', '75%', '100%'] as string[],
    loyaltyEnabled: false,
    loyaltyTarget: '10',
    loyaltyDiscountType: 'percentage',
    loyaltyDiscountValue: '10',
  })
  const [newSugarLevel, setNewSugarLevel] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/shops/me')
      .then((r) => r.json())
      .then((shop) => {
        if (shop && !shop.error) {
          setForm({
            shopCode: shop.shopCode || '',
            name: shop.name || '',
            phone: shop.phone || '',
            address: shop.address || '',
            currency: shop.currency || 'USD',
            exchangeRate: (shop.exchangeRate || 4100).toString(),
            timezone: shop.timezone || 'Asia/Phnom_Penh',
            brandColor: shop.brandColor || '#e85d3a',
            logo: shop.logo || '',
            sugarLevels: (shop.sugarLevels as string[]) || ['0%', '25%', '50%', '75%', '100%'],
            loyaltyEnabled: shop.loyaltyEnabled ?? false,
            loyaltyTarget: (shop.loyaltyTarget || 10).toString(),
            loyaltyDiscountType: shop.loyaltyDiscountType || 'percentage',
            loyaltyDiscountValue: (shop.loyaltyDiscountValue || 10).toString(),
          })
          if (shop.logo) setLogoPreview(shop.logo)
        }
      })
      .catch(console.error)
  }, [])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Convert to base64 for storage (simple approach for v1)
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setLogoPreview(base64)
      setForm((f) => ({ ...f, logo: base64 }))
    }
    reader.readAsDataURL(file)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const payload = {
      shopCode: form.shopCode || undefined,
      name: form.name,
      phone: form.phone,
      address: form.address,
      currency: form.currency,
      timezone: form.timezone,
      brandColor: form.brandColor,
      logo: form.logo,
      sugarLevels: form.sugarLevels,
      exchangeRate: parseFloat(form.exchangeRate) || 4100,
      loyaltyEnabled: form.loyaltyEnabled,
      loyaltyTarget: parseInt(form.loyaltyTarget) || 10,
      loyaltyDiscountType: form.loyaltyDiscountType,
      loyaltyDiscountValue: parseFloat(form.loyaltyDiscountValue) || 0,
    }

    const res = await fetch('/api/shops', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
      router.refresh() // refresh layout to update sidebar logo/name
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your shop profile and branding</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shop Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Shop Logo</label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-cover rounded-xl" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-gray-300" />
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1" /> Upload Logo
                  </Button>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 2MB</p>
                </div>
              </div>
            </div>

            <Input
              label="Shop Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            {/* Shop Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop Code</label>
              <div className="flex items-center gap-3">
                <Input
                  value={form.shopCode}
                  onChange={(e) => setForm({ ...form, shopCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                  placeholder="e.g. TPC97"
                  className="w-40 font-mono font-bold uppercase"
                />
                <p className="text-xs text-gray-400">Staff login: <span className="font-mono">username.<strong>{form.shopCode || '...'}</strong></span></p>
              </div>
              <p className="text-xs text-gray-400 mt-1">Changing this will auto-update all staff login credentials</p>
            </div>

            {/* Brand Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.brandColor}
                  onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                  className="h-10 w-14 rounded-lg border border-gray-300 cursor-pointer p-1"
                />
                <Input
                  value={form.brandColor}
                  onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                  className="w-32"
                  placeholder="#e85d3a"
                />
                <div
                  className="h-10 flex-1 rounded-lg"
                  style={{ backgroundColor: form.brandColor }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Used for your shop branding and accents</p>
            </div>

            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />

            <Input
              label="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />

            {/* Exchange Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exchange Rate (1 USD = ? KHR)
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm font-medium text-gray-500 whitespace-nowrap">$1 =</span>
                  <Input
                    type="number"
                    value={form.exchangeRate}
                    onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })}
                    placeholder="4100"
                    className="w-32"
                  />
                  <span className="text-sm font-medium text-gray-500">KHR</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Used to show prices in both USD and KHR. Example: $1.00 = {parseInt(form.exchangeRate || '4100').toLocaleString()}៛
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="Asia/Phnom_Penh">Asia/Phnom_Penh (UTC+7)</option>
                <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+7)</option>
                <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                <option value="America/New_York">America/New_York (UTC-5)</option>
              </select>
            </div>

            {/* Sugar Levels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sugar Levels</label>
              <p className="text-xs text-gray-400 mb-2">Define the sugar options available for your drinks</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.sugarLevels.map((level, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-sm text-gray-700">
                    {level}
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, sugarLevels: f.sugarLevels.filter((_, idx) => idx !== i) }))}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSugarLevel}
                  onChange={(e) => setNewSugarLevel(e.target.value)}
                  placeholder="e.g. 10%"
                  className="w-32"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (newSugarLevel.trim() && !form.sugarLevels.includes(newSugarLevel.trim())) {
                        setForm((f) => ({ ...f, sugarLevels: [...f.sugarLevels, newSugarLevel.trim()] }))
                        setNewSugarLevel('')
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (newSugarLevel.trim() && !form.sugarLevels.includes(newSugarLevel.trim())) {
                      setForm((f) => ({ ...f, sugarLevels: [...f.sugarLevels, newSugarLevel.trim()] }))
                      setNewSugarLevel('')
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Loyalty Program */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <label className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.loyaltyEnabled}
                  onChange={(e) => setForm({ ...form, loyaltyEnabled: e.target.checked })}
                  className="rounded border-gray-300 h-4 w-4"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Loyalty Program</p>
                  <p className="text-xs text-gray-400">Reward returning customers with a discount after reaching visit target</p>
                </div>
              </label>

              {form.loyaltyEnabled && (
                <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Visits needed for reward</label>
                    <Input
                      type="number"
                      value={form.loyaltyTarget}
                      onChange={(e) => setForm({ ...form, loyaltyTarget: e.target.value })}
                      placeholder="10"
                      className="w-32"
                    />
                    <p className="text-xs text-gray-400 mt-1">Customer gets a discount after this many orders</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount type</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, loyaltyDiscountType: 'percentage' })}
                        className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${form.loyaltyDiscountType === 'percentage' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                      >
                        Percentage (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, loyaltyDiscountType: 'fixed' })}
                        className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${form.loyaltyDiscountType === 'fixed' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                      >
                        Fixed Amount ($)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount value {form.loyaltyDiscountType === 'percentage' ? '(%)' : '($)'}
                    </label>
                    <Input
                      type="number"
                      step={form.loyaltyDiscountType === 'percentage' ? '1' : '0.01'}
                      value={form.loyaltyDiscountValue}
                      onChange={(e) => setForm({ ...form, loyaltyDiscountValue: e.target.value })}
                      placeholder={form.loyaltyDiscountType === 'percentage' ? '10' : '2.00'}
                      className="w-32"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {form.loyaltyDiscountType === 'percentage'
                        ? `Customer gets ${form.loyaltyDiscountValue || '0'}% off their order`
                        : `Customer gets $${form.loyaltyDiscountValue || '0'} off their order`
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              {saved && (
                <span className="text-sm text-green-600 font-medium">Saved successfully!</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
