export const dynamic = 'force-dynamic'

import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const supabase = await createClient()
    const { data: settings } = await supabase
      .from('app_settings')
      .select('app_name, tagline')
      .eq('id', 1)
      .single()

    const appName = settings?.app_name ?? 'United Youth Forum'
    const tagline = settings?.tagline ?? 'Management System'

    return {
      title: { default: appName, template: `%s | ${appName}` },
      description: tagline,
    }
  } catch {
    return {
      title: 'United Youth Forum',
      description: 'Management System',
    }
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let primaryColor = '#16a34a'
  let accentColor = '#d97706'

  try {
    const supabase = await createClient()
    const { data: settings } = await supabase
      .from('app_settings')
      .select('primary_color, accent_color')
      .eq('id', 1)
      .single()

    if (settings) {
      primaryColor = settings.primary_color ?? primaryColor
      accentColor = settings.accent_color ?? accentColor
    }
  } catch {
    // Use defaults if DB not yet connected
  }

  return (
    <html
      lang="en"
      className="h-full"
      style={{
        '--app-primary': primaryColor,
        '--app-accent': accentColor,
      } as React.CSSProperties}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="h-full antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
