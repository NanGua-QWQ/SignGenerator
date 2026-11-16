'use client'

import {
  useCallback, useEffect, useMemo, useState,
} from 'react'

import {
  useSetAtom,
} from 'jotai'

import {
  fetchSign, fetchSigns,
} from '@/lib/studio/signs-client'
import {
  DEFAULT_MOD_SOURCE_ROOT, MOD_SOURCE_ROOT_STORAGE_KEY,
} from '@/lib/studio/server-write'
import {
  sanitizeProject,
} from '@/lib/studio/project'
import {
  cn,
} from '@/lib/utils'

import {
  layoutProjectAtom, selectedElementIdAtom, studioTabAtom,
} from '@/state/studio-store'

import {
  ActionButton, EmptyHint, Field, Panel, TextInput,
} from './controls'

import type {
  SignListEntry,
} from '@/lib/studio/signs-client'

/**
 * 标牌库：扫描本地模组工程里已有的标志牌，点一行就把它的版面读回工坊。
 *
 * 数据来源是 `<X>Entity.java` 的 `ensureDefaultTextLines()`（见
 * `lib/studio/import-java.ts`），所以打开后可以接着改位置、字号、字段，
 * 再「写入文件」覆盖回同一个类 —— 既造新牌也改旧牌。
 *
 * 只读接口：这里不会往模组目录写任何东西，写盘始终走「生成代码」里的按钮。
 */
