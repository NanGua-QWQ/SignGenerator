import type {
  LabelHTMLAttributes,
} from 'react'

import {
  cn,
} from '@/lib/utils'

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>

/** M3 label-large：表单字段的可见标签 */
export function Label({
  className, ...props
}: LabelProps) {
  return (
    <label
      className={cn(
        'flex items-center gap-2 text-sm leading-5 font-medium tracking-[0.00625rem] text-foreground',
        className,
      )}
      {...props}
    />
  )
}
