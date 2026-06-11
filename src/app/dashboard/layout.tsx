'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import type { Profile, AppSettings } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from('profiles').select('*, branch:branches(*)').eq('id', user.id).single(),
        supabase.from('app_settings').select('*').eq('id', 1).single(),
      ])

      if (p) setProfile(p)
      if (s) {
        setSettings(s)
        // Update CSS vars for dynamic theming
        document.documentElement.style.setProperty('--app-primary', s.primary_color ?? '#16a34a')
        document.documentElement.style.setProperty('--app-accent', s.accent_color ?? '#d97706')
      }
    }

    load()
  }, [])

  return (
    <div className="flex h-full bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col h-full fixed top-0 left-0 bottom-0 z-30">
        <Sidebar profile={profile} settings={settings} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex w-72 flex-col h-full z-10">
            <Sidebar profile={profile} settings={settings} onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-64 min-h-full">
        <Header
          profile={profile}
          settings={settings}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
