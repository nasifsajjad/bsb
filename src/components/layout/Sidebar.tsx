'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard, Target, FileText, Calendar, Building2,
  BarChart3, Settings, Users, User, X, LogOut,
} from 'lucide-react'
import type { Profile, AppSettings } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  profile: Profile | null
  settings: AppSettings | null
  onClose?: () => void
}

const navItems = [
  { href: '/dashboard',            label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/goals',      label: 'Goals',        icon: Target },
  { href: '/dashboard/reports',    label: 'Reports',      icon: FileText },
  { href: '/dashboard/schedule',   label: 'Schedule',     icon: Calendar },
  { href: '/dashboard/branches',   label: 'Branches',     icon: Building2 },
  { href: '/dashboard/analytics',  label: 'Analytics',    icon: BarChart3 },
]

const adminItems = [
  { href: '/dashboard/users',    label: 'Users',    icon: Users },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ profile, settings, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isAdmin = profile?.role === 'super_admin'
  const isElevated = profile?.role !== 'area_leader'
  const appName = settings?.app_name ?? 'United Youth Forum'
  const logoUrl = settings?.logo_url

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside className="sidebar-pattern flex h-full flex-col bg-sidebar text-white">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 shrink-0 overflow-hidden">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={appName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-display text-lg font-bold leading-none">
              {appName.slice(0, 1)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white leading-tight truncate">{appName}</p>
          <p className="text-xs text-white/50 mt-0.5">Management System</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-0.5">
          {/* Main nav */}
          <p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
            Navigation
          </p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-white/12 text-white shadow-sm'
                    : 'text-white/70 hover:bg-white/8 hover:text-white'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-white/60')} />
                {label}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold-400 shrink-0" />
                )}
              </Link>
            )
          })}

          {/* Admin nav */}
          {isElevated && (
            <>
              <p className="px-2 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                Administration
              </p>
              {adminItems.map(({ href, label, icon: Icon }) => {
                if (href === '/settings' && !isAdmin) return null
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                      active
                        ? 'bg-white/12 text-white shadow-sm'
                        : 'text-white/70 hover:bg-white/8 hover:text-white'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-white/60')} />
                    {label}
                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold-400 shrink-0" />
                    )}
                  </Link>
                )
              })}
            </>
          )}
        </nav>
      </ScrollArea>

      {/* User footer */}
      <div className="border-t border-white/10 p-3">
        <Link
          href="/dashboard/profile"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-white/8 transition-colors group"
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-brand-700 text-white text-xs">
              {getInitials(profile?.full_name ?? 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white leading-tight truncate">
              {profile?.full_name ?? 'User'}
            </p>
            <p className="text-xs text-white/50 capitalize truncate">
              {profile?.role?.replace('_', ' ')}
            </p>
          </div>
          <User className="h-3.5 w-3.5 text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
        </Link>
        <button
          onClick={handleSignOut}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-white/60 hover:bg-white/8 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
