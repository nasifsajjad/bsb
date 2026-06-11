'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: branding panel */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, var(--color-sidebar) 0%, var(--color-sidebar-mid) 60%, var(--color-sidebar-light) 100%)' }}
      >
        {/* Geometric background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 20px),
              repeating-linear-gradient(-45deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 20px)
            `,
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
              <span className="text-white text-xl font-bold" style={{ fontFamily: '"Amiri", serif' }}>ي</span>
            </div>
            <div>
              <p className="text-white font-semibold text-lg">United Youth Forum</p>
              <p className="text-white/50 text-xs">Management System</p>
            </div>
          </div>
        </div>

        {/* Quote */}
        <div className="relative z-10">
          <div className="w-8 h-0.5 bg-gold-400 mb-6" />
          <blockquote className="text-white/80 text-lg leading-relaxed font-light" style={{ fontFamily: '"Amiri", serif' }}>
            &ldquo;The best among you are those who bring greatest benefits to many others.&rdquo;
          </blockquote>
          <p className="text-white/40 text-sm mt-3">— Prophet Muhammad ﷺ</p>
        </div>

        {/* Stats decoration */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { n: '10', label: 'Branches' },
            { n: '∞', label: 'Knowledge' },
            { n: '1', label: 'Community' },
          ].map(({ n, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold text-white">{n}</p>
              <p className="text-xs text-white/40 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--app-primary)' }}
            >
              <span className="text-white text-lg font-bold" style={{ fontFamily: '"Amiri", serif' }}>ي</span>
            </div>
            <p className="font-semibold text-slate-900">United Youth Forum</p>
          </div>

          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
            <p className="text-slate-500 text-sm mt-1.5">Sign in to your account to continue</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 text-sm font-semibold"
                disabled={loading}
                style={{ backgroundColor: 'var(--app-primary)' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-8">
              Contact your administrator to get access.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
