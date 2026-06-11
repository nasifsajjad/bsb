'use client'

import { useEffect, useState, useCallback } from 'react'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatBHD, formatDateRange, formatDate } from '@/lib/utils'
import type { Report, Branch, Profile } from '@/lib/types'
import {
  Plus, Search, FileText, Download, Trash2, Edit2,
  FileSpreadsheet,
} from 'lucide-react'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const EMPTY_FORM = {
  branch_id: '',
  period_type: 'monthly' as 'weekly' | 'monthly',
  period_start: '',
  period_end: '',
  attendance: 0,
  sessions: 0,
  charity_bhd: 0,
  subjects: '',
  notes: '',
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState<'all' | 'weekly' | 'monthly'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editReport, setEditReport] = useState<Report | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: r }, { data: b }, { data: p }] = await Promise.all([
      supabase
        .from('reports')
        .select('*, branch:branches(name), submitter:profiles!submitted_by(full_name)')
        .order('period_start', { ascending: false }),
      supabase.from('branches').select('*').order('name'),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])

    setReports(r ?? [])
    setBranches(b ?? [])
    setProfile(p)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const isElevated = profile?.role !== 'area_leader'

  function openCreate() {
    setEditReport(null)
    setForm({
      ...EMPTY_FORM,
      branch_id: profile?.branch_id ?? '',
    })
    setDialogOpen(true)
  }

  function openEdit(report: Report) {
    if (!isElevated && report.submitted_by !== profile?.id) {
      toast.error('You can only edit your own reports')
      return
    }
    setEditReport(report)
    setForm({
      branch_id: report.branch_id,
      period_type: report.period_type,
      period_start: report.period_start,
      period_end: report.period_end,
      attendance: report.attendance,
      sessions: report.sessions,
      charity_bhd: Number(report.charity_bhd),
      subjects: report.subjects ?? '',
      notes: report.notes ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.branch_id) { toast.error('Please select a branch'); return }
    if (!form.period_start || !form.period_end) { toast.error('Period dates are required'); return }
    if (new Date(form.period_end) < new Date(form.period_start)) {
      toast.error('End date must be after start date')
      return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      branch_id: form.branch_id,
      period_type: form.period_type,
      period_start: form.period_start,
      period_end: form.period_end,
      attendance: form.attendance,
      sessions: form.sessions,
      charity_bhd: form.charity_bhd,
      subjects: form.subjects.trim() || null,
      notes: form.notes.trim() || null,
    }

    if (editReport) {
      const { error } = await supabase
        .from('reports')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editReport.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Report updated')
    } else {
      const { error } = await supabase
        .from('reports')
        .insert({ ...payload, submitted_by: user?.id })
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Report submitted')
    }

    setSaving(false)
    setDialogOpen(false)
    load()
  }

  async function handleDelete() {
    if (!deleteId) return
    const { error } = await supabase.from('reports').delete().eq('id', deleteId)
    if (error) { toast.error(error.message); return }
    toast.success('Report deleted')
    setDeleteId(null)
    load()
  }

  const filtered = reports.filter(r => {
    const matchBranch = branchFilter === 'all' || r.branch_id === branchFilter
    const matchPeriod = periodFilter === 'all' || r.period_type === periodFilter
    const matchSearch = !search || (r as any).branch?.name?.toLowerCase().includes(search.toLowerCase())
    return matchBranch && matchPeriod && matchSearch
  })

  function exportCSV() {
    const rows = filtered.map(r => ({
      Branch: (r as any).branch?.name ?? '',
      'Period Type': r.period_type,
      'Start Date': r.period_start,
      'End Date': r.period_end,
      Attendance: r.attendance,
      Sessions: r.sessions,
      'Charity (BHD)': Number(r.charity_bhd).toFixed(3),
      Subjects: r.subjects ?? '',
      Notes: r.notes ?? '',
      'Submitted By': (r as any).submitter?.full_name ?? '',
      'Submitted At': formatDate(r.created_at),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reports')
    XLSX.writeFile(wb, 'uyf-reports.xlsx')
    toast.success('Exported to Excel')
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16)
    doc.text('United Youth Forum — Reports', 14, 18)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25)

    autoTable(doc, {
      startY: 32,
      head: [['Branch', 'Period', 'Start', 'End', 'Attendance', 'Sessions', 'Charity (BHD)', 'Submitted By']],
      body: filtered.map(r => [
        (r as any).branch?.name ?? '',
        r.period_type,
        r.period_start,
        r.period_end,
        r.attendance.toString(),
        r.sessions.toString(),
        Number(r.charity_bhd).toFixed(3),
        (r as any).submitter?.full_name ?? '',
      ]),
      headStyles: { fillColor: [22, 163, 74] },
      styles: { fontSize: 9 },
    })

    doc.save('uyf-reports.pdf')
    toast.success('Exported to PDF')
  }

  const totals = {
    attendance: filtered.reduce((a, r) => a + r.attendance, 0),
    sessions:   filtered.reduce((a, r) => a + r.sessions, 0),
    charity:    filtered.reduce((a, r) => a + Number(r.charity_bhd), 0),
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reports</h2>
          <p className="text-sm text-slate-500 mt-0.5">{reports.length} reports submitted</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2">
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Submit Report
          </Button>
        </div>
      </div>

      {/* Totals cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Attendance', value: totals.attendance.toLocaleString() },
          { label: 'Total Sessions', value: totals.sessions.toLocaleString() },
          { label: 'Total Charity', value: formatBHD(totals.charity) },
        ].map(({ label, value }) => (
          <Card key={label} className="stat-accent">
            <CardContent className="py-4 text-center">
              <p className="text-xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by branch…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {isElevated && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Tabs value={periodFilter} onValueChange={v => setPeriodFilter(v as typeof periodFilter)} className="shrink-0">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <CardContent className="pt-4">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          </CardContent>
        ) : filtered.length === 0 ? (
          <CardContent className="py-16 text-center">
            <FileText className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-400">No reports found</p>
            <Button variant="outline" className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Submit first report
            </Button>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead className="text-right">Attendance</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Charity (BHD)</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(report => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{(report as any).branch?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={report.period_type === 'weekly' ? 'info' : 'secondary'} className="capitalize">
                        {report.period_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {formatDateRange(report.period_start, report.period_end)}
                    </TableCell>
                    <TableCell className="text-right font-medium">{report.attendance.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{report.sessions}</TableCell>
                    <TableCell className="text-right font-medium text-gold-700">
                      {formatBHD(Number(report.charity_bhd))}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {(report as any).submitter?.full_name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        {(isElevated || report.submitted_by === profile?.id) && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-slate-400 hover:text-slate-600"
                              onClick={() => openEdit(report)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            {isElevated && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-slate-400 hover:text-red-500"
                                onClick={() => setDeleteId(report.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </>
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editReport ? 'Edit Report' : 'Submit Report'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Branch *</Label>
              <Select
                value={form.branch_id || 'none'}
                onValueChange={v => setForm(f => ({ ...f, branch_id: v === 'none' ? '' : v }))}
                disabled={!!profile?.branch_id && !isElevated}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Period Type *</Label>
              <Select value={form.period_type} onValueChange={v => setForm(f => ({ ...f, period_type: v as 'weekly' | 'monthly' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Start Date *</Label>
                <Input
                  id="start"
                  type="date"
                  value={form.period_start}
                  onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">End Date *</Label>
                <Input
                  id="end"
                  type="date"
                  value={form.period_end}
                  onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="att">Attendance</Label>
                <Input
                  id="att"
                  type="number"
                  min={0}
                  value={form.attendance}
                  onChange={e => setForm(f => ({ ...f, attendance: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ses">Sessions</Label>
                <Input
                  id="ses"
                  type="number"
                  min={0}
                  value={form.sessions}
                  onChange={e => setForm(f => ({ ...f, sessions: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="charity">Charity (BHD)</Label>
                <Input
                  id="charity"
                  type="number"
                  min={0}
                  step="0.001"
                  value={form.charity_bhd}
                  onChange={e => setForm(f => ({ ...f, charity_bhd: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subjects">Subjects / Topics Taught</Label>
              <Textarea
                id="subjects"
                value={form.subjects}
                onChange={e => setForm(f => ({ ...f, subjects: e.target.value }))}
                placeholder="Topics covered this period…"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Highlights</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any noteworthy activities, achievements, or challenges…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editReport ? 'Update Report' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              This report will be permanently deleted. This action cannot be undone.
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
