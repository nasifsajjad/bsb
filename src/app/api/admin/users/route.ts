import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/users
 * Returns a map of { userId: email } for all auth users.
 * Only super_admin users can call this endpoint.
 */
export async function GET() {
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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  // listUsers returns paginated results — fetch up to 1000 for typical org sizes
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 1000 })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return a map { id → email } so the users page can merge it in
  const emailMap: Record<string, string> = {}
  users.forEach(u => {
    if (u.email) emailMap[u.id] = u.email
  })

  return NextResponse.json({ emails: emailMap })
}
