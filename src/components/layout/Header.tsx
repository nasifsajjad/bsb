'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import type { Profile, AppSettings } from '@/lib/types'
import Link from 'next/link'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/dashboard':                  'Dashboard',
  '/dashboard/goals':            'Goal Management',
  '/dashboard/reports':          'Reports',
  '/dashboard/schedule':         'Schedule & Events',
  '/dashboard/branches':         'Branch Overview',
  '/dashboard/analytics':        'Analytics',
  '/dashboard/settings':         'Settings',
  '/dashboard/profile':          'My Profile',
  '/dashboard/users':            'User Management',
}

interface HeaderProps {
  profile: Profile | null
  settings: AppSettings | null
  onMenuClick: () => void
}

export function Header({ profile, settings, onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Handle dynamic branch detail route specially
  const isBranchDetail = /^\/dashboard\/branches\/[^/]+$/.test(pathname)

  const title = isBranchDetail
    ? 'Branch Detail'
    : Object.entries(pageTitles).find(([key]) =>
        key === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(key)
      )?.[1] ?? 'Dashboard'

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-14 items-center gap-3 border-b border-slate-100 bg-white px-4 sm:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden text-slate-600"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-slate-900 truncate">{title}</h1>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        {/* Notifications (placeholder) */}
        <Button variant="ghost" size="icon-sm" className="text-slate-500 relative" aria-label="Notifications">
          <Bell className="h-4.5 w-4.5" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-600/30">
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(profile?.full_name ?? 'U')}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-32 truncate">
                {profile?.full_name ?? 'User'}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div>
                <p className="font-semibold text-slate-900">{profile?.full_name}</p>
                <p className="text-xs text-slate-500 capitalize font-normal mt-0.5">
                  {profile?.role?.replace('_', ' ')}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="cursor-pointer">My Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
