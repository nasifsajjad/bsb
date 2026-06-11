'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatBHD } from '@/lib/utils'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'
import { format, subMonths, startOfMonth } from 'date-fns'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [branchData, setBranchData] = useState<any[]>([])
  const [momData, setMomData] = useState<any[]>([])
  const [period, setPeriod] = useState('6')

  const supabase = createClient()

  useEffect(() => {
    load()
  }, [period])

  async function load() {
    setLoading(true)
    const months = parseInt(period)
    const startDate = startOfMonth(subMonths(new Date(), months - 1))

    const [{ data: reports }, { data: branches }] = await Promise.all([
      supabase
        .from('reports')
        .select('*, branch:branches(name)')
        .gte('period_start', startDate.toISOString().split('T')[0])
        .order('period_start', { ascending: true }),
      supabase.from('branches').select('*').order('name'),
    ])

    const allReports = reports ?? []

    // Monthly aggregates
    const monthMap: Record<string, { month: string, attendance: number, sessions: number, charity: number }> = {}
    for (let i = months - 1; i >= 0; i--) {
      const m = subMonths(new Date(), i)
      const key = format(m, 'yyyy-MM')
      monthMap[key] = { month: format(m, 'MMM yy'), attendance: 0, sessions: 0, charity: 0 }
    }
    allReports.forEach(r => {
      const key = r.period_start.slice(0, 7)
      if (monthMap[key]) {
        monthMap[key].attendance += r.attendance ?? 0
        monthMap[key].sessions  += r.sessions ?? 0
        monthMap[key].charity   += Number(r.charity_bhd ?? 0)
      }
    })
    const mData = Object.values(monthMap)
    setMonthlyData(mData)

    // Month-over-month (last 2 vs previous 2)
    const recentKeys  = Object.keys(monthMap).slice(-2)
    const prevKeys    = Object.keys(monthMap).slice(-4, -2)
    const momStats = [
      {
        metric: 'Attendance',
        current: recentKeys.reduce((a, k) => a + (monthMap[k]?.attendance ?? 0), 0),
        previous: prevKeys.reduce((a, k) => a + (monthMap[k]?.attendance ?? 0), 0),
      },
      {
        metric: 'Sessions',
        current: recentKeys.reduce((a, k) => a + (monthMap[k]?.sessions ?? 0), 0),
        previous: prevKeys.reduce((a, k) => a + (monthMap[k]?.sessions ?? 0), 0),
      },
    ]
    setMomData(momStats)

    // Branch comparison
    const branchMap: Record<string, any> = {}
    ;(branches ?? []).forEach(b => {
      branchMap[b.id] = { name: b.name, attendance: 0, sessions: 0, charity: 0 }
    })
    allReports.forEach(r => {
      if (branchMap[r.branch_id]) {
        branchMap[r.branch_id].attendance += r.attendance ?? 0
        branchMap[r.branch_id].sessions   += r.sessions ?? 0
        branchMap[r.branch_id].charity    += Number(r.charity_bhd ?? 0)
      }
    })
    const bData = Object.values(branchMap)
      .sort((a, b) => b.attendance - a.attendance)
    setBranchData(bData)

    setLoading(false)
  }

  const avgAttendance = monthlyData.length > 0
    ? Math.round(monthlyData.reduce((a, d) => a + d.attendance, 0) / monthlyData.length)
    : 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Analytics</h2>
          <p className="text-sm text-slate-500 mt-0.5">Trends, rankings, and performance metrics</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : [
              { label: 'Avg Monthly Attendance', value: avgAttendance.toLocaleString() },
              { label: 'Total Attendance', value: monthlyData.reduce((a, d) => a + d.attendance, 0).toLocaleString() },
              { label: 'Total Sessions', value: monthlyData.reduce((a, d) => a + d.sessions, 0).toLocaleString() },
              { label: 'Total Charity', value: formatBHD(monthlyData.reduce((a, d) => a + d.charity, 0)) },
            ].map(({ label, value }) => (
              <Card key={label} className="stat-accent">
                <CardContent className="py-4 text-center">
                  <p className="text-xl font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Trend line */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={256}>
              <LineChart data={monthlyData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone" dataKey="attendance" name="Attendance"
                  stroke="var(--app-primary)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--app-primary)' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone" dataKey="sessions" name="Sessions"
                  stroke="#0d9488" strokeWidth={2.5} dot={{ r: 4, fill: '#0d9488' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Branch comparison + MoM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Branch attendance ranking */}
        <Card>
          <CardHeader>
            <CardTitle>Branch Attendance Ranking</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart
                  data={branchData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category" dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={false} tickLine={false} width={72}
                  />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="attendance" name="Attendance" fill="var(--app-primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Month-over-month */}
        <Card>
          <CardHeader>
            <CardTitle>Month-over-Month Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64 w-full" /> : (
              <div className="space-y-6 pt-2">
                {momData.map(({ metric, current, previous }) => {
                  const pct = previous > 0 ? ((current - previous) / previous) * 100 : 0
                  const isUp = pct >= 0
                  return (
                    <div key={metric} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{metric}</span>
                        <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${isUp ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600'}`}>
                          {isUp ? '+' : ''}{pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex gap-2 items-center text-xs text-slate-500">
                        <div className="flex-1">
                          <p className="mb-1">Current period: <span className="font-semibold text-slate-700">{current.toLocaleString()}</span></p>
                          <div className="h-2 bg-brand-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-600 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (current / Math.max(current, previous, 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center text-xs text-slate-500">
                        <div className="flex-1">
                          <p className="mb-1">Previous period: <span className="font-semibold text-slate-700">{previous.toLocaleString()}</span></p>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-slate-400 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (previous / Math.max(current, previous, 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Charity trend */}
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Charity Collection (BHD)</p>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={monthlyData.slice(-6)} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v) => [formatBHD(Number(v)), 'Charity']}
                        contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }}
                      />
                      <Bar dataKey="charity" fill="var(--app-accent)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
