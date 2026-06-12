import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Supabase auth callback — handles two distinct flows:
 *
 * 1. token_hash flow (email invite / password reset)
 *    URL: /auth/callback?token_hash=xxx&type=invite&next=/auth/set-password
 *    Uses verifyOtp() — no PKCE code_verifier required.
 *    This is the flow used when the Supabase email templates are configured
 *    to link directly to this route with {{ .Token }} as token_hash.
 *
 * 2. PKCE code flow (OAuth / magic links)
 *    URL: /auth/callback?code=xxx&next=/dashboard
 *    Uses exchangeCodeForSession() — requires a prior code_verifier cookie.
 *    Works for OAuth providers and client-initiated sign-in flows.
 *
 * We check token_hash first because it is the reliable path for all
 * email-based flows (invite, recovery). The code path is a fallback.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')
  const type       = url.searchParams.get('type') as EmailOtpType | null
  const code       = url.searchParams.get('code')
  const next       = url.searchParams.get('next') ?? '/dashboard'
  const error      = url.searchParams.get('error')
  const errorDesc  = url.searchParams.get('error_description')

  // Surface errors that Supabase itself returns (e.g. expired link)
  if (error) {
    const dest = new URL('/login', url.origin)
    dest.searchParams.set('error', errorDesc ?? error)
    return NextResponse.redirect(dest)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()                    { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const safeNext = next.startsWith('/') ? next : '/dashboard'

  // ── Path 1: token_hash (invite / recovery emails) ──────────────
  if (token_hash && type) {
    const { error: otpError } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!otpError) {
      return NextResponse.redirect(new URL(safeNext, url.origin))
    }
    const dest = new URL('/login', url.origin)
    dest.searchParams.set('error', otpError.message)
    return NextResponse.redirect(dest)
  }

  // ── Path 2: PKCE code (OAuth / client-initiated flows) ─────────
  if (code) {
    const { error: codeError } = await supabase.auth.exchangeCodeForSession(code)
    if (!codeError) {
      return NextResponse.redirect(new URL(safeNext, url.origin))
    }
    const dest = new URL('/login', url.origin)
    dest.searchParams.set('error', codeError.message)
    return NextResponse.redirect(dest)
  }

  return NextResponse.redirect(new URL('/login?error=Missing+auth+parameters', url.origin))
}
