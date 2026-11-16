'use client'

import {
  useRef, useState,
} from 'react'

import {
  useAtomValue, useSetAtom,
} from 'jotai'

import {
  readImageFile,
} from '@/lib/studio/assets'
import {
  createReference,
} from '@/lib/studio/project'
import {
  layoutProjectAtom, patchReferenceAtom, setReferenceAtom,
} from '@/state/studio-store'
import {
  cn,
} from '@/lib/utils'

/**
 * 参考图控件（导入 / 显示 / 透明度 / 适配 / 移除）。
 *
 * 参考图是**描图底图** —— 只铺在画布上（网格之上、元素之下），
 * **不参与代码生成**，也不会写进模组工程，所以它的状态挂在工程上
 * 但 `java.ts` 完全无视它。
 *
 * 组件自带 Jotai 连接，方便直接塞进画布工具条（与 `FieldPanel` 同一套路）。
 */

/** dataURL 字符数超过这个量级就提示可能存不进 localStorage（约 5MB 配额） */
const STORAGE_WARN_SIZE = 1_500_000

const FIT_OPTIONS: { value: 'contain' | 'stretch', label: string }[] = [
  { value: 'contain', label: '等比放入' },
  { value: 'stretch', label: '拉伸铺满' },
]

export function ReferenceImageControl() {
  const reference = useAtomValue(layoutProjectAtom).reference
  const setReference = useSetAtom(setReferenceAtom)
  const patchReference = useSetAtom(patchReferenceAtom)

  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError(`${file.name} 不是图片文件`)
      return
    }
    setBusy(true)
    try {
      const { dataUrl } = await readImageFile(file)
      setReference(createReference({
        dataUrl,
        name: file.name.replace(/\.[^.]+$/, ''),
      }))
    }
    catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    }
    finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const percent = reference ? Math.round(reference.opacity * 100) : 0
  const oversized = Boolean(reference && reference.dataUrl.length > STORAGE_WARN_SIZE)

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground">参考图</span>

      <label
        className={cn(
          'flex items-center gap-1 text-[11px] select-none',
          reference ? 'cursor-pointer text-muted-foreground' : 'cursor-not-allowed opacity-50',
        )}
        title="参考图只用于描图，不参与代码生成"
      >
        <input
          type="checkbox"
          checked={reference?.visible ?? false}
          disabled={!reference}
          onChange={event => patchReference({ visible: event.target.checked })}
          className="accent-primary size-3.5"
        />
        显示
      </label>

      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className={cn(
          'flex h-7 shrink-0 items-center gap-1 rounded-[var(--md-sys-shape-corner-extra-small)]',
          'border border-[var(--md-sys-color-outline)] px-2 text-[11px] text-foreground transition-colors',
          'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,transparent)] disabled:opacity-50',
        )}
      >
        <svg viewBox="0 0 24 24" className="size-3.5 fill-current">
          <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
        </svg>
        {busy ? '读取中' : reference ? '换一张' : '导入'}
      </button>

      {reference && (
        <>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={percent}
            title={`不透明度 ${percent}%`}
            onChange={event => patchReference({ opacity: Number(event.target.value) / 100 })}
            className="accent-primary h-1 w-16 cursor-pointer"
          />
          <span className="w-8 shrink-0 text-[11px] text-muted-foreground md-code">{percent}%</span>

          <select
            value={reference.fit}
            title="参考图适配方式"
            onChange={event => patchReference({
              fit: event.target.value === 'stretch' ? 'stretch' : 'contain',
            })}
            className="h-7 cursor-pointer rounded-[var(--md-sys-shape-corner-extra-small)] border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container-lowest)] px-1.5 text-[11px] text-foreground outline-none transition-colors focus:border-[var(--md-sys-color-primary)]"
          >
            {FIT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <button
            type="button"
            title="移除参考图"
            onClick={() => setReference(null)}
            className="grid size-6 place-items-center rounded-full text-destructive transition-colors hover:bg-[color-mix(in_srgb,var(--md-sys-color-error)_12%,transparent)]"
          >
            <svg viewBox="0 0 24 24" className="size-3.5 fill-current">
              <path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4z" />
            </svg>
          </button>
        </>
      )}

      {oversized && (
        <span
          className="text-[10px] text-[var(--md-sys-color-error)]"
          title="浏览器本地存档（localStorage）只有约 5MB，超大的参考图可能存不进去；建议先导出工程 JSON 备份"
        >
          图较大，可能存不进本地存档
        </span>
      )}

      {error && (
        <span className="text-[10px] text-[var(--md-sys-color-error)]">{error}</span>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={event => void handleFile(event.target.files)}
      />
    </span>
  )
}

export default ReferenceImageControl
