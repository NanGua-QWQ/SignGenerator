'use client'

import {
  useEffect,
} from 'react'

/**
 * 快捷键速查表（M3 basic dialog）。
 *
 * 只做展示 —— 真正的按键分发在 `page.tsx` 的全局 keydown 里，
 * 这里保持和那边一一对应即可。
 */

export interface ShortcutHelpDialogProps {
  open: boolean
  onClose: () => void
}

interface ShortcutRow {
  keys: string[]
  label: string
  hint?: string
}

const GROUPS: { title: string, rows: ShortcutRow[] }[] = [
  {
    title: '选择与移动',
    rows: [
      { keys: ['↑', '↓', '←', '→'], label: '微调位置', hint: '1 bit' },
      { keys: ['Shift', '↑↓←→'], label: '大步微调', hint: '8 bit = 半个方块' },
      { keys: ['拖拽'], label: '空白处拖拽框选', hint: '元素中心进框即选中' },
      { keys: ['Ctrl', '拖拽'], label: '追加框选', hint: '从元素上也能起框' },
      { keys: ['Ctrl', '点击'], label: '加选 / 减选元素' },
      { keys: ['Esc'], label: '取消选择' },
      { keys: ['空格', '拖拽'], label: '平移画布' },
      { keys: ['Alt', '拖拽'], label: '0.5 bit 步进移动' },
      { keys: ['Alt', '↑↓←→'], label: '0.5 bit 微调' },
      { keys: ['手柄'], label: '中心对称缩放', hint: '每侧 1 bit' },
      { keys: ['Alt', '手柄'], label: '精细缩放', hint: '每侧 0.5 bit' },
    ],
  },
  {
    title: '编辑',
    rows: [
      { keys: ['Ctrl', 'D'], label: '原位复制选中元素' },
      { keys: ['Ctrl', 'C'], label: '复制元素到系统剪贴板', hint: '可在另一个标签页粘贴' },
      { keys: ['Ctrl', 'V'], label: '粘贴元素', hint: '右下偏移 2 bit' },
      { keys: ['Delete'], label: '删除选中元素', hint: 'Backspace 同效' },
      { keys: ['Ctrl', 'Z'], label: '撤销' },
      { keys: ['Ctrl', 'Shift', 'Z'], label: '重做', hint: 'Ctrl + Y 同效' },
    ],
  },
  {
    title: '图层与变换',
    rows: [
      { keys: ['R'], label: '旋转 +15°', hint: '文本与贴图都转 rotZ' },
      { keys: ['Shift', 'R'], label: '旋转 −15°' },
      { keys: [']'], label: '上移一层' },
      { keys: ['['], label: '下移一层' },
      { keys: ['V'], label: '显示 / 隐藏选中元素' },
    ],
  },
  {
    title: '视图',
    rows: [
      { keys: ['+'], label: '放大画布', hint: '= 同效' },
      { keys: ['-'], label: '缩小画布' },
      { keys: ['0'], label: '回到中心并恢复默认缩放' },
      { keys: ['G'], label: '网格开关' },
      { keys: ['Ctrl', '滚轮'], label: '按档位缩放' },
    ],
  },
]

export function ShortcutHelpDialog({
  open,
  onClose,
}: ShortcutHelpDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // 捕获阶段拦下：否则 page.tsx 的全局 Esc（取消选择）也会跟着触发
        event.stopImmediatePropagation()
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-help-title"
    >
      <div
        role="presentation"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--md-sys-color-scrim)_32%,transparent)]"
        onClick={onClose}
      />

      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--md-sys-shape-corner-extra-large)] bg-[var(--md-sys-color-surface-container-high)] shadow-[var(--md-sys-elevation-level-3)]">
        <div className="shrink-0 px-6 pt-6">
          <h2
            id="shortcut-help-title"
            className="text-base leading-6 font-normal text-foreground"
          >
            键盘快捷键
          </h2>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            在画布上直接按键即可。焦点在输入框里时不生效，避免打断打字。
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4 [scrollbar-gutter:stable]">
          <div className="grid gap-5 sm:grid-cols-2">
            {GROUPS.map(group => (
              <section key={group.title}>
                <h3 className="mb-2 text-[11px] font-medium tracking-[0.03125rem] text-primary uppercase">
                  {group.title}
                </h3>
                <ul className="space-y-1.5">
                  {group.rows.map(row => (
                    <li
                      key={`${group.title}-${row.label}`}
                      className="flex items-start justify-between gap-3"
                    >
                      <span className="flex min-w-0 flex-wrap items-center gap-1">
                        {row.keys.map((key, index) => (
                          <span key={`${key}-${index}`} className="flex items-center gap-1">
                            {index > 0 && (
                              <span className="text-[10px] text-muted-foreground">+</span>
                            )}
                            <kbd className="md-code inline-flex h-5 min-w-5 items-center justify-center rounded-[var(--md-sys-shape-corner-extra-small)] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] px-1.5 text-[10px] leading-none text-foreground">
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[11px] leading-4 text-foreground">{row.label}</span>
                        {row.hint && (
                          <span className="block text-[10px] leading-3.5 text-muted-foreground">{row.hint}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 px-6 pt-2 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors duration-[var(--md-sys-motion-duration-short)] hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary)_var(--md-sys-state-hover-opacity),var(--md-sys-color-primary))]"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  )
}
