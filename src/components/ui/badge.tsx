import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const variants = {
  default:
    'bg-muted text-muted-foreground ring-1 ring-border dark:bg-muted dark:text-muted-foreground dark:ring-border',
  fork: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950/35 dark:text-orange-300 dark:ring-orange-900/60',
  expressway:
    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/35 dark:text-emerald-300 dark:ring-emerald-900/60',
  national:
    'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/35 dark:text-red-300 dark:ring-red-900/60',
  provincial:
    'bg-yellow-50 text-yellow-800 ring-1 ring-yellow-200 dark:bg-yellow-950/35 dark:text-yellow-300 dark:ring-yellow-900/60',
  county:
    'bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/35 dark:text-violet-300 dark:ring-violet-900/60',
  township:
    'bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/35 dark:text-violet-300 dark:ring-violet-900/60',
  slate:
    'bg-slate-50 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950/35 dark:text-slate-300 dark:ring-slate-900/60',
  amber:
    'bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/35 dark:text-amber-300 dark:ring-amber-900/60',
  emerald:
    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/35 dark:text-emerald-300 dark:ring-emerald-900/60',
  sky: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-950/35 dark:text-sky-300 dark:ring-sky-900/60',
  rose: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/35 dark:text-rose-300 dark:ring-rose-900/60',
  violet:
    'bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/35 dark:text-violet-300 dark:ring-violet-900/60',
} as const

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-0 items-center justify-center rounded px-2 text-[11px] font-semibold leading-none tracking-normal',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
