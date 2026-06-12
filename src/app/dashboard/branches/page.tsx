'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatBHD, getInitials } from '@/lib/utils'
import type { Branch, Profile, Report } from '@/lib/types'
import { Building2, Users, HandCoins, BookOpen, Phone, Edit2, Search, ArrowRight, CalendarDays, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { DialogDescription } from '@/components/ui/dialog'

interface BranchWithStats extends Branch {
  totalAttendance: number
  totalSessions: number
  totalCharity: number
  reportCount: number
  lastReportDate: string | null
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchWithStats[]>([])
  const [leaders, setLeaders] = useState<Profile[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editBranch, setEditBranch] = useState<Branch | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [form, setForm] = useState({ contact: '', leader_id: '' })
  const [newBranchName, setNewBranchName] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: b }, { data: r }, { data: p }, { data: leaderList }] = await Promise.all([
      supabase.from('branches').select('*, leader:profiles!leader_id(id, full_name, phone, avatar_url)').order('name'),
      supabase.from('reports').select('branch_id, attendance, sessions, charity_bhd, created_at').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('profiles').select('*').in('role', ['area_leader']).order('full_name'),
    ])

    const reportsData = r ?? []
    const branchesData = (b ?? []).map(branch => {
      const branchReports = reportsData.filter(rep => rep.branch_id === branch.id)
      return {
        ...branch,
        totalAttendance: branchReports.reduce((a, rep) => a + (rep.attendance ?? 0), 0),
        totalSessions:   branchReports.reduce((a, rep) => a + (rep.sessions ?? 0), 0),
        totalCharity:    branchReports.reduce((a, rep) => a + Number(rep.charity_bhd ?? 0), 0),
        reportCount:     branchReports.length,
        lastReportDate:  branchReports[0]?.created_at ?? null,
      }
    })

    setBranches(branchesData)
    setProfile(p)
    setLeaders(leaderList ?? [])
    setLoading(false)
  }

  const canEdit = profile?.role !== 'area_leader'

  function openEdit(branch: Branch) {
    setEditBranch(branch)
    setForm({
      contact: (branch as any).contact ?? '',
      leader_id: (branch as any).leader_id ?? '',
    })
    setDialogOpen(true)
  }

  async function handleAddBranch() {
    if (!newBranchName.trim()) { toast.error('Branch name is required'); return }
    setSaving(true)

    const { error } = await supabase
      .from('branches')
      .insert({ name: newBranchName.trim() })

    if (error) {
      toast.error(error.message.includes('unique') ? 'A branch with this name already exists' : error.message)
      setSaving(false)
      return
    }
    toast.success(`${newBranchName.trim()} branch created`)
    setSaving(false)
    setAddDialogOpen(false)
    setNewBranchName('')
    load()
  }

  async function handleSave() {
    if (!editBranch) return
    setSaving(true)

    const { error } = await supabase
      .from('branches')
      .update({
        contact: form.contact.trim() || null,
        leader_id: form.leader_id || null,
      })
      .eq('id', editBranch.id)

    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Branch updated')
    setSaving(false)
    setDialogOpen(false)
    load()
  }

  const filtered = branches.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase())
  )

  const topByAttendance = [...branches].sort((a, b) => b.totalAttendance - a.totalAttendance)[0]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Branch Overview</h2>
          <p className="text-sm text-slate-500 mt-0.5">{branches.length} branches across Bahrain</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search branches…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 sm:w-56"
            />
          </div>
          {profile?.role === 'super_admin' && (
            <Button size="sm" className="gap-2 shrink-0" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Branch
            </Button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Branches', value: branches.length.toString(), icon: Building2 },
          { label: 'Total Attendance', value: branches.reduce((a, b) => a + b.totalAttendance, 0).toLocaleString(), icon: Users },
          { label: 'Total Sessions', value: branches.reduce((a, b) => a + b.totalSessions, 0).toLocaleString(), icon: BookOpen },
          { label: 'Total Charity', value: formatBHD(branches.reduce((a, b) => a + b.totalCharity, 0)), icon: HandCoins },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="stat-accent">
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 bg-brand-50 rounded-lg shrink-0">
                <Icon className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 leading-tight">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Branch cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5 space-y-3">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <div className="grid grid-cols-3 gap-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
          {filtered.map(branch => {
            const leader = (branch as any).leader
            const isTopBranch = branch.id === topByAttendance?.id && branch.totalAttendance > 0
            return (
              <Card key={branch.id} className={`animate-fade-in hover:shadow-md transition-all ${isTopBranch ? 'ring-2 ring-gold-400' : ''}`}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-sm">
                          {branch.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{branch.name}</h3>
                          {isTopBranch && (
                            <Badge variant="gold" className="text-[10px]">Top</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{branch.reportCount} reports</p>
                          {branch.lastReportDate && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <CalendarDays className="h-2.5 w-2.5" />
                              Last: {formatDate(branch.lastReportDate)}
                            </p>
                          )}
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-slate-400 hover:text-slate-600 shrink-0"
                        onClick={() => openEdit(branch)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Leader */}
                  {leader ? (
                    <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-lg mb-4">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={leader.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">{getInitials(leader.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-700 truncate">{leader.full_name}</p>
                        <p className="text-xs text-slate-500">Branch Leader</p>
                      </div>
                      {(branch.contact || leader.phone) && (
                        <a
                          href={`tel:${branch.contact || leader.phone}`}
                          className="text-brand-600 hover:text-brand-700 shrink-0"
                          aria-label="Call"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg mb-4">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-400">No leader assigned</p>
                    </div>
                  )}

                  {/* View details link */}
                  <Link href={`/dashboard/branches/${branch.id}`} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium mb-3">
                    View full history
                    <ArrowRight className="h-3 w-3" />
                  </Link>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Attendance', value: branch.totalAttendance.toLocaleString(), color: 'text-brand-700' },
                      { label: 'Sessions', value: branch.totalSessions.toString(), color: 'text-teal-700' },
                      { label: 'Charity', value: `${branch.totalCharity.toFixed(1)} BD`, color: 'text-gold-700' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="text-center p-2 bg-slate-50 rounded-lg">
                        <p className={`text-sm font-bold ${color}`}>{value}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Branch Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Branch</DialogTitle>
            <DialogDescription>Create a new branch. You can assign a leader after creation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="branch-name">Branch Name <span className="text-red-500">*</span></Label>
              <Input
                id="branch-name"
                placeholder="e.g. East Riffa"
                value={newBranchName}
                onChange={e => setNewBranchName(e.target.value)}
                disabled={saving}
                onKeyDown={e => e.key === 'Enter' && handleAddBranch()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleAddBranch} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Creating…</> : 'Create Branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit {editBranch?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Branch Leader</Label>
              <Select value={form.leader_id || 'none'} onValueChange={v => setForm(f => ({ ...f, leader_id: v === 'none' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="No leader assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No leader</SelectItem>
                  {leaders.map(l => <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact / Phone</Label>
              <Input
                id="contact"
                value={form.contact}
                onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                placeholder="+973 XXXX XXXX"
              />
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