export default function LibraryPanel({ onClose }: { onClose?: () => void } = {}) {
  const setProject = useSetAtom(layoutProjectAtom)
  const setSelectedId = useSetAtom(selectedElementIdAtom)
  const setTab = useSetAtom(studioTabAtom)

  const [root, setRoot] = useState(DEFAULT_MOD_SOURCE_ROOT)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [opening, setOpening] = useState<string | null>(null)
  const [signs, setSigns] = useState<SignListEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [scanWarnings, setScanWarnings] = useState<string[]>([])
  const [loadedAt, setLoadedAt] = useState<number | null>(null)

  // 与「生成代码」面板共用同一条根目录记录
  useEffect(() => {
    const stored = window.localStorage.getItem(MOD_SOURCE_ROOT_STORAGE_KEY)
    if (stored !== null && stored.trim() !== '') setRoot(stored)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(MOD_SOURCE_ROOT_STORAGE_KEY, root)
  }, [root])

  const scan = useCallback(async (target: string) => {
    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      const result = await fetchSigns(target)
      if (!result.ok) {
        setSigns([])
        setScanWarnings([])
        setError(result.error)
        return
      }
      setSigns(result.signs)
      setScanWarnings(result.warnings)
      setLoadedAt(Date.now())
    }
    finally {
      setLoading(false)
    }
  }, [])

  // 首次进入自动扫一次（目录不存在也只是提示，不影响其它面板）
  useEffect(() => {
    void scan(root)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase()
    if (needle === '') return signs
    return signs.filter((sign) => {
      const haystack = `${sign.displayNameZh ?? ''} ${sign.displayNameEn ?? ''} ${sign.className} ${sign.variants.join(' ')}`
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [keyword, signs])

  async function open(sign: SignListEntry) {
    setOpening(sign.className)
    setError(null)
    setNotice(null)
    try {
      const result = await fetchSign(sign.className, root)
      if (!result.ok) {
        setError(result.error)
        return
      }
      const project = sanitizeProject(result.project)
      if (!project) {
        setError(`${sign.className} 的版面数据不合法，无法载入`)
        return
      }
      setProject(project)
      setSelectedId(project.elements[0]?.id ?? null)
      setTab('element')
      const hints = result.warnings.length > 0 ? `（${result.warnings.length} 条提示）` : ''
      setNotice(`已载入 ${project.options.displayNameZh}：`
        + `${project.width}×${project.height} bit · ${project.options.variants.length} 变体 · `
        + `${project.elements.length} 元素 · ${project.fields.length} 字段${hints}，`
        + '改完可直接在「生成代码」里覆盖写入')
      setScanWarnings(result.warnings)
    }
    finally {
      setOpening(null)
    }
  }

  return (
    <div className="space-y-3">
      <Panel
        title="标牌库"
        hint={`${signs.length} 个可编辑标牌${loadedAt ? ' · 已扫描' : ''}`}
        actions={(
          <>
            <ActionButton
              variant="outlined"
              title="重新扫描模组工程"
              onClick={() => {
                void scan(root)
              }}
              disabled={loading}
            >
              {loading ? '扫描中…' : '刷新'}
            </ActionButton>
            {onClose && (
              <ActionButton variant="ghost" onClick={onClose}>关闭</ActionButton>
            )}
          </>
        )}
      >
        <Field label="模组源码根目录（只读扫描）" hint="含 src/main/java 的那一层">
          <TextInput value={root} mono onChange={setRoot} />
        </Field>

        <TextInput
          value={keyword}
          placeholder="搜索：中文名 / 类名 / 注册名"
          onChange={setKeyword}
        />

        {error !== null && (
          <p className="text-[11px] leading-4 text-[var(--md-sys-color-error)]">{error}</p>
        )}

        {notice !== null && (
          <p className="rounded-[var(--md-sys-shape-corner-extra-small)] bg-[var(--md-sys-color-secondary-container)] px-2 py-1.5 text-[11px] leading-4 text-[var(--md-sys-color-on-secondary-container)]">
            {notice}
          </p>
        )}

        {loading && signs.length === 0 && <EmptyHint>正在读取模组工程…</EmptyHint>}

        {!loading && error === null && filtered.length === 0 && (
          <EmptyHint>
            {signs.length === 0
              ? '这个目录里没有找到带版面的标志牌（检查根目录是否指到 versions/common）'
              : '没有匹配的标牌'}
          </EmptyHint>
        )}

        {filtered.length > 0 && (
          <ul className="max-h-[calc(100vh-22rem)] space-y-1 overflow-auto">
            {filtered.map((sign) => {
              const busy = opening === sign.className
              return (
                <li key={sign.className}>
                  <button
                    type="button"
                    disabled={opening !== null}
                    onClick={() => {
                      void open(sign)
                    }}
                    title={`载入 ${sign.className}（会替换当前工程，可 Ctrl+Z 撤回）`}
                    className={cn(
                      'w-full rounded-[var(--md-sys-shape-corner-small)] border px-2 py-1.5 text-left',
                      'transition-colors duration-[var(--md-sys-motion-duration-short)]',
                      busy
                        ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-secondary-container)]'
                        : 'border-[var(--md-sys-color-outline-variant)] hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,transparent)]',
                      opening !== null && !busy && 'opacity-60',
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-[12px] font-medium text-foreground">
                        {sign.displayNameZh ?? sign.className}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground md-code">
                        {sign.width}×{sign.height}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-[10px] text-muted-foreground md-code">
                        {sign.className}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {sign.variantCount > 1 ? `${sign.variantCount} 变体 · ` : ''}
                        {sign.elementCount} 元素 · {sign.fieldCount} 字段
                      </span>
                    </span>
                    {sign.variants.length > 0 && (
                      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground md-code">
                        {sign.variants.join(', ')}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {scanWarnings.length > 0 && (
          <details className="rounded-[var(--md-sys-shape-corner-extra-small)] border border-[var(--md-sys-color-outline-variant)] px-2 py-1.5">
            <summary className="cursor-pointer text-[11px] text-muted-foreground">
              解析提示（{scanWarnings.length}）
            </summary>
            <ul className="mt-1 max-h-32 space-y-0.5 overflow-auto">
              {scanWarnings.map((warning, index) => (
                <li key={index} className="text-[10px] leading-4 text-muted-foreground">
                  {warning}
                </li>
              ))}
            </ul>
          </details>
        )}

        <p className="text-[11px] leading-4 text-muted-foreground">
          点一行即可把该标牌的版面读进画布（
          <span className="md-code">Ctrl+Z</span>
          {' '}
          可撤回）。扫描是**只读**的，不会改动模组源码。
        </p>
      </Panel>
    </div>
  )
}
