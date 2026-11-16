'use client'

import {
  colorToCss,
} from '@/lib/studio/text'
import {
  BASEPLATE_PRESETS,
} from '@/lib/studio/layout-model'
import {
  cn,
} from '@/lib/utils'

import type {
  LayoutBaseplate,
} from '@/lib/studio/layout-model'

/**
 * 道路等级底色选择器（**仅画布预览**）。
 *
 * 中国道路标志按等级使用固定基色（GB 5768）：
 * 高速绿、国道红、省道黄、城市蓝、旅游棕、施工橙。
 * 这里提供一键预设 + 自定义取色。
 *
 * ⚠️ 它**不参与代码生成**：生成的实体里没有这一层色块，牌面底色由方块模型
 * （Blockbench 的牌面贴图）决定。真要在游戏里铺纯色，请加一个**色块元素**。
 */
export function BaseplatePicker({
  value,
  onChange,
  className,
}: {
  value: LayoutBaseplate
  onChange: (patch: Partial<LayoutBaseplate>) => void
  className?: string
}) {
  const activePreset = BASEPLATE_PRESETS.find(preset => preset.color === value.color)

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-foreground">
          道路等级底色
          <span className="ml-1 font-normal text-muted-foreground">（仅预览）</span>
        </span>
        <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-muted-foreground select-none">
          <input
            type="checkbox"
            checked={value.visible}
            onChange={event => onChange({ visible: event.target.checked })}
            className="size-3.5 accent-[var(--md-sys-color-primary)]"
          />
          显示
        </label>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {BASEPLATE_PRESETS.map(preset => {
          const active = activePreset?.id === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              title={`${preset.label} · ${preset.hint}`}
              onClick={() => onChange({
                color: preset.color,
                visible: preset.id === 'plain' ? false : true,
              })}
              className={cn(
                'group flex items-center gap-1.5 rounded-[var(--md-sys-shape-corner-extra-small)] border px-1.5 py-1',
                'text-[10px] transition-colors duration-[var(--md-sys-motion-duration-short)]',
                active
                  ? 'border-[var(--md-sys-color-primary)] bg-[color-mix(in_srgb,var(--md-sys-color-primary)_12%,transparent)] text-foreground'
                  : 'border-[var(--md-sys-color-outline-variant)] text-muted-foreground hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,transparent)]',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'size-3.5 shrink-0 rounded-[2px] border',
                  preset.id === 'plain'
                    ? 'border-[var(--md-sys-color-outline)] bg-[repeating-conic-gradient(var(--md-sys-color-outline-variant)_0_25%,transparent_0_50%)] bg-[length:6px_6px]'
                    : 'border-black/20',
                )}
                style={preset.id === 'plain' ? undefined : { backgroundColor: colorToCss(preset.color) }}
              />
              {preset.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">自定义颜色</span>
        <input
          type="color"
          value={rgbToHexInput(value.color)}
          onChange={event => onChange({ color: hexInputToRgb(event.target.value) })}
          className="h-6 w-10 cursor-pointer rounded-[var(--md-sys-shape-corner-extra-small)] border border-[var(--md-sys-color-outline)] bg-transparent p-0.5"
          aria-label="底色自定义颜色"
        />
        <span className="text-[10px] text-muted-foreground md-code">
          #{value.color.toString(16).padStart(6, '0').toUpperCase()}
        </span>
      </div>
    </div>
  )
}

function rgbToHexInput(color: number): string {
  return `#${(color & 0xFFFFFF).toString(16).padStart(6, '0')}`
}

function hexInputToRgb(hex: string): number {
  const clean = hex.replace('#', '').slice(0, 6)
  const parsed = Number.parseInt(clean, 16)
  return Number.isFinite(parsed) ? parsed : 0
}

export default BaseplatePicker
