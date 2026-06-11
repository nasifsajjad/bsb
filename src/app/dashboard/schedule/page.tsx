'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import type { Event, Branch, Profile } from '@/lib/types'
import { format, isAfter, isBefore, isToday } from 'date-fns'
import { Plus, Calendar, MapPin, Trash2, Edit2, Clock } from 'lucide-react'
import { toast } from 'sonner'

const EMPTY_FORM = {
  title: '',
  description: '',
  start_at: '',
  end_at: '',
  location: '',
  branch_id: '',
}

export default function SchedulePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'upcoming' | 'past' | 'all'>('upcoming')

  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: e }, { data: b }, { data: p }] = await Promise.all([
      supabase.from('events').select('*, branch:branches(name)').order('start_at', { ascending: true }),
      supabase.from('branches').select('*').order('name'),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])

    setEvents(e ?? [])
    setBranches(b ?? [])
    setProfile(p)
    setLoading(false)
  }

  const canEdit = profile?.role !== 'area_leader'

  function openCreate() {
    setEditEvent(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(event: Event) {
    setEditEvent(event)
    setForm({
      title: event.title,
      description: event.description ?? '',
      start_at: event.start_at ? event.start_at.slice(0, 16) : '',
      end_at: event.end_at ? event.end_at.slice(0, 16) : '',
      location: event.location ?? '',
      branch_id: event.branch_id ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (!form.start_at) { toast.error('Start date is required'); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_at: new Date(form.start_at).toISOString(),
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      location: form.location.trim() || null,
      branch_id: form.branch_id || null,
    }

    if (editEvent) {
      const { error } = await supabase.from('events').update(payload).eq('id', editEvent.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Event updated')
    } else {
      const { error } = await supabase.from('events').insert({ ...payload, created_by: user?.id })
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Event created')
    }

    setSaving(false)
    setDialogOpen(false)
    load()
  }

  async function handleDelete() {
    if (!deleteId) return
    const { error } = await supabase.from('events').delete().eq('id', deleteId)
    if (error) { toast.error(error.message); return }
    toast.success('Event deleted')
    setDeleteId(null)
    load()
  }

  const now = new Date()
  const filtered = events.filter(e => {
    const d = new Date(e.start_at)
    if (view === 'upcoming') return isAfter(d, now) || isToday(d)
    if (view === 'past') return isBefore(d, now) && !isToday(d)
    return true
  })

  // Group by month
  const grouped: Record<string, Event[]> = {}
  filtered.forEach(e => {
    const key = format(new Date(e.start_at), 'MMMM yyyy')
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(e)
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Schedule & Events</h2>
          <p className="text-sm text-slate-500 mt-0.5">{events.length} events total</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            {(['upcoming', 'all', 'past'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all ${
                  view === v ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          {canEdit && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New Event
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i}>
              <Skeleton className="h-5 w-32 mb-3" />
              <div className="space-y-3">
                {[1, 2, 3].map(j => <Skeleton key={j} className="h-20 w-full rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-400">No events {view === 'upcoming' ? 'scheduled' : 'found'}</p>
          {canEdit && (
            <Button variant="outline" className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Create first event
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([month, monthEvents]) => (
            <div key={month}>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span className="w-4 h-0.5 bg-brand-400 inline-block rounded" />
                {month}
              </h3>
              <div className="space-y-3">
                {monthEvents.map(event => {
                  const startDate = new Date(event.start_at)
                  const isPast = isBefore(startDate, now) && !isToday(startDate)
                  const isToday_ = isToday(startDate)
                  return (
                    <Card
                      key={event.id}
                      className={`hover:shadow-md transition-all ${isPast ? 'opacity-60' : ''} animate-slide-in`}
                    >
                      <CardContent className="py-4">
                        <div className="flex gap-4">
                          {/* Date badge */}
                          <div className={`shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                            isToday_ ? 'bg-brand-600 text-white' : 'bg-brand-50'
                          }`}>
                            <span className={`text-[11px] font-semibold uppercase tracking-wide leading-none ${
                              isToday_ ? 'text-white/80' : 'text-brand-600'
                            }`}>
                              {format(startDate, 'MMM')}
                            </span>
                            <span className={`text-xl font-bold leading-tight ${
                              isToday_ ? 'text-white' : 'text-brand-700'
                            }`}>
                              {format(startDate, 'd')}
                            </span>
                          </div>

                          {/* Event details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-slate-900">{event.title}</p>
                                {event.description && (
                                  <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{event.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {isToday_ && <Badge variant="default" className="text-[10px]">Today</Badge>}
                                {isPast && <Badge variant="secondary" className="text-[10px]">Past</Badge>}
                                {canEdit && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      className="text-slate-400 hover:text-slate-600"
                                      onClick={() => openEdit(event)}
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      className="text-slate-400 hover:text-red-500"
                                      onClick={() => setDeleteId(event.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-2.5">
                              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {format(startDate, 'h:mm a')}
                                {event.end_at && ` — ${format(new Date(event.end_at), 'h:mm a')}`}
                              </span>
                              {event.location && (
                                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                  {event.location}
                                </span>
                              )}
                              {(event as any).branch?.name && (
                                <Badge variant="secondary" className="text-[10px] py-0.5">
                                  {(event as any).branch.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editEvent ? 'Edit Event' : 'New Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ev-title">Title *</Label>
              <Input
                id="ev-title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Event title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-desc">Description</Label>
              <Textarea
                id="ev-desc"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Details about the event…"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ev-start">Start *</Label>
                <Input
                  id="ev-start"
                  type="datetime-local"
                  value={form.start_at}
                  onChange={e => setForm(f => ({ ...f, start_at: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-end">End</Label>
                <Input
                  id="ev-end"
                  type="datetime-local"
                  value={form.end_at}
                  onChange={e => setForm(f => ({ ...f, end_at: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-loc">Location</Label>
              <Input
                id="ev-loc"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Venue or address"
              />
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select
                value={form.branch_id || 'none'}
                onValueChange={v => setForm(f => ({ ...f, branch_id: v === 'none' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All branches / org-wide" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All branches</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editEvent ? 'Update' : 'Create Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>This event will be permanently deleted.</AlertDialogDescription>
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
