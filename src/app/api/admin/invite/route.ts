import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * POST /api/admin/invite
 * Invites a new user by email using the Supabase admin API.
 * Only super_admin users can call this endpoint.
 * The invite email contains a link to /auth/callback?next=/auth/set-password
 * which lets the invited user set their password on first login.
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

  // 3. Use admin client to invite the user
  const admin = createAdminClient()
  const origin = request.headers.get('origin') ?? new URL(request.url).origin

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name },
    redirectTo: `${origin}/auth/callback?next=/auth/set-password`,
  })

  if (inviteError) {
    // "User already registered" is a common case — surface it clearly
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  // 4. Update the profile with the correct role + branch
  //    (the handle_new_user trigger already created a profile row)
  if (inviteData?.user) {
    await admin.from('profiles').upsert({
      id: inviteData.user.id,
      full_name,
      role,
      branch_id: branch_id || null,
      updated_at: new Date().toISOString(),
    })
  }

  return NextResponse.json({ success: true, userId: inviteData?.user?.id })
}
