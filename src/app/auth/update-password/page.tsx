'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/auth/reset?error=Session+expired')
      } else {
        setChecking(false)
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (password !== confirm) { toast.error('Passwords do not match'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => router.push('/dashboard'), 1800)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center animate-fade-in space-y-3">
          <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-brand-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Password updated!</h2>
          <p className="text-slate-500 text-sm">Taking you to the dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Set a new password</h1>
          <p className="text-slate-500 text-sm mt-1.5">
            Enter your new password below. Minimum 8 characters.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repeat your password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              disabled={loading}
              autoComplete="new-password"
            />
            {confirm && confirm !== password && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-10 text-sm font-semibold"
            disabled={loading || !password || !confirm}
            style={{ backgroundColor: 'var(--app-primary)' }}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
