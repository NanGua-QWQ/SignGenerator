import type {
  PopoverColor,
} from './types'

export interface PopoverColorOption {
  value: PopoverColor
  label: string
  panelClass: string
  swatchClass: string
}

export const POPOVER_COLOR_OPTIONS: PopoverColorOption[] = [
  {
    value: 'slate',
    label: '默认',
    panelClass:
      'bg-slate-50 text-slate-950 border-slate-200 dark:bg-slate-900/95 dark:text-slate-50 dark:border-slate-700',
    swatchClass: 'bg-slate-500',
  },
  {
    value: 'amber',
    label: '琥珀',
    panelClass:
      'bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-950/95 dark:text-amber-50 dark:border-amber-900/60',
    swatchClass: 'bg-amber-500',
  },
  {
    value: 'emerald',
    label: '绿',
    panelClass:
      'bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-950/95 dark:text-emerald-50 dark:border-emerald-900/60',
    swatchClass: 'bg-emerald-500',
  },
  {
    value: 'sky',
    label: '天蓝',
    panelClass:
      'bg-sky-50 text-sky-950 border-sky-200 dark:bg-sky-950/95 dark:text-sky-50 dark:border-sky-900/60',
    swatchClass: 'bg-sky-500',
  },
  {
    value: 'rose',
    label: '玫红',
    panelClass:
      'bg-rose-50 text-rose-950 border-rose-200 dark:bg-rose-950/95 dark:text-rose-50 dark:border-rose-900/60',
    swatchClass: 'bg-rose-500',
  },
  {
    value: 'violet',
    label: '紫',
    panelClass:
      'bg-violet-50 text-violet-950 border-violet-200 dark:bg-violet-950/95 dark:text-violet-50 dark:border-violet-900/60',
    swatchClass: 'bg-violet-500',
  },
]

export function isPopoverColor(value: unknown): value is PopoverColor {
  return POPOVER_COLOR_OPTIONS.some(option => option.value === value)
}

export function getPopoverColorOption(value: PopoverColor): PopoverColorOption {
  return POPOVER_COLOR_OPTIONS.find(option => option.value === value) ?? POPOVER_COLOR_OPTIONS[0]
}
