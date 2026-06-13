import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

type Params = { params: Promise<{ id: string }> }

/**
 * DELETE /api/admin/users/[id]
 * Permanently deletes a user from Supabase Auth (cascades to profiles).
 * Only super_admin users can call this endpoint.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id: targetId } = await params

  // 1. Verify caller is a super_admin
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

  // 2. Prevent self-deletion
  if (targetId === user.id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  // 3. Delete from Supabase Auth (profiles cascade via FK)
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(targetId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

/**
 * POST /api/admin/users/[id]
 * Regenerate a one-time access link for an existing user (e.g. they lost the
 * original invite or it expired). Returns the link for the admin to share.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { id: targetId } = await params

  // Verify caller is a super_admin
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

  // Get target user's email
  const admin = createAdminClient()
  const { data: targetUser, error: getUserError } = await admin.auth.admin.getUserById(targetId)

  if (getUserError || !targetUser.user?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const origin = request.headers.get('origin') ?? new URL(request.url).origin

  // The user already exists, so we use a 'recovery' link rather than 'invite'
  // ('invite' would error because the auth user is already created). Recovery
  // generates a one-time hashed_token the user can verify to set a password.
  // generateLink does NOT send an email — we hand the link back to the admin.
  const { data: linkData, error: inviteError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: targetUser.user.email,
    options: { redirectTo: `${origin}/auth/callback?next=/auth/set-password` },
  })

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  const hashed_token = linkData?.properties?.hashed_token
  const inviteLink = hashed_token
    ? `${origin}/auth/callback?token_hash=${encodeURIComponent(hashed_token)}&type=recovery&next=/auth/set-password`
    : null

  return NextResponse.json({ success: true, inviteLink })
}
