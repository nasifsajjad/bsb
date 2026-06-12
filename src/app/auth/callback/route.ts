import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase PKCE auth callback — handles invite links, magic links, and password reset links.
 *
 * Supabase redirects here with a one-time `code`. We exchange it for a session,
 * then send the user to wherever `next` points (set by whoever constructed the link).
 *
 * Supported `next` values set by the app:
 *   /auth/set-password    — invited user needs to create their password
 *   /auth/update-password — existing user is resetting their password
 *   /dashboard            — default for magic-link / OAuth logins
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/dashboard'
  const error = url.searchParams.get('error')
  const errorDesc = url.searchParams.get('error_description')

  // Surface Supabase errors back to the login page
  if (error) {
    const loginUrl = new URL('/login', url.origin)
    loginUrl.searchParams.set('error', errorDesc ?? error)
    return NextResponse.redirect(loginUrl)
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=Missing+auth+code', url.origin))
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    const loginUrl = new URL('/login', url.origin)
    loginUrl.searchParams.set('error', exchangeError.message)
    return NextResponse.redirect(loginUrl)
  }

  // Validate `next` is a relative path (prevent open-redirect)
  const safeNext = next.startsWith('/') ? next : '/dashboard'
  return NextResponse.redirect(new URL(safeNext, url.origin))
}
