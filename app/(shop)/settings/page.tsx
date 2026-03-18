'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Image as ImageIcon } from 'lucide-react'

export default function SettingsPage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    currency: 'USD',
    timezone: 'Asia/Phnom_Penh',
    brandColor: '#e85d3a',
    logo: '',
  })
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
            name: shop.name || '',
            phone: shop.phone || '',
            address: shop.address || '',
            currency: shop.currency || 'USD',
            timezone: shop.timezone || 'Asia/Phnom_Penh',
            brandColor: shop.brandColor || '#e85d3a',
            logo: shop.logo || '',
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

    const res = await fetch('/api/shops', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="KHR">KHR - Cambodian Riel</option>
              </select>
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
