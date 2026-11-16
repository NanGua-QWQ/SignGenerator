'use client'

import {
  useMemo, useRef, useState,
} from 'react'

import {
  SIGN_TEXTURE_PREFIX, SPRITE_GROUPS, SPRITE_TOTAL,
} from '@/lib/studio/sprites'
import {
  cn,
} from '@/lib/utils'

import type {
  LayoutAsset, LayoutField,
} from '@/lib/studio/layout-model'
import type {
  SpriteItem,
} from '@/lib/studio/sprites'

/**
 * 可视化图案库。
 *
 * 内置贴图直接显示**真实 PNG**（`/textures/sign/*.png`，与模组素材同源），
 * 不再画矢量近似图；用户导入的图片同样显示真实位图。
 */
export function SpriteLibrary({
  value,
  fields,
  assets,
  onPick,
  onImport,
  onRemoveAsset,
}: {
  value: string
  fields: LayoutField[]
  assets: LayoutAsset[]
  onPick: (path: string) => void
  onImport: (file: File) => Promise<void>
  onRemoveAsset: (id: string) => void
}) {
  const [groupKey, setGroupKey] = useState<string>(SPRITE_GROUPS[0].key)
  const [query, setQuery] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const group = SPRITE_GROUPS.find(item => item.key === groupKey) ?? SPRITE_GROUPS[0]

  const searching = query.trim().length > 0

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return group.items
    // 搜索时跨全部分组（标签 + 文件名 + 完整资源路径）
    return SPRITE_GROUPS
      .flatMap(g => g.items)
      .filter(item => (
        item.label.toLowerCase().includes(q)
        || item.value.toLowerCase().includes(q)
        || (item.file ?? '').toLowerCase().includes(q)
      ))
  }, [group, query])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setImporting(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          setError(`${file.name} 不是图片文件`)
          continue
        }
        await onImport(file)
      }
    }
    catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    }
    finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      {/* 搜索 + 导入 */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={`搜索 ${SPRITE_TOTAL} 个图案…`}
            className="h-7 w-full rounded-[var(--md-sys-shape-corner-extra-small)] border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container-lowest)] px-2 pr-6 text-[11px] text-foreground outline-none transition-colors focus:border-[var(--md-sys-color-primary)] focus:ring-1 focus:ring-[var(--md-sys-color-primary)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="清空搜索"
            >
              <svg viewBox="0 0 24 24" className="size-3.5 fill-current"><path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" /></svg>
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={importing}
          onClick={() => fileRef.current?.click()}
          className="flex h-7 shrink-0 items-center gap-1 rounded-[var(--md-sys-shape-corner-extra-small)] border border-[var(--md-sys-color-outline)] px-2 text-[11px] text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,transparent)] disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="size-3.5 fill-current"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" /></svg>
          {importing ? '导入中' : '导入图片'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={event => void handleFiles(event.target.files)}
        />
      </div>

      {error && (
        <p className="text-[10px] text-[var(--md-sys-color-error)]">{error}</p>
      )}

      {/* 用户导入的真实图片 */}
      {assets.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground">我导入的图片</p>
          <div className="grid grid-cols-4 gap-1.5">
            {assets.map(asset => (
              <AssetThumb
                key={asset.id}
                asset={asset}
                active={value === asset.texturePath}
                onPick={() => onPick(asset.texturePath)}
                onRemove={() => onRemoveAsset(asset.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 分组选择 */}
      {!searching && (
        <div className="flex flex-wrap gap-1">
          {SPRITE_GROUPS.map(g => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGroupKey(g.key)}
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] transition-colors',
                g.key === groupKey
                  ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]'
                  : 'text-muted-foreground hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,transparent)]',
              )}
            >
              {g.title}
              <span className="ml-1 opacity-60">{g.items.length}</span>
            </button>
          ))}
        </div>
      )}

      {!searching && (
        <p className="text-[10px] leading-4 text-muted-foreground">{group.hint}</p>
      )}

      {/* 图案网格 */}
      <div className="max-h-72 overflow-y-auto rounded-[var(--md-sys-shape-corner-small)] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-lowest)] p-1.5">
        <div className="grid grid-cols-4 gap-1.5">
          {items.map(item => (
            <SpriteThumb
              key={`${item.label}-${item.value}`}
              item={item}
              active={value === item.value}
              missingField={Boolean(item.requires) && !fields.some(f => f.key === item.requires)}
              onPick={() => onPick(item.value)}
            />
          ))}
        </div>
        {items.length === 0 && (
          <p className="py-6 text-center text-[10px] text-muted-foreground">没有匹配的图案</p>
        )}
      </div>

      {/* 当前选中路径 */}
      <p className="truncate text-[10px] text-muted-foreground md-code" title={value}>
        {value.startsWith(SIGN_TEXTURE_PREFIX) ? value.slice(SIGN_TEXTURE_PREFIX.length) : value}
      </p>
    </div>
  )
}

