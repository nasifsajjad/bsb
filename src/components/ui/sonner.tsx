'use client'

import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group toast bg-white border border-slate-200 shadow-lg rounded-xl text-slate-900',
          description: 'text-slate-500',
          actionButton: 'bg-brand-600 text-white rounded-lg text-xs font-semibold',
          cancelButton: 'bg-slate-100 text-slate-700 rounded-lg text-xs',
          success: 'border-brand-200 bg-brand-50 text-brand-800',
          error: 'border-red-200 bg-red-50 text-red-800',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
