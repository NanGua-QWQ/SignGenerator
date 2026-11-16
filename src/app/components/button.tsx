import {
  forwardRef,
} from 'react'
import type {
  ButtonHTMLAttributes,
} from 'react'

import {
  cn,
} from '@/lib/utils'

type ButtonVariant = 'default' | 'ghost' | 'outlined' | 'text' | 'tonal' | 'danger'
type ButtonSize = 'default' | 'small' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

/**
 * M3 按钮族。
 *
 * - `default`  —— filled button（主操作，最高强调）
 * - `tonal`    —— filled tonal button（次高强调，secondary-container 底色）
 * - `outlined` —— outlined button（中等强调，描边 + 文本色）
 * - `text`     —— text button（最低强调，仅 state layer）
 * - `ghost`    —— `text` 的别名，兼容旧调用点
 * - `danger`   —— 危险操作，用 error 色角色
 *
 * 形状统一 full（M3 按钮默认全圆角），高度 40dp / 32dp（small）。
 * hover / pressed 用 state layer 叠加，跟随主题色自动换算。
 */
const variantClass: Record<ButtonVariant, string> = {
  default: [
    'bg-primary text-primary-foreground shadow-none',
    'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary)_var(--md-sys-state-hover-opacity),var(--md-sys-color-primary))]',
    'active:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary)_var(--md-sys-state-pressed-opacity),var(--md-sys-color-primary))]',
  ].join(' '),
  tonal: [
    'bg-secondary text-secondary-foreground',
    'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-secondary-container)_var(--md-sys-state-hover-opacity),var(--md-sys-color-secondary-container))]',
    'active:bg-[color-mix(in_srgb,var(--md-sys-color-on-secondary-container)_var(--md-sys-state-pressed-opacity),var(--md-sys-color-secondary-container))]',
  ].join(' '),
  outlined: [
    'border border-outline bg-transparent text-primary',
    'hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_var(--md-sys-state-hover-opacity),transparent)]',
    'active:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_var(--md-sys-state-pressed-opacity),transparent)]',
  ].join(' '),
  text: [
    'bg-transparent text-primary',
    'hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_var(--md-sys-state-hover-opacity),transparent)]',
    'active:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_var(--md-sys-state-pressed-opacity),transparent)]',
  ].join(' '),
  ghost: [
    'bg-transparent text-muted-foreground',
    'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_var(--md-sys-state-hover-opacity),transparent)]',
    'active:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_var(--md-sys-state-pressed-opacity),transparent)]',
  ].join(' '),
  danger: [
    'bg-transparent text-destructive',
    'hover:bg-[color-mix(in_srgb,var(--md-sys-color-error)_var(--md-sys-state-hover-opacity),transparent)]',
    'active:bg-[color-mix(in_srgb,var(--md-sys-color-error)_var(--md-sys-state-pressed-opacity),transparent)]',
  ].join(' '),
}

const sizeClass: Record<ButtonSize, string> = {
  default: 'h-10 min-w-10 gap-2 px-6 text-sm',
  small: 'h-8 min-w-8 gap-1.5 px-4 text-xs',
  icon: 'size-10 p-0',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  className,
  variant = 'default',
  size = 'default',
  type = 'button',
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full',
        'font-medium tracking-[0.00625rem] whitespace-nowrap',
        'transition-colors duration-[var(--md-sys-motion-duration-short)]',
        'outline-none focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-sys-color-primary)]',
        'disabled:pointer-events-none disabled:opacity-[0.38]',
        sizeClass[size],
        variantClass[variant],
        className,
      )}
      {...props}
    />
  )
})
