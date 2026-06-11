'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import type { AppSettings, Profile } from '@/lib/types'
import { Save, Upload, Palette, Type, Image as ImageIcon, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const PRESET_PALETTES = [
  { label: 'Islamic Green', primary: '#16a34a', accent: '#d97706' },
  { label: 'Ocean Teal',    primary: '#0d9488', accent: '#f59e0b' },
  { label: 'Deep Emerald',  primary: '#065f46', accent: '#c9a84c' },
  { label: 'Royal Blue',    primary: '#1d4ed8', accent: '#d97706' },
  { label: 'Crimson',       primary: '#be123c', accent: '#d97706' },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    app_name: '',
    tagline: '',
    contact_email: '',
    primary_color: '#16a34a',
    accent_color: '#d97706',
    logo_url: '',
  })

  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('app_settings').select('*').eq('id', 1).single(),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])

    setProfile(p)
    if (s) {
      setSettings(s)
      setForm({
        app_name: s.app_name ?? '',
        tagline: s.tagline ?? '',
        contact_email: s.contact_email ?? '',
        primary_color: s.primary_color ?? '#16a34a',
        accent_color: s.accent_color ?? '#d97706',
        logo_url: s.logo_url ?? '',
      })
    }
    setLoading(false)
  }

  const isAdmin = profile?.role === 'super_admin'

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be under 5MB')
      return
    }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `logo-${Date.now()}.${ext}`

    const { data, error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (error) {
      toast.error('Upload failed: ' + error.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(data.path)
    setForm(f => ({ ...f, logo_url: urlData.publicUrl }))
    toast.success('Logo uploaded')
    setUploading(false)
  }

  function removeLogo() {
    setForm(f => ({ ...f, logo_url: '' }))
  }

  async function handleSave() {
    if (!form.app_name.trim()) { toast.error('App name is required'); return }

    setSaving(true)
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        id: 1,
        app_name: form.app_name.trim(),
        tagline: form.tagline.trim() || null,
        contact_email: form.contact_email.trim() || null,
        primary_color: form.primary_color,
        accent_color: form.accent_color,
        logo_url: form.logo_url || null,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }

    // Apply theme immediately
    document.documentElement.style.setProperty('--app-primary', form.primary_color)
    document.documentElement.style.setProperty('--app-accent', form.accent_color)

    toast.success('Settings saved — refresh to see all changes')
    setSaving(false)
    load()
  }

  if (!loading && !isAdmin) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Only super admins can access settings.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Branding & Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Customize the application name, logo, and colors</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-5">
          {/* App Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Type className="h-4 w-4 text-brand-600" />
                App Identity
              </CardTitle>
              <CardDescription>Name and description shown in the header and page title</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="app-name">App Name *</Label>
                <Input
                  id="app-name"
                  value={form.app_name}
                  onChange={e => setForm(f => ({ ...f, app_name: e.target.value }))}
                  placeholder="United Youth Forum"
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={form.tagline}
                  onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
                  placeholder="Empowering Youth Through Islamic Knowledge"
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Contact Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={form.contact_email}
                  onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                  placeholder="admin@uyf.bh"
                  disabled={!isAdmin}
                />
              </div>
            </CardContent>
          </Card>

          {/* Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="h-4 w-4 text-brand-600" />
                Logo
              </CardTitle>
              <CardDescription>Shown in the sidebar and login page. PNG, JPG, WebP, SVG — max 5MB</CardDescription>
            </CardHeader>
            <CardContent>
              {form.logo_url ? (
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.logo_url} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600 break-all max-w-xs truncate">{form.logo_url.split('/').pop()}</p>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="h-3.5 w-3.5" />
                          Replace
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={removeLogo}>
                          <X className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed border-slate-200 rounded-xl p-8 text-center transition-colors ${
                    isAdmin ? 'hover:border-brand-400 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => isAdmin && fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
                      <p className="text-sm text-slate-500">Uploading…</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Upload className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">Upload logo</p>
                      <p className="text-xs text-slate-400">Click to browse</p>
                    </div>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* Theme Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4 text-brand-600" />
                Theme Colors
              </CardTitle>
              <CardDescription>Primary and accent colors applied across the entire application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Preset palettes */}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Presets</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_PALETTES.map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => isAdmin && setForm(f => ({ ...f, primary_color: preset.primary, accent_color: preset.accent }))}
                      disabled={!isAdmin}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        form.primary_color === preset.primary
                          ? 'border-brand-400 bg-brand-50 text-brand-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.accent})` }}
                      />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Custom pickers */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-9 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                      <input
                        id="primary-color"
                        type="color"
                        value={form.primary_color}
                        onChange={e => isAdmin && setForm(f => ({ ...f, primary_color: e.target.value }))}
                        disabled={!isAdmin}
                        className="absolute inset-0 w-full h-full cursor-pointer border-0 p-0 scale-150"
                      />
                    </div>
                    <Input
                      value={form.primary_color}
                      onChange={e => isAdmin && setForm(f => ({ ...f, primary_color: e.target.value }))}
                      className="font-mono text-sm"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="accent-color">Accent Color</Label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-9 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                      <input
                        id="accent-color"
                        type="color"
                        value={form.accent_color}
                        onChange={e => isAdmin && setForm(f => ({ ...f, accent_color: e.target.value }))}
                        disabled={!isAdmin}
                        className="absolute inset-0 w-full h-full cursor-pointer border-0 p-0 scale-150"
                      />
                    </div>
                    <Input
                      value={form.accent_color}
                      onChange={e => isAdmin && setForm(f => ({ ...f, accent_color: e.target.value }))}
                      className="font-mono text-sm"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-2 p-4 rounded-xl border border-slate-100 bg-slate-50">
                <p className="text-xs font-medium text-slate-500 mb-3">Preview</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
                    style={{ backgroundColor: form.primary_color }}
                  >
                    Primary Button
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
                    style={{ backgroundColor: form.accent_color }}
                  >
                    Accent Button
                  </button>
                  <div
                    className="h-3 w-32 rounded-full"
                    style={{ background: `linear-gradient(90deg, ${form.primary_color}, ${form.accent_color})` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} size="lg">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save Settings</>}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
