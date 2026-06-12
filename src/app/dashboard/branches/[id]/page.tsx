'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatBHD, formatDateRange, getInitials, formatDate } from '@/lib/utils'
import type { Branch, Profile, Report } from '@/lib/types'
import {
  ArrowLeft, Users, HandCoins, BookOpen, FileText,
  Phone, TrendingUp, TrendingDown, Minus, Download,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type BranchDetail = Omit<Branch, 'leader'> & {
  leader?: Profile | null
}

export default function BranchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [branch, setBranch] = useState<BranchDetail | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (id) load()
  }, [id])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: b }, { data: r }, { data: me }] = await Promise.all([
      supabase
        .from('branches')
        .select('*, leader:profiles!leader_id(*)')
        .eq('id', id)
        .single(),
      supabase
        .from('reports')
        .select('*, branch:branches(name), submitter:profiles!submitted_by(full_name)')
        .eq('branch_id', id)
        .order('period_start', { ascending: false }),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])

    if (!b) { router.push('/dashboard/branches'); return }
    setBranch(b as unknown as BranchDetail)
    setReports(r ?? [])
    setCurrentProfile(me)
    setLoading(false)
  }

  // Stats
  const totalAttendance = reports.reduce((s, r) => s + (r.attendance ?? 0), 0)
  const totalSessions = reports.reduce((s, r) => s + (r.sessions ?? 0), 0)
  const totalCharity = reports.reduce((s, r) => s + Number(r.charity_bhd ?? 0), 0)
  const avgAttendance = reports.length > 0 ? Math.round(totalAttendance / reports.length) : 0

  // Chart data (last 12 reports, chronological)
  const chartData = [...reports]
    .reverse()
    .slice(-12)
    .map(r => ({
      period: format(parseISO(r.period_start), 'MMM d'),
      Attendance: r.attendance ?? 0,
      Sessions: r.sessions ?? 0,
      Charity: Number(r.charity_bhd ?? 0),
    }))

  // Trend: compare last 2 reports
  function getTrend(key: 'attendance' | 'charity_bhd' | 'sessions') {
    if (reports.length < 2) return 'neutral'
    const [latest, prev] = [reports[0], reports[1]]
    const a = Number(latest[key] ?? 0)
    const b = Number(prev[key] ?? 0)
    if (a > b) return 'up'
    if (a < b) return 'down'
    return 'neutral'
  }

  function TrendIcon({ trend }: { trend: string }) {
    if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-brand-500" />
    if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-red-400" />
    return <Minus className="h-3.5 w-3.5 text-slate-300" />
  }

  // PDF export
  function exportPDF() {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`${branch?.name} — Branch Report`, 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 14, 28)
    doc.text(`Total Attendance: ${totalAttendance}  |  Total Sessions: ${totalSessions}  |  Total Charity: ${formatBHD(totalCharity)}`, 14, 36)

    autoTable(doc, {
      startY: 44,
      head: [['Period', 'Type', 'Attendance', 'Sessions', 'Charity (BHD)', 'Subjects']],
      body: reports.map(r => [
        formatDateRange(r.period_start, r.period_end),
        r.period_type,
        r.attendance?.toString() ?? '0',
        r.sessions?.toString() ?? '0',
        Number(r.charity_bhd ?? 0).toFixed(3),
        r.subjects ?? '',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 163, 74] },
    })

    doc.save(`${branch?.name}-reports.pdf`)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!branch) return null

  const leader = branch.leader as Profile | null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/branches" className="mt-1">
          <Button variant="ghost" size="icon-sm" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">{branch.name.slice(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{branch.name}</h2>
              <p className="text-sm text-slate-500">{reports.length} reports on file</p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={exportPDF}>
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Leader card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11">
                <AvatarImage src={leader?.avatar_url ?? undefined} />
                <AvatarFallback>{getInitials(leader?.full_name || 'N A')}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-slate-900">{leader?.full_name ?? 'No leader assigned'}</p>
                <p className="text-sm text-slate-500">Branch Leader</p>
              </div>
            </div>
            <div className="flex gap-4 text-sm text-slate-500">
              {(branch.contact || leader?.phone) && (
                <a href={`tel:${branch.contact ?? leader?.phone}`} className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700">
                  <Phone className="h-4 w-4" />
                  {branch.contact ?? leader?.phone}
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Attendance', value: totalAttendance.toLocaleString(), icon: Users, trend: getTrend('attendance'), color: 'text-brand-700 bg-brand-50' },
          { label: 'Total Sessions', value: totalSessions.toString(), icon: BookOpen, trend: getTrend('sessions'), color: 'text-teal-700 bg-teal-50' },
          { label: 'Total Charity', value: formatBHD(totalCharity), icon: HandCoins, trend: getTrend('charity_bhd'), color: 'text-gold-700 bg-gold-50' },
          { label: 'Avg Attendance / Report', value: avgAttendance.toString(), icon: FileText, trend: 'neutral', color: 'text-slate-700 bg-slate-100' },
        ].map(({ label, value, icon: Icon, trend, color }) => (
          <Card key={label} className="stat-accent">
            <CardContent className="py-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-lg font-bold text-slate-900 leading-tight truncate">{value}</p>
                  <TrendIcon trend={trend} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attendance chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Attendance Trend (last 12 reports)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#cbd5e1" />
                <YAxis tick={{ fontSize: 11 }} stroke="#cbd5e1" />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Area
                  type="monotone"
                  dataKey="Attendance"
                  stroke="#16a34a"
                  strokeWidth={2}
                  fill="url(#attGrad)"
                  dot={{ r: 3, fill: '#16a34a' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Reports table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">All Reports</CardTitle>
        </CardHeader>
        {reports.length === 0 ? (
          <CardContent className="py-16 text-center">
            <FileText className="h-8 w-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No reports submitted yet</p>
            {currentProfile?.role !== 'area_leader' || currentProfile.branch_id === id ? (
              <Link href="/dashboard/reports">
                <Button variant="outline" size="sm" className="mt-3">Submit a Report</Button>
              </Link>
            ) : null}
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Charity</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(report => (
                  <TableRow key={report.id}>
                    <TableCell className="text-sm font-medium text-slate-900">
                      {formatDateRange(report.period_start, report.period_end)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={report.period_type === 'monthly' ? 'default' : 'secondary'} className="capitalize text-[10px]">
                        {report.period_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-700 font-medium">{report.attendance?.toLocaleString()}</TableCell>
                    <TableCell className="text-slate-700">{report.sessions}</TableCell>
                    <TableCell className="text-gold-700 font-medium">{formatBHD(Number(report.charity_bhd ?? 0))}</TableCell>
                    <TableCell className="text-slate-500 text-sm max-w-[200px] truncate">
                      {report.subjects ?? '—'}
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">
                      {formatDate(report.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  )
}
