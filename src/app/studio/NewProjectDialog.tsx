'use client'

import {
  useEffect, useState,
} from 'react'

import {
  NumberInput, Panel,
} from './controls'

import {
  SIZE_PRESETS,
} from '@/lib/studio/sprites'
import {
  clampSize,
} from '@/lib/studio/project'
import {
  cn,
} from '@/lib/utils'

/**
 * 新建工程对话框（M3 basic dialog）。
 *
 * 只问一件事：牌面宽 × 高，单位 bit（1 bit = 1/16 方块）。
 */

export interface NewProjectDialogProps {
  open: boolean
  initialWidth: number
  initialHeight: number
  /** 已有元素时，确认会清空版面 —— 用于提示文案 */
  hasContent: boolean
  onCancel: () => void
  onConfirm: (size: { width: number, height: number }) => void
}

export function NewProjectDialog({
  open,
  initialWidth,
  initialHeight,
  hasContent,
  onCancel,
  onConfirm,
}: NewProjectDialogProps) {
  const [width, setWidth] = useState(initialWidth)
  const [height, setHeight] = useState(initialHeight)

  useEffect(() => {
    if (!open) return
    setWidth(initialWidth)
    setHeight(initialHeight)
  }, [open, initialWidth, initialHeight])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  const blocksW = width / 16
  const blocksH = height / 16
  const isNonIntegral = width % 16 !== 0 || height % 16 !== 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-title"
    >
      <div
        role="presentation"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--md-sys-color-scrim)_32%,transparent)]"
        onClick={onCancel}
      />

      <div className="relative w-full max-w-sm rounded-[var(--md-sys-shape-corner-extra-large)] bg-[var(--md-sys-color-surface-container-high)] p-6 shadow-[var(--md-sys-elevation-level-3)]">
        <h2
          id="new-project-title"
          className="text-base leading-6 font-normal text-foreground"
        >
          新建标牌版面
        </h2>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          填写牌面尺寸。单位是 bit —— 1 bit = 1/16 方块，画布上 1 bit 就是 1 个网格。
        </p>

        {/* 尺寸输入 */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-[11px] font-medium tracking-[0.03125rem] text-muted-foreground">
              宽（bit）
            </span>
            <NumberInput value={width} onChange={value => setWidth(clampSize(value))} min={1} max={128} />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium tracking-[0.03125rem] text-muted-foreground">
              高（bit）
            </span>
            <NumberInput value={height} onChange={value => setHeight(clampSize(value))} min={1} max={128} />
          </label>
        </div>

        <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
          等于
          {' '}
          <span className="md-code text-foreground">
            {formatBlocks(blocksW)}
            {' × '}
            {formatBlocks(blocksH)}
          </span>
          {' '}
          方块
          {isNonIntegral && '（不是整数方块，牌面会比方块略大或略小）'}
        </p>

        {/* 预设 */}
        <div className="mt-4 space-y-2">
          <span className="text-[11px] font-medium tracking-[0.03125rem] text-muted-foreground">
            常用尺寸
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SIZE_PRESETS.map(preset => {
              const active = preset.width === width && preset.height === height
              return (
                <button
                  key={preset.label}
                  type="button"
                  title={preset.hint}
                  onClick={() => {
                    setWidth(preset.width)
                    setHeight(preset.height)
                  }}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] leading-none transition-colors',
                    'duration-[var(--md-sys-motion-duration-short)]',
                    active
                      ? 'border-transparent bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]'
                      : 'border-[var(--md-sys-color-outline-variant)] text-muted-foreground hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_var(--md-sys-state-hover-opacity),transparent)]',
                  )}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>

        {hasContent && (
          <p className="mt-4 rounded-[var(--md-sys-shape-corner-small)] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] px-3 py-2 text-[11px] leading-4 text-[var(--md-sys-color-error)]">
            确定后会清空当前版面上的所有元素。想保留请先取消，改用工具栏里的尺寸输入。
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-8 items-center rounded-full px-3 text-sm font-medium text-primary transition-colors duration-[var(--md-sys-motion-duration-short)] hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_var(--md-sys-state-hover-opacity),transparent)]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ width, height })}
            className="inline-flex h-8 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors duration-[var(--md-sys-motion-duration-short)] hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary)_var(--md-sys-state-hover-opacity),var(--md-sys-color-primary))]"
          >
            新建
          </button>
        </div>
      </div>
    </div>
  )
}

/** 1.25 -> "1.25"，2 -> "2" */
function formatBlocks(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
}

export { Panel }
