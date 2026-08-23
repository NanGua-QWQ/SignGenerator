import type {
  HTMLAttributes,
} from 'react'

import {
  Badge as ThemeBadge,
} from '@radix-ui/themes'

const colorMap = {
  default: 'gray',
  fork: 'amber',
  expressway: 'green',
  national: 'red',
  provincial: 'yellow',
  county: 'violet',
  township: 'violet',
  slate: 'gray',
  amber: 'amber',
  emerald: 'green',
  sky: 'blue',
  rose: 'ruby',
  violet: 'violet',
} as const

const badgeVariants: Record<keyof typeof colorMap, string> = {
  default: '',
  fork: 'bg-amber-100 text-amber-900',
  expressway: 'bg-emerald-100 text-emerald-900',
  national: 'bg-rose-100 text-rose-900',
  provincial: 'bg-amber-100 text-amber-900',
  county: 'bg-violet-100 text-violet-900',
  township: 'bg-violet-100 text-violet-900',
  slate: 'bg-slate-100 text-slate-900',
  amber: 'bg-amber-100 text-amber-900',
  emerald: 'bg-emerald-100 text-emerald-900',
  sky: 'bg-sky-100 text-sky-900',
  rose: 'bg-rose-100 text-rose-900',
  violet: 'bg-violet-100 text-violet-900',
}

type BadgeVariant = keyof typeof colorMap

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  return (
    <ThemeBadge
      color={colorMap[variant]}
      variant="soft"
      radius="medium"
      className={className}
      {...(props as object)}
    />
  )
}

export {
  badgeVariants,
}
