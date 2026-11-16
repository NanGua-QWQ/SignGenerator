'use client'

import {
  useEffect, useState,
  type ChangeEvent, type ReactNode,
} from 'react'

import {
  cn,
} from '@/lib/utils'

/**
 * 工坊面板通用控件（保持紧凑，便于右侧面板塞下大量参数）。
 *
 * 全部按 Material 3 的组件规范实现：
 * - Panel   → 填充式卡片（surface-container，无描边、有圆角）
 * - 输入类  → outlined text field（extra-small 圆角 + 1dp outline，聚焦转 primary）
 * - Chip    → filter chip / segmented button
 * - 按钮类  → 见 ActionButton 的 variant 说明
 */

/** M3 卡片：surface-container 底 + large 圆角 */
export function Panel({
  title,
  hint,
  actions,
  collapsible = true,
  defaultCollapsed = false,
  children,
}: {
  title: string
  hint?: string
  actions?: ReactNode
  /** 是否显示右上角的收起箭头 */
  collapsible?: boolean
  defaultCollapsed?: boolean
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const isCollapsed = collapsible && collapsed

  return (
    <section className="overflow-hidden rounded-[var(--md-sys-shape-corner-medium)] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-low)]">
      <header
        className={cn(
          'flex items-center justify-between gap-2 bg-[var(--md-sys-color-surface-container)] px-3 py-2',
          !isCollapsed && 'border-b border-[var(--md-sys-color-outline-variant)]',
        )}
      >
        <div className="min-w-0">
          <h3 className="truncate text-xs font-medium tracking-[0.00625rem] text-foreground">{title}</h3>
          {hint && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          {collapsible && (
            <button
              type="button"
              onClick={() => setCollapsed(value => !value)}
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? `展开${title}` : `收起${title}`}
              title={isCollapsed ? '展开' : '收起'}
              className="grid size-6 place-items-center rounded-[var(--md-sys-shape-corner-full)] text-muted-foreground transition-colors hover:bg-[var(--md-sys-color-surface-container-high)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)]"
            >
              <svg
                viewBox="0 0 24 24"
                className={cn('size-4 transition-transform', isCollapsed && '-rotate-90')}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </header>
      {!isCollapsed && <div className="space-y-2 p-3">{children}</div>}
    </section>
  )
}

/** M3 label-medium + supporting text 的字段组 */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block space-y-1', className)}>
      <span className="flex items-center justify-between gap-2 text-[11px] font-medium tracking-[0.03125rem] text-muted-foreground">
        <span>{label}</span>
        {hint && <span className="font-normal opacity-80">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

/** M3 outlined text field（紧凑版：32dp 高） */
const inputClass = [
  'h-8 w-full rounded-[var(--md-sys-shape-corner-extra-small)]',
  'border border-[var(--md-sys-color-outline)] bg-transparent px-2 text-xs text-foreground',
  'transition-colors duration-[var(--md-sys-motion-duration-short)]',
  'placeholder:text-muted-foreground',
  'hover:border-[var(--md-sys-color-on-surface)]',
  'focus:border-[var(--md-sys-color-primary)] focus:ring-1 focus:ring-[var(--md-sys-color-primary)] focus:outline-none',
  'disabled:cursor-not-allowed disabled:opacity-[0.38]',
].join(' ')

export function TextInput({
  value,
  onChange,
  placeholder,
  className,
  mono,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  mono?: boolean
  disabled?: boolean
}) {
  return (
    <input
      value={value}
      disabled={disabled}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      placeholder={placeholder}
      className={cn(inputClass, mono && 'md-code', className)}
    />
  )
}

export function NumberInput({
  value,
  onChange,
  step = 1,
  min,
  max,
  className,
  suffix,
}: {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  className?: string
  suffix?: string
}) {
  /** 显示用文本：去掉浮点噪声，但不动真实值 */
  const format = (next: number) => (Number.isFinite(next)
    ? String(Number(next.toFixed(3)))
    : '')

  const [draft, setDraft] = useState(() => format(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(format(value))
  }, [value, focused])

  /** null = 还在输入中（空 / 只有负号），undefined = 不合规 */
  const parse = (text: string): number | null | undefined => {
    const trimmed = text.trim()
    if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') return null
    const next = Number(trimmed)
    if (!Number.isFinite(next)) return undefined
    if (min !== undefined && next < min) return undefined
    if (max !== undefined && next > max) return undefined
    return next
  }

  const parsed = parse(draft)
  const invalid = parsed === undefined

  const commit = () => {
    const next = parse(draft)
    if (typeof next === 'number') {
      onChange(next)
      setDraft(format(next))
    }
    else {
      setDraft(format(value))
    }
  }

  return (
    <span className={cn('flex items-center gap-1', className)}>
      <input
        type="number"
        value={draft}
        step={step}
        min={min}
        max={max}
        aria-invalid={invalid}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          commit()
        }}
        onKeyDown={event => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const raw = event.target.value
          setDraft(raw)
          const next = parse(raw)
          if (typeof next === 'number') onChange(next)
        }}
        className={cn(inputClass, 'md-code')}
        style={invalid
          ? {
              borderColor: 'var(--md-sys-color-error)',
              color: 'var(--md-sys-color-error)',
              boxShadow: '0 0 0 1px var(--md-sys-color-error), 0 0 10px 1px var(--md-sys-color-error)',
            }
          : undefined}
      />
      {suffix && (
        <span className="shrink-0 text-[11px] text-muted-foreground">{suffix}</span>
      )}
    </span>
  )
}

/**
 * M3 outlined select（菜单展开样式归 M3 menu，这里用原生 select 保持轻量）。
 */
export function SelectInput<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value as T)}
        className={cn(
          inputClass,
          'cursor-pointer appearance-none pr-6',
          'bg-[var(--md-sys-color-surface-container-lowest)]',
        )}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 right-1.5 size-3.5 -translate-y-1/2 fill-current text-muted-foreground"
      >
        <path d="M7 10l5 5 5-5z" />
      </svg>
    </div>
  )
}

