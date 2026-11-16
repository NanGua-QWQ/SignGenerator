import type {
  HTMLAttributes,
} from 'react'

import {
  cn,
} from '@/lib/utils'

/**
 * 语义色变体 → M3 颜色角色对。
 *
 * M3 没有「彩色标签」这个组件，最接近的是 **tonal chip**：
 * 底色取 `<role>-container`、文字取 `on-<role>-container`。
 * 这里把原来的 emerald / amber / rose … 等 Tailwind 调色板映射到
 * M3 的 primary / secondary / tertiary / error 四族容器色，
 * 保证明暗两套主题都由同一组令牌驱动。
 */
const variantRole: Record<string, { bg: string; fg: string }> = {
  default: {
    bg: 'var(--md-sys-color-surface-container-highest)',
    fg: 'var(--md-sys-color-on-surface-variant)',
  },
  slate: {
    bg: 'var(--md-sys-color-surface-container-highest)',
    fg: 'var(--md-sys-color-on-surface-variant)',
  },
  primary: {
    bg: 'var(--md-sys-color-primary-container)',
    fg: 'var(--md-sys-color-on-primary-container)',
  },
  expressway: {
    bg: 'var(--md-sys-color-primary-container)',
    fg: 'var(--md-sys-color-on-primary-container)',
  },
  emerald: {
    bg: 'var(--md-sys-color-primary-container)',
    fg: 'var(--md-sys-color-on-primary-container)',
  },
  violet: {
    bg: 'var(--md-sys-color-secondary-container)',
    fg: 'var(--md-sys-color-on-secondary-container)',
  },
  county: {
    bg: 'var(--md-sys-color-secondary-container)',
    fg: 'var(--md-sys-color-on-secondary-container)',
  },
  township: {
    bg: 'var(--md-sys-color-secondary-container)',
    fg: 'var(--md-sys-color-on-secondary-container)',
  },
  sky: {
    bg: 'var(--md-sys-color-secondary-container)',
    fg: 'var(--md-sys-color-on-secondary-container)',
  },
  tertiary: {
    bg: 'var(--md-sys-color-tertiary-container)',
    fg: 'var(--md-sys-color-on-tertiary-container)',
  },
  amber: {
    bg: 'var(--md-sys-color-tertiary-container)',
    fg: 'var(--md-sys-color-on-tertiary-container)',
  },
  fork: {
    bg: 'var(--md-sys-color-tertiary-container)',
    fg: 'var(--md-sys-color-on-tertiary-container)',
  },
  provincial: {
    bg: 'var(--md-sys-color-tertiary-container)',
    fg: 'var(--md-sys-color-on-tertiary-container)',
  },
  rose: {
    bg: 'var(--md-sys-color-error-container)',
    fg: 'var(--md-sys-color-on-error-container)',
  },
  national: {
    bg: 'var(--md-sys-color-error-container)',
    fg: 'var(--md-sys-color-on-error-container)',
  },
  error: {
    bg: 'var(--md-sys-color-error-container)',
    fg: 'var(--md-sys-color-on-error-container)',
  },
}

/** 兼容旧调用点：颜色名 → 同一组 M3 容器色的 class 串 */
const badgeVariants: Record<string, string> = Object.fromEntries(
  Object.entries(variantRole).map(([key, role]) => [
    key,
    `bg-[${role.bg}] text-[${role.fg}]`,
  ]),
)

type BadgeVariant = keyof typeof variantRole | string

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

/** M3 tonal chip：全圆角、label-small、container / on-container 配色 */
export function Badge({
  className,
  variant = 'default',
  style,
  ...props
}: BadgeProps) {
  const role = variantRole[variant] ?? variantRole.default
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5',
        'text-[0.6875rem] leading-4 font-medium tracking-[0.03125rem] whitespace-nowrap',
        className,
      )}
      style={{
        backgroundColor: role.bg,
        color: role.fg,
        ...style,
      }}
      {...props}
    />
  )
}

export {
  badgeVariants,
  variantRole as badgeRole,
}
