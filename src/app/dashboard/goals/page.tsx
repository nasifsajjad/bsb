'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { formatDate, isOverdue, daysUntil } from '@/lib/utils'
import type { Goal, Branch, Profile } from '@/lib/types'
import {
  Plus, Search, Target, Calendar, AlertTriangle, Edit2, Trash2,
  CheckCircle, Clock, Filter,
} from 'lucide-react'
import { toast } from 'sonner'

type Category = 'active' | 'completed' | 'upcoming'

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'active' as Category,
  branch_id: '',
  target_metric: '',
  progress: 0,
  deadline: '',
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: g }, { data: b }, { data: p }] = await Promise.all([
      supabase.from('goals').select('*, branch:branches(name), creator:profiles!created_by(full_name)').order('created_at', { ascending: false }),
      supabase.from('branches').select('*').order('name'),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])

    setGoals(g ?? [])
    setBranches(b ?? [])
    setProfile(p)
    setLoading(false)
  }

  const canEdit = profile?.role !== 'area_leader'

  function openCreate() {
    setEditGoal(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(goal: Goal) {
    setEditGoal(goal)
    setForm({
      title: goal.title,
      description: goal.description ?? '',
      category: goal.category,
      branch_id: goal.branch_id ?? '',
      target_metric: goal.target_metric ?? '',
      progress: goal.progress,
      deadline: goal.deadline ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      branch_id: form.branch_id || null,
      target_metric: form.target_metric.trim() || null,
      progress: Math.min(100, Math.max(0, form.progress)),
      deadline: form.deadline || null,
    }

    if (editGoal) {
      const { error } = await supabase
        .from('goals')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editGoal.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Goal updated')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('goals')
        .insert({ ...payload, created_by: user?.id })
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Goal created')
    }

    setSaving(false)
    setDialogOpen(false)
    load()
  }

  async function handleDelete() {
    if (!deleteId) return
    const { error } = await supabase.from('goals').delete().eq('id', deleteId)
    if (error) { toast.error(error.message); return }
    toast.success('Goal deleted')
    setDeleteId(null)
    load()
  }

  const filtered = goals.filter(g => {
    const matchSearch = !search || g.title.toLowerCase().includes(search.toLowerCase())
    const matchCat = filter === 'all' || g.category === filter
    const matchBranch = branchFilter === 'all' || g.branch_id === branchFilter
    return matchSearch && matchCat && matchBranch
  })

  const counts = {
    active: goals.filter(g => g.category === 'active').length,
    upcoming: goals.filter(g => g.category === 'upcoming').length,
    completed: goals.filter(g => g.category === 'completed').length,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Goal Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">{goals.length} goals tracked</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4" />
            New Goal
          </Button>
        )}
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        {[
          { key: 'all', label: 'All', count: goals.length, color: 'bg-slate-100 text-slate-700' },
          { key: 'active', label: 'Active', count: counts.active, color: 'bg-brand-50 text-brand-700' },
          { key: 'upcoming', label: 'Upcoming', count: counts.upcoming, color: 'bg-gold-50 text-gold-700' },
          { key: 'completed', label: 'Completed', count: counts.completed, color: 'bg-emerald-50 text-emerald-700' },
        ].map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key as Category | 'all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === key ? `${color} ring-2 ring-offset-1 ring-current` : color
            }`}
          >
            {label} · {count}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search goals…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="All branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Goals grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Target className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-400">No goals found</p>
          {canEdit && (
            <Button variant="outline" className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Create first goal
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
          {filtered.map(goal => {
            const days = daysUntil(goal.deadline)
            const overdue = isOverdue(goal.deadline) && goal.category !== 'completed'
            return (
              <Card key={goal.id} className="animate-fade-in hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 leading-snug">{goal.title}</p>
                      {goal.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{goal.description}</p>
                      )}
                    </div>
                    <Badge
                      variant={goal.category === 'active' ? 'default' : goal.category === 'completed' ? 'success' : 'warning'}
                      className="shrink-0 capitalize"
                    >
                      {goal.category === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {goal.category === 'upcoming' && <Clock className="h-3 w-3 mr-1" />}
                      {goal.category}
                    </Badge>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Progress</span>
                      <span className="font-semibold text-slate-700">{goal.progress}%</span>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                  </div>

                  {/* Meta */}
                  <div className="space-y-1.5">
                    {(goal as any).branch?.name && (
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
                        {(goal as any).branch.name}
                      </p>
                    )}
                    {goal.deadline && (
                      <p className={`text-xs flex items-center gap-1.5 ${overdue ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
                        {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                        {overdue
                          ? `Overdue — due ${formatDate(goal.deadline)}`
                          : days !== null && days <= 7
                            ? `Due in ${days} day${days !== 1 ? 's' : ''}`
                            : `Due ${formatDate(goal.deadline)}`}
                      </p>
                    )}
                    {goal.target_metric && (
                      <p className="text-xs text-slate-400">Target: {goal.target_metric}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {canEdit && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
                      <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => openEdit(goal)}>
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteId(goal.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editGoal ? 'Edit Goal' : 'New Goal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Goal title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What does this goal aim to achieve?"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as Category }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={form.branch_id || 'none'} onValueChange={v => setForm(f => ({ ...f, branch_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Org-wide" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Org-wide</SelectItem>
                    {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="progress">Progress %</Label>
                <Input
                  id="progress"
                  type="number"
                  min={0} max={100}
                  value={form.progress}
                  onChange={e => setForm(f => ({ ...f, progress: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Target Metric</Label>
              <Input
                id="target"
                value={form.target_metric}
                onChange={e => setForm(f => ({ ...f, target_metric: e.target.value }))}
                placeholder="e.g. 500 attendees, BHD 1000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editGoal ? 'Update Goal' : 'Create Goal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              This goal will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