/** 一个内置图案缩略图（真实 PNG） */
function SpriteThumb({
  item,
  active,
  missingField,
  onPick,
}: {
  item: SpriteItem
  active: boolean
  missingField: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      title={`${item.label}${item.requires ? `\n需要字段 {${item.requires}}` : ''}\n${item.value}`}
      onClick={onPick}
      className={cn(
        'flex flex-col items-center gap-1 rounded-[var(--md-sys-shape-corner-small)] border p-1 transition-colors',
        active
          ? 'border-[var(--md-sys-color-primary)] bg-[color-mix(in_srgb,var(--md-sys-color-primary)_12%,transparent)]'
          : 'border-transparent hover:border-[var(--md-sys-color-outline-variant)] hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,transparent)]',
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-[2px] bg-[repeating-conic-gradient(var(--md-sys-color-outline-variant)_0_25%,transparent_0_50%)] bg-[length:8px_8px]">
        {item.thumb
          ? (
              <img
                src={item.thumb}
                alt={item.label}
                loading="lazy"
                draggable={false}
                /* 256px 素材缩到 36px，用平滑缩放（nearest 会严重锯齿） */
                className="size-full object-contain"
              />
            )
          : (
              <span className="text-[10px] font-medium text-[var(--md-sys-color-on-surface-variant)]">{'{}'}</span>
            )}
      </span>
      <span className="line-clamp-2 w-full text-center text-[9px] leading-3 text-muted-foreground">
        {item.label}
      </span>
      {missingField && (
        <span className="text-[8px] leading-none text-[var(--md-sys-color-error)]">
          缺 {`{${item.requires}}`}
        </span>
      )}
    </button>
  )
}

/** 用户导入图片的缩略图 */
function AssetThumb({
  asset,
  active,
  onPick,
  onRemove,
}: {
  asset: LayoutAsset
  active: boolean
  onPick: () => void
  onRemove: () => void
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        title={`${asset.name}\n${asset.texturePath}`}
        onClick={onPick}
        className={cn(
          'flex w-full flex-col items-center gap-1 rounded-[var(--md-sys-shape-corner-small)] border p-1.5 transition-colors',
          active
            ? 'border-[var(--md-sys-color-primary)] bg-[color-mix(in_srgb,var(--md-sys-color-primary)_12%,transparent)]'
            : 'border-[var(--md-sys-color-outline-variant)] hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,transparent)]',
        )}
      >
        <img
          src={asset.dataUrl}
          alt={asset.name}
          className="size-9 object-contain [image-rendering:pixelated]"
        />
        <span className="line-clamp-2 w-full text-center text-[9px] leading-3 text-muted-foreground">
          {asset.name}
        </span>
      </button>
      <button
        type="button"
        title="移除"
        onClick={event => {
          event.stopPropagation()
          onRemove()
        }}
        className="absolute -top-1 -right-1 hidden size-4 place-items-center rounded-full bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] group-hover:grid"
      >
        <svg viewBox="0 0 24 24" className="size-3 fill-current"><path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" /></svg>
      </button>
    </div>
  )
}

export default SpriteLibrary
