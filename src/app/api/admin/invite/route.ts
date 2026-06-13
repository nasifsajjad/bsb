import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * POST /api/admin/invite
 *
 * Uses admin.generateLink({ type: 'invite' }) rather than inviteUserByEmail.
 *
 * Why: inviteUserByEmail redirects through Supabase's verify endpoint which
 * appends a PKCE ?code= to the callback URL. Fresh users have no code_verifier
 * cookie, so exchangeCodeForSession() fails with "invalid auth code".
 *
 * generateLink returns a hashed_token we can embed directly in the callback URL:
 *   /auth/callback?token_hash=<hashed_token>&type=invite&next=/auth/set-password
 *
 * The callback verifies this with verifyOtp({ token_hash, type }) — no PKCE
 * verifier required.
 *
 * IMPORTANT: generateLink does NOT send any email — it only returns the link.
 * That is exactly what we want here: no SMTP / email-template setup is needed.
 * We return the link to the admin, who shares it with the new user via any
 * channel (WhatsApp, Telegram, internal email, etc.).
 */
export async function POST(request: NextRequest) {
  // 1. Verify the caller is authenticated and is a super_admin
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden: super_admin only' }, { status: 403 })
  }

  // 2. Parse body
  let body: { email?: string; full_name?: string; role?: string; branch_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email, full_name, role, branch_id } = body

  if (!email || !full_name || !role) {
    return NextResponse.json({ error: 'email, full_name, and role are required' }, { status: 400 })
  }

  const validRoles = ['super_admin', 'committee', 'area_leader']
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const admin = createAdminClient()
  const origin = request.headers.get('origin') ?? new URL(request.url).origin

  // 3. Generate the invite link. This creates the auth user (for type 'invite')
  //    and returns a hashed_token. No email is sent — we hand the link back.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: { full_name },
      redirectTo: `${origin}/auth/callback?next=/auth/set-password`,
    },
  })

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 400 })
  }

  // 4. Set the correct role + branch on the new profile
  if (linkData?.user) {
    await admin.from('profiles').upsert({
      id: linkData.user.id,
      full_name,
      role,
      branch_id: branch_id || null,
      updated_at: new Date().toISOString(),
    })
  }

  // 5. Build a direct link using hashed_token — works without PKCE verifier
  const hashed_token = linkData?.properties?.hashed_token
  const inviteLink = hashed_token
    ? `${origin}/auth/callback?token_hash=${encodeURIComponent(hashed_token)}&type=invite&next=/auth/set-password`
    : null

  return NextResponse.json({
    success: true,
    userId: linkData?.user?.id,
    inviteLink,
  })
}
