'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const origin = window.location.origin

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm animate-fade-in text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto">
            <MailCheck className="h-8 w-8 text-brand-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Check your email</h2>
          <p className="text-slate-500 text-sm">
            We sent a password reset link to <strong>{email}</strong>.
            The link expires in 24 hours.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium mt-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm animate-fade-in">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reset your password</h1>
        <p className="text-slate-500 text-sm mt-1.5">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-10 text-sm font-semibold"
            disabled={loading}
            style={{ backgroundColor: 'var(--app-primary)' }}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
            ) : (
              'Send Reset Link'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
