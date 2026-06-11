'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { Profile } from '@/lib/types'
import { getInitials } from '@/lib/utils'
import { Upload, Save, Lock, Loader2, User } from 'lucide-react'
import { toast } from 'sonner'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' })

  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: p } = await supabase
      .from('profiles')
      .select('*, branch:branches(name)')
      .eq('id', user.id)
      .single()

    if (p) {
      setProfile(p)
      setForm({ full_name: p.full_name ?? '', phone: p.phone ?? '' })
    }
    setLoading(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`

    const { data, error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) { toast.error('Upload failed'); setUploading(false); return }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path)
    const avatarUrl = urlData.publicUrl + `?t=${Date.now()}`

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', profile.id)

    if (updateError) { toast.error('Failed to update profile'); setUploading(false); return }
    toast.success('Avatar updated')
    setUploading(false)
    load()
  }

  async function handleSave() {
    if (!form.full_name.trim()) { toast.error('Name is required'); return }
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: form.full_name.trim(), phone: form.phone.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', profile!.id)

    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Profile updated')
    setSaving(false)
    load()
  }

  async function handleChangePassword() {
    if (!pwForm.new) { toast.error('New password is required'); return }
    if (pwForm.new.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (pwForm.new !== pwForm.confirm) { toast.error('Passwords do not match'); return }

    setChangingPw(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.new })
    if (error) { toast.error(error.message); setChangingPw(false); return }
    toast.success('Password changed successfully')
    setPwForm({ current: '', new: '', confirm: '' })
    setChangingPw(false)
  }

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin',
    committee: 'Committee',
    area_leader: 'Area Leader',
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900">My Profile</h2>
        <p className="text-sm text-slate-500 mt-0.5">Update your personal information and password</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Avatar & role */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-2xl">
                      {getInitials(profile?.full_name ?? 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-600 text-white rounded-full flex items-center justify-center hover:bg-brand-700 transition-colors shadow-sm"
                    aria-label="Upload avatar"
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{profile?.full_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={profile?.role === 'super_admin' ? 'gold' : profile?.role === 'committee' ? 'default' : 'secondary'}>
                      {roleLabel[profile?.role ?? 'area_leader']}
                    </Badge>
                    {(profile as any)?.branch?.name && (
                      <Badge variant="outline">{(profile as any).branch.name}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-brand-600" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full-name">Full Name *</Label>
                <Input
                  id="full-name"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+973 XXXX XXXX"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save Changes</>}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Change password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4 text-brand-600" />
                Change Password
              </CardTitle>
              <CardDescription>Use a strong password of at least 8 characters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pw-new">New Password</Label>
                <Input
                  id="pw-new"
                  type="password"
                  value={pwForm.new}
                  onChange={e => setPwForm(f => ({ ...f, new: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw-confirm">Confirm New Password</Label>
                <Input
                  id="pw-confirm"
                  type="password"
                  value={pwForm.confirm}
                  onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleChangePassword} disabled={changingPw} variant="outline">
                  {changingPw ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</> : 'Update Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