/**
 * M3 switch：轨道 40×24、手柄 16dp，选中时轨道填充 primary。
 * 视觉与原生 checkbox 拉开差距，但保留 label 点击区域。
 */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground select-none">
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={cn(
            'flex h-4 w-7 items-center rounded-full border-2 px-[2px]',
            'transition-colors duration-[var(--md-sys-motion-duration-medium)]',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--md-sys-color-primary)]',
            checked
              ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]'
              : 'border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container-highest)]',
          )}
        >
          <span
            className={cn(
              'block size-3 rounded-full transition-transform duration-[var(--md-sys-motion-duration-medium)]',
              checked
                ? 'translate-x-3 bg-[var(--md-sys-color-on-primary)]'
                : 'translate-x-0 bg-[var(--md-sys-color-outline)]',
            )}
          />
        </span>
      </span>
      {label}
    </label>
  )
}

/**
 * filter chip：M3 filter chip 的选中态是 secondary-container 底 + 对勾感的强调，
 * 未选中是透明底 + outline 描边。这里按 full 圆角实现。
 */
export function Chip({
  active,
  onClick,
  children,
  title,
  className,
}: {
  active?: boolean
  onClick: () => void
  children: ReactNode
  title?: string
  className?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] leading-none',
        'transition-colors duration-[var(--md-sys-motion-duration-short)]',
        active
          ? 'border-transparent bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]'
          : 'border-[var(--md-sys-color-outline-variant)] bg-transparent text-muted-foreground hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_var(--md-sys-state-hover-opacity),transparent)]',
        className,
      )}
    >
      {children}
    </button>
  )
}

/**
 * 面板内的小按钮。
 *
 * - `default` → filled（primary）
 * - `tonal`   → filled tonal（secondary-container）
 * - `outlined`→ outlined
 * - `ghost`   → text button（旧的默认次要按钮）
 * - `danger`  → error 色的 text button
 */
export function ActionButton({
  onClick,
  children,
  variant = 'default',
  title,
  disabled,
  className,
}: {
  onClick: () => void
  children: ReactNode
  variant?: 'default' | 'tonal' | 'outlined' | 'ghost' | 'danger'
  title?: string
  disabled?: boolean
  className?: string
}) {
  const styles = {
    default: [
      'border-transparent bg-primary text-primary-foreground',
      'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary)_var(--md-sys-state-hover-opacity),var(--md-sys-color-primary))]',
    ].join(' '),
    tonal: [
      'border-transparent bg-secondary text-secondary-foreground',
      'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-secondary-container)_var(--md-sys-state-hover-opacity),var(--md-sys-color-secondary-container))]',
    ].join(' '),
    outlined: [
      'border-[var(--md-sys-color-outline)] bg-transparent text-primary',
      'hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_var(--md-sys-state-hover-opacity),transparent)]',
    ].join(' '),
    ghost: [
      'border-transparent bg-transparent text-muted-foreground',
      'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_var(--md-sys-state-hover-opacity),transparent)]',
    ].join(' '),
    danger: [
      'border-transparent bg-transparent text-destructive',
      'hover:bg-[color-mix(in_srgb,var(--md-sys-color-error)_var(--md-sys-state-hover-opacity),transparent)]',
    ].join(' '),
  }[variant]

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-1 rounded-full border px-3 py-1 text-[11px] leading-none',
        'font-medium transition-colors duration-[var(--md-sys-motion-duration-short)]',
        'disabled:pointer-events-none disabled:opacity-[0.38]',
        styles,
        className,
      )}
    >
      {children}
    </button>
  )
}

export function ColorInput({
  value,
  onChange,
  className,
}: {
  value: number
  onChange: (value: number) => void
  className?: string
}) {
  const hex = `#${(value & 0xFFFFFF).toString(16).padStart(6, '0')}`
  return (
    <span className={cn('flex items-center gap-1', className)}>
      <input
        type="color"
        value={hex}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onChange(Number.parseInt(event.target.value.slice(1), 16))
        }}
        className="size-8 shrink-0 cursor-pointer rounded-[var(--md-sys-shape-corner-extra-small)] border border-[var(--md-sys-color-outline)] bg-transparent p-0.5"
      />
      <input
        value={hex.toUpperCase()}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const parsed = Number.parseInt(
            event.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6),
            16,
          )
          if (Number.isFinite(parsed)) onChange(parsed)
        }}
        className={cn(inputClass, 'md-code')}
      />
    </span>
  )
}

/** 空状态：M3 里用虚线描边 + on-surface-variant 文本表达「此处还没有内容」 */
export function EmptyHint({
  children,
}: {
  children: ReactNode
}) {
  return (
    <p className="rounded-[var(--md-sys-shape-corner-small)] border border-dashed border-[var(--md-sys-color-outline-variant)] px-3 py-4 text-center text-[11px] text-muted-foreground">
      {children}
    </p>
  )
}

/** 代码块：反色 surface（inverse-surface）以区别于普通卡片 */
export function CodeBlock({
  code,
  className,
}: {
  code: string
  className?: string
}) {
  return (
    <pre
      className={cn(
        'max-h-72 overflow-auto rounded-[var(--md-sys-shape-corner-small)] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-lowest)] p-2 text-[11px] leading-5 text-foreground md-code',
        className,
      )}
    >
      {code}
    </pre>
  )
}
