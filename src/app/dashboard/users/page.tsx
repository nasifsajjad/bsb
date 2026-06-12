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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Profile, Branch } from '@/lib/types'
import { getInitials, formatDate } from '@/lib/utils'
import { Search, UserPlus, Edit2, Users, Trash2, MailCheck, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  committee: 'Committee',
  area_leader: 'Area Leader',
}

const roleColor: Record<string, 'gold' | 'default' | 'secondary'> = {
  super_admin: 'gold',
  committee: 'default',
  area_leader: 'secondary',
}

type Mode = 'edit' | 'invite'

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [emailMap, setEmailMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<Mode>('edit')
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)

  // Invite form
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    role: 'area_leader',
    branch_id: '',
  })

  // Edit form
  const [editForm, setEditForm] = useState({ role: 'area_leader', branch_id: '' })

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [deleting, setDeleting] = useState(false)

  const supabase = createClient()

  useEffect(() => { load() }, [])

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

    // Load emails in the background (super_admin only)
    if (me?.role === 'super_admin') {
      fetch('/api/admin/users')
        .then(r => r.json())
        .then(d => { if (d.emails) setEmailMap(d.emails) })
        .catch(() => {/* silent fail — emails just won't show */})
    }
  }

  const isAdmin = currentUser?.role === 'super_admin'

  // ── Invite user ──────────────────────────────────────────────
  function openInvite() {
    setInviteForm({ email: '', full_name: '', role: 'area_leader', branch_id: '' })
    setDialogMode('invite')
    setDialogOpen(true)
  }

  async function handleInvite() {
    if (!inviteForm.email.trim() || !inviteForm.full_name.trim()) {
      toast.error('Email and full name are required')
      return
    }
    setSaving(true)

    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteForm),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error ?? 'Failed to invite user')
      setSaving(false)
      return
    }

    toast.success(`Invite sent to ${inviteForm.email}`, {
      description: 'They will receive an email to set their password.',
    })
    setSaving(false)
    setDialogOpen(false)
    load()
  }

  // ── Edit role/branch ─────────────────────────────────────────
  function openEdit(user: Profile) {
    setEditUser(user)
    setEditForm({ role: user.role, branch_id: user.branch_id ?? '' })
    setDialogMode('edit')
    setDialogOpen(true)
  }

  async function handleEditSave() {
    if (!editUser) return
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        role: editForm.role,
        branch_id: editForm.branch_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editUser.id)

    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('User updated successfully')
    setSaving(false)
    setDialogOpen(false)
    load()
  }

  // ── Resend invite ────────────────────────────────────────────
  async function handleResendInvite(user: Profile) {
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Failed to resend invite')
    } else {
      toast.success(`Invite resent to ${user.full_name}`)
    }
  }

  // ── Delete user ──────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)

    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error ?? 'Failed to delete user')
      setDeleting(false)
      return
    }

    toast.success(`${deleteTarget.full_name} has been removed`)
    setDeleting(false)
    setDeleteTarget(null)
    load()
  }

  // ── Filtered users ───────────────────────────────────────────
  const filtered = users.filter(u => {
    const matchesSearch =
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.role?.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  // ── Guard ────────────────────────────────────────────────────
  if (!loading && !isAdmin) {
    return (
      <div className="text-center py-20">
        <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-400">Only super admins can manage users.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">User Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">{users.length} users registered</p>
        </div>
        <Button onClick={openInvite} className="gap-2 shrink-0">
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Role summary pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'All', value: 'all', count: users.length, color: 'bg-slate-100 text-slate-700' },
          { label: 'Super Admins', value: 'super_admin', count: users.filter(u => u.role === 'super_admin').length, color: 'bg-gold-50 text-gold-700' },
          { label: 'Committee', value: 'committee', count: users.filter(u => u.role === 'committee').length, color: 'bg-brand-50 text-brand-700' },
          { label: 'Area Leaders', value: 'area_leader', count: users.filter(u => u.role === 'area_leader').length, color: 'bg-slate-100 text-slate-600' },
        ].map(({ label, value, count, color }) => (
          <button
            key={value}
            onClick={() => setRoleFilter(value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${color} ${roleFilter === value ? 'ring-2 ring-offset-1 ring-brand-400' : 'opacity-80 hover:opacity-100'}`}
          >
            {label}: {count}
          </button>
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
        ) : filtered.length === 0 ? (
          <CardContent className="py-16 text-center">
            <Users className="h-8 w-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No users found</p>
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
                  <TableHead className="w-24">Actions</TableHead>
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
                          {emailMap[user.id] && (
                            <p className="text-xs text-slate-400 truncate max-w-[180px]">{emailMap[user.id]}</p>
                          )}
                          {!emailMap[user.id] && user.phone && (
                            <p className="text-xs text-slate-400">{user.phone}</p>
                          )}
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
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-slate-400 hover:text-brand-600"
                          onClick={() => openEdit(user)}
                          title="Edit role & branch"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-slate-400 hover:text-blue-600"
                          onClick={() => handleResendInvite(user)}
                          title="Resend invite email"
                        >
                          <MailCheck className="h-3.5 w-3.5" />
                        </Button>
                        {user.id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-slate-400 hover:text-red-600"
                            onClick={() => setDeleteTarget(user)}
                            title="Delete user"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* ── Invite / Edit Dialog ──────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          {dialogMode === 'invite' ? (
            <>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  An email will be sent with a link to set their password.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="invite-name"
                    placeholder="Ahmad Al-Mansoori"
                    value={inviteForm.full_name}
                    onChange={e => setInviteForm(f => ({ ...f, full_name: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address <span className="text-red-500">*</span></Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteForm.email}
                    onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role <span className="text-red-500">*</span></Label>
                  <Select
                    value={inviteForm.role}
                    onValueChange={v => setInviteForm(f => ({ ...f, role: v, branch_id: v !== 'area_leader' ? '' : f.branch_id }))}
                    disabled={saving}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="committee">Committee</SelectItem>
                      <SelectItem value="area_leader">Area Leader</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {inviteForm.role === 'area_leader' && (
                  <div className="space-y-2">
                    <Label>Assign to Branch</Label>
                    <Select
                      value={inviteForm.branch_id || 'none'}
                      onValueChange={v => setInviteForm(f => ({ ...f, branch_id: v === 'none' ? '' : v }))}
                      disabled={saving}
                    >
                      <SelectTrigger><SelectValue placeholder="No branch (assign later)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No branch assigned</SelectItem>
                        {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                <Button onClick={handleInvite} disabled={saving} className="gap-2">
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</> : <><MailCheck className="h-4 w-4" />Send Invite</>}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Edit User — {editUser?.full_name}</DialogTitle>
                <DialogDescription>Change role and branch assignment.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="committee">Committee</SelectItem>
                      <SelectItem value="area_leader">Area Leader</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select value={editForm.branch_id || 'none'} onValueChange={v => setEditForm(f => ({ ...f, branch_id: v === 'none' ? '' : v }))} disabled={saving}>
                    <SelectTrigger><SelectValue placeholder="No branch" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No branch</SelectItem>
                      {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                <Button onClick={handleEditSave} disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : 'Save Changes'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove their account and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin" />Deleting…</> : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
