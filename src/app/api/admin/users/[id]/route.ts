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
 * Resend an invitation email to a user who hasn't confirmed yet.
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

  // Re-send the invite
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    targetUser.user.email,
    { redirectTo: `${origin}/auth/callback?next=/auth/set-password` }
  )

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
