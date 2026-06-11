'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatBHD, formatDate } from '@/lib/utils'
import type { Report, Goal, Event } from '@/lib/types'
import {
  Users, HandCoins, Target, BookOpen,
  TrendingUp, TrendingDown, Building2, Calendar,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

interface Stats {
  totalAttendance: number
  totalCharity: number
  activeGoals: number
  totalSessions: number
  attendanceTrend: number
  charityTrend: number
}

interface MonthlyData {
  month: string
  attendance: number
  sessions: number
  charity: number
}

interface BranchStat {
  name: string
  attendance: number
  sessions: number
  charity: number
}

const CHART_COLORS = {
  primary: 'var(--app-primary)',
  accent:  'var(--app-accent)',
  teal:    '#0d9488',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [branchStats, setBranchStats] = useState<BranchStat[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [recentGoals, setRecentGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const now = new Date()
      const sixMonthsAgo = startOfMonth(subMonths(now, 5))

      const [
        { data: reports },
        { data: goals },
        { data: events },
        { data: branches },
      ] = await Promise.all([
        supabase
          .from('reports')
          .select('*, branch:branches(name)')
          .gte('period_start', sixMonthsAgo.toISOString().split('T')[0])
          .order('period_start', { ascending: true }),
        supabase
          .from('goals')
          .select('*, branch:branches(name)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('events')
          .select('*, branch:branches(name)')
          .gte('start_at', now.toISOString())
          .order('start_at', { ascending: true })
          .limit(5),
        supabase.from('branches').select('*'),
      ])

      // Compute stats
      const allReports = reports ?? []
      const thisMonth = allReports.filter(r => {
        const d = new Date(r.period_start)
        return d >= startOfMonth(now) && d <= endOfMonth(now)
      })
      const lastMonth = allReports.filter(r => {
        const prev = subMonths(now, 1)
        const d = new Date(r.period_start)
        return d >= startOfMonth(prev) && d <= endOfMonth(prev)
      })

      const sum = (arr: typeof allReports, key: keyof Report) =>
        arr.reduce((acc, r) => acc + Number(r[key] ?? 0), 0)

      const thisAtt = sum(thisMonth, 'attendance')
      const lastAtt = sum(lastMonth, 'attendance')
      const thisChr = sum(thisMonth, 'charity_bhd')
      const lastChr = sum(lastMonth, 'charity_bhd')

      setStats({
        totalAttendance: sum(allReports, 'attendance'),
        totalCharity: sum(allReports, 'charity_bhd'),
        activeGoals: (goals ?? []).filter(g => g.category === 'active').length,
        totalSessions: sum(allReports, 'sessions'),
        attendanceTrend: lastAtt > 0 ? ((thisAtt - lastAtt) / lastAtt) * 100 : 0,
        charityTrend: lastChr > 0 ? ((thisChr - lastChr) / lastChr) * 100 : 0,
      })

      // Monthly chart data (last 6 months)
      const monthlyMap: Record<string, MonthlyData> = {}
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(now, i)
        const key = format(m, 'MMM')
        monthlyMap[key] = { month: key, attendance: 0, sessions: 0, charity: 0 }
      }
      allReports.forEach(r => {
        const key = format(new Date(r.period_start), 'MMM')
        if (monthlyMap[key]) {
          monthlyMap[key].attendance += r.attendance ?? 0
          monthlyMap[key].sessions  += r.sessions ?? 0
          monthlyMap[key].charity   += Number(r.charity_bhd ?? 0)
        }
      })
      setMonthlyData(Object.values(monthlyMap))

      // Branch stats
      const branchMap: Record<string, BranchStat> = {}
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
      const sorted = Object.values(branchMap)
        .sort((a, b) => b.attendance - a.attendance)
        .slice(0, 6)
      setBranchStats(sorted)

      setRecentGoals(goals ?? [])
      setUpcomingEvents(events ?? [])
      setLoading(false)
    }

    load()
  }, [])

  const statCards = stats ? [
    {
      label: 'Total Attendance',
      value: stats.totalAttendance.toLocaleString(),
      icon: Users,
      trend: stats.attendanceTrend,
      color: 'text-brand-600',
      bg: 'bg-brand-50',
    },
    {
      label: 'Charity Collected',
      value: formatBHD(stats.totalCharity),
      icon: HandCoins,
      trend: stats.charityTrend,
      color: 'text-gold-600',
      bg: 'bg-gold-50',
    },
    {
      label: 'Active Goals',
      value: stats.activeGoals.toString(),
      icon: Target,
      trend: null,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      label: 'Sessions Held',
      value: stats.totalSessions.toLocaleString(),
      icon: BookOpen,
      trend: null,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ] : []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Overview</h2>
        <p className="text-sm text-slate-500 mt-0.5">Last 6 months of activity across all branches</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="stat-accent">
                <CardContent className="pt-5 pb-5">
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))
          : statCards.map(({ label, value, icon: Icon, trend, color, bg }) => (
              <Card key={label} className="stat-accent animate-fade-in">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1.5 animate-count">{value}</p>
                      {trend !== null && (
                        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-brand-600' : 'text-red-500'}`}>
                          {trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          {Math.abs(trend).toFixed(1)}% vs last month
                        </div>
                      )}
                    </div>
                    <div className={`${bg} ${color} p-2.5 rounded-xl shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Attendance trend — wider */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Attendance & Sessions Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="sesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.teal} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={CHART_COLORS.teal} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="attendance" name="Attendance" stroke={CHART_COLORS.primary} fill="url(#attGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="sessions" name="Sessions" stroke={CHART_COLORS.teal} fill="url(#sesGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Charity per month */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Charity (BHD)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => [formatBHD(Number(v)), 'Charity']}
                    contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="charity" name="Charity" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Branch rankings + upcoming events */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Branch rankings */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Branch Rankings</CardTitle>
            <Link href="/dashboard/branches" className="text-xs text-brand-600 font-medium flex items-center gap-1 hover:gap-1.5 transition-all">
              All branches <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : branchStats.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No report data yet</p>
            ) : (
              <div className="space-y-3">
                {branchStats.map((b, i) => {
                  const maxAtt = branchStats[0]?.attendance || 1
                  const pct = Math.round((b.attendance / maxAtt) * 100)
                  return (
                    <div key={b.name} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 w-5 shrink-0">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-slate-700 truncate">{b.name}</p>
                          <p className="text-xs text-slate-500 ml-2 shrink-0">{b.attendance.toLocaleString()}</p>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: i === 0
                                ? 'linear-gradient(90deg, var(--app-primary), var(--app-accent))'
                                : 'var(--app-primary)',
                              opacity: 1 - i * 0.1,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming events + recent goals */}
        <div className="lg:col-span-2 space-y-4">
          {/* Upcoming events */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Upcoming Events</CardTitle>
              <Link href="/dashboard/schedule" className="text-xs text-brand-600 font-medium flex items-center gap-1 hover:gap-1.5 transition-all">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : upcomingEvents.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No upcoming events</p>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.slice(0, 4).map(event => (
                    <div key={event.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-brand-50 flex flex-col items-center justify-center">
                        <span className="text-[10px] font-semibold text-brand-600 leading-none">
                          {format(new Date(event.start_at), 'MMM').toUpperCase()}
                        </span>
                        <span className="text-sm font-bold text-brand-700 leading-none">
                          {format(new Date(event.start_at), 'd')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{event.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {event.location ? event.location : 'No location'}
                          {(event as any).branch?.name ? ` • ${(event as any).branch.name}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Goals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Recent Goals</CardTitle>
              <Link href="/dashboard/goals" className="text-xs text-brand-600 font-medium flex items-center gap-1 hover:gap-1.5 transition-all">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : recentGoals.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No goals yet</p>
              ) : (
                <div className="space-y-2.5">
                  {recentGoals.slice(0, 4).map(goal => (
                    <div key={goal.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-700 truncate">{goal.title}</p>
                        <Badge
                          variant={goal.category === 'active' ? 'default' : goal.category === 'completed' ? 'success' : 'warning'}
                          className="shrink-0 text-[10px]"
                        >
                          {goal.progress}%
                        </Badge>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full progress-bar transition-all duration-700"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
