import {
  forwardRef,
} from 'react'
import type {
  InputHTMLAttributes,
} from 'react'

import {
  cn,
} from '@/lib/utils'

type InputProps = InputHTMLAttributes<HTMLInputElement>

/**
 * M3 text field（outlined 变体）。
 *
 * M3 规范里 outlined text field 是 56dp 高的容器 + 1dp 描边，聚焦时描边转
 * primary 并加粗到 2dp。这里为了贴合工坊紧凑的侧栏，把高度压到 40dp，
 * 但保留「focused → primary + ring」的视觉规则。
 */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input({
  className,
  ...props
}, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full min-w-0 rounded-[var(--md-sys-shape-corner-extra-small)]',
        'border border-[var(--md-sys-color-outline)] bg-transparent',
        'px-4 text-sm text-foreground',
        'placeholder:text-muted-foreground',
        'transition-colors duration-[var(--md-sys-motion-duration-short)]',
        'hover:border-[var(--md-sys-color-on-surface)]',
        'focus:border-[var(--md-sys-color-primary)] focus:ring-1 focus:ring-[var(--md-sys-color-primary)] focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-[0.38]',
        className,
      )}
      {...props}
    />
  )
})

export {
  Input,
}
