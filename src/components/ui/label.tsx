import type { LabelHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className, ...props }: LabelProps) {
  return <label className={cn('flex items-center gap-2 text-sm font-medium leading-none', className)} {...props} />
}
