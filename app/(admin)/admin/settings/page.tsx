'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, QrCode, Image as ImageIcon } from 'lucide-react'

export default function AdminSettingsPage() {
  const [form, setForm] = useState({
    telegramUsername: '',
    telegramGroupLink: '',
    khqrImage: '',
  })
  const [khqrPreview, setKhqrPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setForm({
            telegramUsername: data.telegramUsername || '',
            telegramGroupLink: data.telegramGroupLink || '',
            khqrImage: data.khqrImage || '',
          })
          if (data.khqrImage) setKhqrPreview(data.khqrImage)
        }
      })
      .catch(console.error)
  }, [])

  function handleKhqrChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setKhqrPreview(base64)
      setForm((f) => ({ ...f, khqrImage: base64 }))
    }
    reader.readAsDataURL(file)
  }

  function removeKhqr() {
    setKhqrPreview(null)
    setForm((f) => ({ ...f, khqrImage: '' }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const res = await fetch('/api/admin/settings', {
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
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-sm text-gray-500">Manage payment, contact, and platform configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-600" />
            KHQR Payment Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            This QR code is shown to new shops when they register for a paid plan.
          </p>
          <div className="flex items-start gap-4">
            <div className="h-40 w-40 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
              {khqrPreview ? (
                <img src={khqrPreview} alt="KHQR" className="h-full w-full object-contain rounded-xl" />
              ) : (
                <ImageIcon className="h-10 w-10 text-gray-300" />
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleKhqrChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-1" /> Upload KHQR
              </Button>
              {khqrPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeKhqr}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </Button>
              )}
              <p className="text-xs text-gray-400">PNG, JPG. Recommended: 400x400px or higher</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact & Support</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Telegram Username"
              value={form.telegramUsername}
              onChange={(e) => setForm({ ...form, telegramUsername: e.target.value })}
              placeholder="cafeos_support"
            />

            <Input
              label="Telegram Group Link"
              value={form.telegramGroupLink}
              onChange={(e) => setForm({ ...form, telegramGroupLink: e.target.value })}
              placeholder="https://t.me/cafeos_group"
            />

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
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
