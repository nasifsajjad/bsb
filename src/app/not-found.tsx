'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="text-center space-y-6 animate-fade-in max-w-sm">
        <div className="text-8xl font-bold text-brand-100 leading-none select-none" aria-hidden>
          404
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
          <p className="text-slate-500 text-sm">
            The page you&apos;re looking for doesn&apos;t exist or you may not have permission to view it.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
          <Button asChild className="gap-2" style={{ backgroundColor: 'var(--app-primary)' }}>
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
