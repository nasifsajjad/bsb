'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Profile, Branch } from '@/lib/types'
import { getInitials, formatDate } from '@/lib/utils'
import { Search, UserPlus, Edit2, Users } from 'lucide-react'
import { toast } from 'sonner'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  committee: 'Committee',
  area_leader: 'Area Leader',
}

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [form, setForm] = useState({ role: 'area_leader', branch_id: '' })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: u }, { data: b }, { data: me }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*, branch:branches(name)')
        .order('created_at', { ascending: false }),
      supabase.from('branches').select('*').order('name'),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])

    setUsers(u ?? [])
    setBranches(b ?? [])
    setCurrentUser(me)
    setLoading(false)
  }

  const isAdmin = currentUser?.role === 'super_admin'

  if (!loading && !isAdmin) {
    return (
      <div className="text-center py-20">
        <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-400">Only super admins can manage users.</p>
      </div>
    )
  }

  function openEdit(user: Profile) {
    setEditUser(user)
    setForm({
      role: user.role,
      branch_id: user.branch_id ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!editUser) return
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        role: form.role,
        branch_id: form.branch_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editUser.id)

    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('User updated')
    setSaving(false)
    setDialogOpen(false)
    load()
  }

  const filtered = users.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  )

  const roleColor: Record<string, 'gold' | 'default' | 'secondary'> = {
    super_admin: 'gold',
    committee: 'default',
    area_leader: 'secondary',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">User Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">{users.length} users registered</p>
        </div>
        <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          Invite users via Supabase Auth → Users dashboard
        </p>
      </div>

      {/* Summary */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Super Admins', count: users.filter(u => u.role === 'super_admin').length, color: 'bg-gold-50 text-gold-700' },
          { label: 'Committee', count: users.filter(u => u.role === 'committee').length, color: 'bg-brand-50 text-brand-700' },
          { label: 'Area Leaders', count: users.filter(u => u.role === 'area_leader').length, color: 'bg-slate-100 text-slate-700' },
        ].map(({ label, count, color }) => (
          <div key={label} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${color}`}>
            {label}: {count}
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search users…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <CardContent className="pt-4">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={user.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.full_name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{user.full_name || 'Unnamed'}</p>
                          {user.phone && <p className="text-xs text-slate-400">{user.phone}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleColor[user.role] ?? 'secondary'}>
                        {ROLE_LABELS[user.role] ?? user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {(user as any).branch?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-slate-400 hover:text-slate-600"
                        onClick={() => openEdit(user)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit User — {editUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="committee">Committee</SelectItem>
                  <SelectItem value="area_leader">Area Leader</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch (for area leaders)</Label>
              <Select value={form.branch_id || 'none'} onValueChange={v => setForm(f => ({ ...f, branch_id: v === 'none' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="No branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No branch</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
