import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-primary text-primary-foreground',
  expressway: 'bg-[#359b47] text-white',
  ordinary: 'bg-white text-black ring-1 ring-border',
  guidance: 'bg-[#050203] text-white',
} as const

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex h-6 min-w-8 items-center justify-center rounded-sm px-1 text-[10px] font-bold leading-none', variants[variant], className)}
      {...props}
    />
  )
}
