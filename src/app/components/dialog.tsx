'use client'

import { useState } from 'react'
import type {
  ChangeEvent, ReactNode,
} from 'react'

import {
  cn,
} from '@/lib/utils'

/**
 * M3 风格的对话框与下拉选择。
 *
 * - `ConfirmDialog` —— M3 basic dialog：全屏 scrim + 28dp 圆角容器 +
 *   headline / supporting text / 两个文本按钮（取消在左、确认在右）。
 * - `SelectField` —— M3 outlined select：触发器长得和 text field 一致，
 *   展开的菜单是 M3 menu（surface-container + 8dp 圆角 + level-2 阴影）。
 *
 * 两者都用原生元素 + 固定定位实现，避免为工坊引入一整个组件库。
 */

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  destructive = false,
  onConfirm,
}: {
  /** 触发按钮（自行渲染，会被包进一个 inline-flex 容器） */
  trigger: (open: () => void) => ReactNode
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <span className="inline-flex shrink-0">{trigger(() => setOpen(true))}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* scrim：M3 规范要求 32% 黑色遮罩 */}
          <div
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--md-sys-color-scrim)_32%,transparent)]"
            onClick={() => setOpen(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            className={cn(
              'relative w-full max-w-[20rem] p-6',
              'rounded-[var(--md-sys-shape-corner-extra-large)]',
              'bg-[var(--md-sys-color-surface-container-high)]',
              'shadow-[var(--md-sys-elevation-level-3)]',
            )}
          >
            <h2 className="text-2xl leading-8 text-foreground">{title}</h2>
            <div className="mt-4 text-sm leading-5 text-muted-foreground">{description}</div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-full px-6 text-sm font-medium text-primary transition-colors hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_var(--md-sys-state-hover-opacity),transparent)]"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm()
                  setOpen(false)
                }}
                className={cn(
                  'inline-flex h-10 items-center justify-center rounded-full px-6 text-sm font-medium transition-colors',
                  destructive
                    ? 'bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-error)_var(--md-sys-state-hover-opacity),var(--md-sys-color-error))]'
                    : 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary)_var(--md-sys-state-hover-opacity),var(--md-sys-color-primary))]',
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function SelectField<T extends string>({
  id,
  value,
  options,
  placeholder = '选择...',
  onValueChange,
  className,
  /** 允许选中一个不在 options 里的当前值（例如手填的编号） */
  extraOption,
}: {
  id?: string
  value: T
  options: { value: T; label: string }[]
  placeholder?: string
  onValueChange: (value: T) => void
  className?: string
  extraOption?: { value: T; label: string }
}) {
  const [open, setOpen] = useState(false)
  const all = extraOption ? [extraOption, ...options] : options
  const current = all.find(option => option.value === value)

  return (
    <div className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-[var(--md-sys-shape-corner-extra-small)]',
          'border border-[var(--md-sys-color-outline)] bg-transparent px-3 text-left text-sm',
          'transition-colors duration-[var(--md-sys-motion-duration-short)]',
          'hover:border-[var(--md-sys-color-on-surface)]',
          open && 'border-[var(--md-sys-color-primary)] ring-1 ring-[var(--md-sys-color-primary)]',
        )}
      >
        <span className={cn('truncate', current ? 'text-foreground' : 'text-muted-foreground')}>
          {current?.label ?? placeholder}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-4 shrink-0 fill-current text-muted-foreground"
        >
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul
            role="listbox"
            className={cn(
              'absolute top-[calc(100%+4px)] left-0 z-50 max-h-64 w-full overflow-auto py-2',
              'rounded-[var(--md-sys-shape-corner-small)]',
              'bg-[var(--md-sys-color-surface-container)]',
              'shadow-[var(--md-sys-elevation-level-2)]',
            )}
          >
            {all.map(option => {
              const selected = option.value === value
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onValueChange(option.value)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex h-10 w-full items-center gap-3 px-3 text-left text-sm',
                      'transition-colors duration-[var(--md-sys-motion-duration-short)]',
                      selected
                        ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]'
                        : 'text-foreground hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_var(--md-sys-state-hover-opacity),transparent)]',
                    )}
                  >
                    {selected && (
                      <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0 fill-current">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                    <span className={cn('truncate', !selected && 'pl-7')}>{option.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}

/** M3 switch（与 studio/controls.tsx 的 Toggle 同一视觉，抽出来给页面用） */
export function Switch({
  checked,
  onChange,
  className,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
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
  )
}
