'use client'

import {
  useEffect, useMemo, useRef, useState,
} from 'react'

import {
  useAtom, useAtomValue, useSetAtom,
} from 'jotai'
import {
  useTheme,
} from 'next-themes'

import {
  Button,
} from '@/components/button'
import {
  parseElementsPayload, readElementsFromStorage,
} from '@/lib/studio/clipboard'
import {
  loadProjectFromStorage, sanitizeProject, saveProjectToStorage,
} from '@/lib/studio/project'
import {
  defaultTexturePath, readImageFile,
} from '@/lib/studio/assets'
import {
  cn,
} from '@/lib/utils'
import type { LayoutElement, LayoutTextElement, LayoutVariant } from '@/lib/studio/layout-model'

import {
  aiWindowOpenAtom,
} from '@/state/ai-store'
import {
  addAssetAtom, addElementAtom, canRedoAtom, canUndoAtom, canvasViewAtom, copyElementAtom,
  DEFAULT_ZOOM, duplicateElementAtom, duplicateProjectAtom, ensureDynamicFieldsAtom,
  hoverElementIdAtom,
  insertElementsAtom,
  layoutProjectAtom,
  moveElementAtom, moveElementLayerAtom, pasteElementAtom, patchCanvasViewAtom,
  previewElementsAtom, recenterAtom, redoAtom, removeAssetAtom,
  removeElementAtom,
  resizeElementAtom,
  selectedElementIdAtom, selectedElementIdsAtom, selectElementsAtom,
  setActiveVariantAtom, setLayoutProjectAtom, setSignSizeAtom,
  studioNoticeAtom, studioTabAtom,
  undoAtom, updateElementAtom, updateTextElementAtom,
} from '@/state/studio-store'
import { activeVariantIdAtom, clearVariantFieldAtom, disableVariantOverrideAtom } from '@/state/studio-store'
import type {
  StudioTab,
} from '@/state/studio-store'

import {
  AiWindow,
} from './studio/AiWindow'
import {
  DesignCanvas, ZOOM_STEPS,
} from './studio/DesignCanvas'
import type {
  ResizePayload,
} from './studio/DesignCanvas'
import ElementPanel from './studio/ElementPanel'
import FieldPanel from './studio/FieldPanel'
import GeneratePanel from './studio/GeneratePanel'
import LibraryPanel from './studio/LibraryPanel'
import {
  NewProjectDialog,
} from './studio/NewProjectDialog'
import {
  ShortcutHelpDialog,
} from './studio/ShortcutHelpDialog'

/**
 * 路牌版面工坊（首页）。
 *
 * 全流程：新建工程（牌面尺寸 bit）-> 在 2D 网格画布上摆元素
 * （文本行 / logo 贴图 / 色块，全部对应 TextLineData）
 * -> 声明数据字段与枚举选项 -> 一键生成 Java 与资源文件。
 */

const TABS: { value: StudioTab, label: string }[] = [
  { value: 'element', label: '当前控件' },
  { value: 'project', label: '项目信息' },
  { value: 'field', label: '数据字段' },
  { value: 'export', label: '导出代码' },
]

const TAB_STORAGE_KEY = 'sign-generator.studio.tab.v3'

export default function StudioPage() {
  const project = useAtomValue(layoutProjectAtom)
  const setProject = useSetAtom(setLayoutProjectAtom)
  const setSignSize = useSetAtom(setSignSizeAtom)
  const [tab, setTab] = useAtom(studioTabAtom)

  const selectedId = useAtomValue(selectedElementIdAtom)
  const selectedIds = useAtomValue(selectedElementIdsAtom)
  const setSelectedId = useSetAtom(selectedElementIdAtom)
  const selectElements = useSetAtom(selectElementsAtom)
  /** Ctrl / Cmd 点击：在现有选择里增删 */
  const toggleElementSelection = (id: string) => {
    selectElements(selectedIds.includes(id)
      ? selectedIds.filter(item => item !== id)
      : [...selectedIds, id])
  }
  const [hoverId, setHoverId] = useAtom(hoverElementIdAtom)
  const [view, setView] = useAtom(canvasViewAtom)
  const patchView = useSetAtom(patchCanvasViewAtom)

  const addElement = useSetAtom(addElementAtom)
  const updateElement = useSetAtom(updateElementAtom)
  const updateTextElement = useSetAtom(updateTextElementAtom)
  const moveElement = useSetAtom(moveElementAtom)
  const resizeElement = useSetAtom(resizeElementAtom)
  const removeElement = useSetAtom(removeElementAtom)
  const duplicateElement = useSetAtom(duplicateElementAtom)
  const moveLayer = useSetAtom(moveElementLayerAtom)
  const addAsset = useSetAtom(addAssetAtom)
  const removeAsset = useSetAtom(removeAssetAtom)
  const ensureDynamicFields = useSetAtom(ensureDynamicFieldsAtom)

  /*
   * 方块变体：画布 / 右侧面板显示的「当前变体」。
   *
   * `null` = 基础版式，所有编辑写元素本体；非空 = 正在给该变体加覆盖，
   * 编辑通过下面几个 wrapper 改写到变体覆盖表里（本体保持不变）。
   */
  const variants = project.options.variants
  const activeVariantId = useAtomValue(activeVariantIdAtom)
  const setActiveVariant = useSetAtom(setActiveVariantAtom)
  const previewElements = useAtomValue(previewElementsAtom)
  const disableVariantOverride = useSetAtom(disableVariantOverrideAtom)
  const clearVariantField = useSetAtom(clearVariantFieldAtom)

  /** 变体覆盖的两个写操作，一次性传给属性面板 */
  const variantActions = useMemo(() => ({
    disable: (id: string, variantId: string) => disableVariantOverride({ id, variantId }),
    clearField: (id: string, variantId: string, key: string) => clearVariantField({ id, variantId, key }),
  }), [disableVariantOverride, clearVariantField])

  /** 变体越界保护：工程被整份替换后，旧的 activeVariantId 可能已经不存在 */
  useEffect(() => {
    if (activeVariantId && !variants.some(variant => variant.id === activeVariantId)) {
      setActiveVariant(null)
    }
  }, [activeVariantId, variants, setActiveVariant])

  /*
   * 以下包装器是「当前变体」唯一的下写通道：面板和画布只管调它们，
   * 不用各自关心该写本体还是写覆盖。
   */
  const patchElement = (id: string, patch: Partial<LayoutElement>) =>
    updateElement({ id, patch, variantId: activeVariantId })
  const patchTextElement = (id: string, patch: Partial<LayoutTextElement>) =>
    updateTextElement({ id, patch, variantId: activeVariantId })
  const move = (id: string, x: number, y: number, snap: boolean) =>
    moveElement({ id, x, y, snap, variantId: activeVariantId })
  const resize = (request: ResizePayload) =>
    resizeElement({ ...request, variantId: activeVariantId })
  const rotate = (id: string, rotZ: number) =>
    updateTextElement({ id, patch: { rotZ }, variantId: activeVariantId })
  const editText = (id: string, text: string) =>
    updateTextElement({ id, patch: { text }, variantId: activeVariantId })

  const undo = useSetAtom(undoAtom)
  const redo = useSetAtom(redoAtom)
  const copyElement = useSetAtom(copyElementAtom)
  const pasteElement = useSetAtom(pasteElementAtom)
  const pasteElements = useSetAtom(insertElementsAtom)
  const duplicateProject = useSetAtom(duplicateProjectAtom)
  const notice = useAtomValue(studioNoticeAtom)
  const setNotice = useSetAtom(studioNoticeAtom)
  const canUndo = useAtomValue(canUndoAtom)
  const canRedo = useAtomValue(canRedoAtom)
  const [recenterToken, setRecenterToken] = useAtom(recenterAtom)
  const setAiOpen = useSetAtom(aiWindowOpenAtom)
  const aiOpen = useAtomValue(aiWindowOpenAtom)

  const [hydrated, setHydrated] = useState(false)
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [shortcutOpen, setShortcutOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const projectImportRef = useRef<HTMLInputElement | null>(null)
  const { resolvedTheme, setTheme } = useTheme()

  const importProjectFromFile = async (file: File) => {
    try {
      const parsed = sanitizeProject(JSON.parse(await file.text()))
      if (!parsed) throw new Error('不是合法的版面工程 JSON')
      setProject(parsed)
      setSelectedId(parsed.elements[0]?.id ?? null)
      setNotice(`已导入工程：${parsed.options.displayNameZh}（${parsed.elements.length} 个元素）`)
    }
    catch (cause) {
      setNotice(`导入失败：${cause instanceof Error ? cause.message : String(cause)}`)
    }
  }

  // 首次进入时恢复上次的工程存档与面板
  useEffect(() => {
    const stored = loadProjectFromStorage()
    if (stored) setProject(stored)
    const storedTab = window.localStorage.getItem(TAB_STORAGE_KEY)
    if (storedTab && TABS.some(item => item.value === storedTab)) {
      setTab(storedTab as StudioTab)
    }
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 工程变化后防抖落盘
  useEffect(() => {
    if (!hydrated) return
    const timer = window.setTimeout(() => saveProjectToStorage(project), 600)
    return () => window.clearTimeout(timer)
  }, [hydrated, project])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(TAB_STORAGE_KEY, tab)
  }, [hydrated, tab])

  /**
   * 全局快捷键。
   *
   * 焦点在输入框 / 文本域 / 可编辑区域时整体跳过，避免打断打字。
   * 完整对照表见 `studio/ShortcutHelpDialog.tsx` —— 改这里记得同步那边。
   */
  const projectRef = useRef(project)
  projectRef.current = project
  useEffect(() => {
    /** 按档位缩放 */
    const stepZoom = (direction: number) => {
      const index = ZOOM_STEPS.findIndex(step => step >= view.zoom)
      const current = index < 0 ? ZOOM_STEPS.length - 1 : index
      const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, current + direction))]
      patchView({ zoom: next })
    }

    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return
      }
      /*
       * AI 配置窗口打开时，画布的快捷键整体让位。
       *
       * 关键的一条是 Ctrl+V：这里原本会 `preventDefault()` + `pasteElement()`，
       * 把浏览器原生的 paste 事件直接掐死 —— 窗口里「Ctrl+V 贴图」永远收不到
       * 剪贴板（表现就是「粘贴没反应」）。窗口自己的 Esc 由它自己处理。
       */
      if (aiOpen) return
      const mod = event.ctrlKey || event.metaKey
      const key = event.key
      const lower = key.toLowerCase()

      // ---------- 全局：撤销 / 重做 ----------
      if (mod && lower === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (mod && lower === 'y') {
        event.preventDefault()
        redo()
        return
      }
      /*
       * ⚠️ Ctrl+V 故意**不在这里处理**：
       * 这里 `preventDefault()` 会掐掉浏览器原生的 `paste` 事件，
       * 那样就拿不到系统剪贴板里的文本（跨标签页复制元素全靠它）。
       * 粘贴统一在下面的 paste 监听里做。
       */

      // ---------- 全局：视图（不带 Ctrl） ----------
      if (!mod) {
        if (lower === 'g') {
          event.preventDefault()
          patchView({ showGrid: !view.showGrid })
          return
        }
        if (key === '+' || key === '=') {
          event.preventDefault()
          stepZoom(1)
          return
        }
        if (key === '-' || key === '_') {
          event.preventDefault()
          stepZoom(-1)
          return
        }
        if (key === '0') {
          event.preventDefault()
          patchView({ zoom: DEFAULT_ZOOM })
          setRecenterToken(value => value + 1)
          return
        }
        if (key === 'Escape') {
          setSelectedId(null)
          return
        }
      }

      // ---------- 以下都需要选中元素 ----------
      const id = selectedId
      if (!id) return
      const element = projectRef.current.elements.find(item => item.id === id)
      if (!element) return

      if (key === 'Delete' || key === 'Backspace') {
        event.preventDefault()
        // 多选时一次删掉所有选中的元素（快照，避免删除过程中集合变化）
        for (const target of [...selectedIds].reverse()) removeElement(target)
        return
      }
      if (mod && lower === 'd') {
        event.preventDefault()
        duplicateElement(id)
        return
      }
      if (mod && lower === 'c') {
        event.preventDefault()
        copyElement(id)
        return
      }
      // 其余 Ctrl 组合（Ctrl+S 之类）交还浏览器
      if (mod) return

      if (key === ']') {
        event.preventDefault()
        moveLayer({
          id, delta: -1,
        })
        return
      }
      if (key === '[') {
        event.preventDefault()
        moveLayer({
          id, delta: 1,
        })
        return
      }
      if (lower === 'v') {
        event.preventDefault()
        updateElement({
          id,
          patch: {
            visible: !element.visible,
          },
        })
        return
      }
      if (lower === 'r') {
        event.preventDefault()
        const delta = event.shiftKey ? -15 : 15
        if (element.kind === 'text') {
          updateTextElement({
            id,
            patch: {
              rotZ: roundTenth(element.rotZ + delta),
            },
          })
        }
        else if (element.kind === 'logo') {
          updateElement({
            id,
            patch: {
              rotZ: roundTenth(element.rotZ + delta),
            },
          })
        }
        return
      }

      const step = event.altKey ? 0.5 : event.shiftKey ? 8 : 1
      const deltas: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
      }
      const delta = deltas[key]
      if (delta) {
        event.preventDefault()
        moveElement({
          id,
          x: element.x + delta[0],
          y: element.y + delta[1],
          snap: false,
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    aiOpen, copyElement, duplicateElement, moveElement, moveLayer, patchView, redo,
    removeElement, selectedId, selectedIds, setRecenterToken, setSelectedId, undo, updateElement,
    updateTextElement, view.showGrid, view.zoom,
  ])

  /**
   * 粘贴：优先用系统剪贴板里的元素信封（跨标签页），
   * 不是我们的格式就退回 localStorage 兜底 / 同页内存剪贴板。
   *
   * AI 配置窗口自己处理粘贴（贴图），这里让位。
   */
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (aiOpen || newDialogOpen || shortcutOpen) return
      const target = event.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return
      }

      const text = event.clipboardData?.getData('text/plain') ?? ''
      const fromClipboard = parseElementsPayload(text)
      const elements = fromClipboard ?? readElementsFromStorage()
      event.preventDefault()
      if (elements && elements.length > 0) {
        pasteElements(elements)
        return
      }
      pasteElement()
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [aiOpen, newDialogOpen, pasteElement, pasteElements, shortcutOpen])

  // 底部提示条自动消失
  useEffect(() => {
    if (notice === null) return
    const timer = window.setTimeout(() => setNotice(null), 2800)
    return () => window.clearTimeout(timer)
  }, [notice, setNotice])

  const blocks = useMemo(
    () => `${formatBlocks(project.width / 16)} × ${formatBlocks(project.height / 16)}`,
    [project.width, project.height],
  )

  /** 导入本地图片 → 存成资源，供画布显示真实位图、生成时写入模组 */
  const importAsset = async (file: File) => {
    const { dataUrl, width, height } = await readImageFile(file)
    addAsset({
      name: file.name.replace(/\.[^.]+$/, ''),
      dataUrl,
      texturePath: defaultTexturePath(file.name),
      width,
      height,
    })
  }

  return (
    <main className="grid h-screen min-h-0 grid-rows-[auto_1fr] bg-[var(--md-sys-color-surface)]">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <svg viewBox="0 0 24 24" className="size-4 shrink-0 fill-[var(--md-sys-color-primary)]">
            <path d="M3 4h18v6H3V4zm0 10h18v6H3v-6zm2 2v2h6v-2H5zm8 0v2h6v-2h-6z" />
          </svg>
          <h1 className="truncate text-sm font-medium tracking-[0.00625rem] text-foreground">
            路牌版面工坊
          </h1>
          <span className="hidden truncate text-[11px] text-muted-foreground xl:inline">
            摆版面 · 写字段 · 生成 Java
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-[11px] text-muted-foreground sm:inline md-code">
            {project.options.className} · {project.width}×{project.height} bit ·{' '}
            {project.elements.length} 元素 · {project.fields.length} 字段
          </span>
          <Button variant="outlined" size="small" onClick={() => setNewDialogOpen(true)}>
            新建工程
          </Button>
          <Button variant="outlined" size="small" onClick={() => projectImportRef.current?.click()}>
            导入工程
          </Button>
          <Button variant="text" size="small" onClick={() => setLibraryOpen(true)}>
            标牌库
          </Button>
          <input
            ref={projectImportRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0]
              event.currentTarget.value = ''
              if (file) void importProjectFromFile(file)
            }}
          />
          <Button
            variant="tonal"
            size="small"
            title="上传标志牌照片，让 AI 自动配置版面（生成仍需手动点）"
            onClick={() => setAiOpen(true)}
          >
            AI 配置
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            title={resolvedTheme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            <span className="relative grid place-items-center">
              <svg viewBox="0 0 24 24" className="col-start-1 row-start-1 size-4 scale-100 fill-current transition-all dark:scale-0">
                <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5l2 3h-4l2-3zm0 20l-2-3h4l-2 3zM2 12l3-2v4l-3-2zm20 0l-3 2v-4l3 2zM4.9 4.9l3.5 1.4-2.1 2.1-1.4-3.5zm14.2 14.2l-3.5-1.4 2.1-2.1 1.4 3.5zM4.9 19.1l1.4-3.5 2.1 2.1-3.5 1.4zM19.1 4.9l-1.4 3.5-2.1-2.1 3.5-1.4z" />
              </svg>
              <svg viewBox="0 0 24 24" className="col-start-1 row-start-1 size-4 scale-0 fill-current transition-all dark:scale-100">
                <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" />
              </svg>
            </span>
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[1fr_380px] max-lg:grid-cols-[1fr_330px] max-md:grid-cols-1 max-md:grid-rows-[48vh_1fr]">
        <section className="flex min-h-0 min-w-0 flex-col">
          {/* 画布上方的工程操作条 */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-low)] px-3 py-2">
            <Button
              variant="outlined"
              size="small"
              title="复制当前版面为一个新项目（自动换类名与注册名，不覆盖原方块）"
              onClick={() => duplicateProject()}
            >
              复制为新项目
            </Button>

            <span className="text-[11px] text-muted-foreground">牌面</span>
            <span className="flex items-center gap-1">
              <SizeInput
                value={project.width}
                onCommit={width => setSignSize({ width, height: project.height })}
                label="宽"
              />
              <span className="text-[11px] text-muted-foreground">×</span>
              <SizeInput
                value={project.height}
                onCommit={height => setSignSize({ width: project.width, height })}
                label="高"
              />
              <span className="text-[11px] text-muted-foreground">bit</span>
            </span>
            <span className="text-[11px] text-muted-foreground md-code">= {blocks} 方块</span>

            {/*
              方块变体切换器：决定画布上摆的是「基础版式」还是某个变体的覆盖值。
              只有一个变体时不显示（没有选择的意义）。
            */}
            {variants.length > 1 && (
              <VariantSwitcher
                variants={variants}
                activeId={activeVariantId}
                onChange={setActiveVariant}
              />
            )}

            <span className="mx-1 hidden h-4 w-px bg-[var(--md-sys-color-outline-variant)] sm:block" />

            <span className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title="撤销（Ctrl+Z）"
                disabled={!canUndo}
                onClick={() => undo()}
              >
                <svg viewBox="0 0 24 24" className="size-4 fill-current">
                  <path d="M12.5 8H7.83l2.58-2.59L9 4 4 9l5 5 1.41-1.41L7.83 10h4.67a3.5 3.5 0 0 1 0 7H10v2h2.5a5.5 5.5 0 0 0 0-11z" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title="重做（Ctrl+Shift+Z / Ctrl+Y）"
                disabled={!canRedo}
                onClick={() => redo()}
              >
                <svg viewBox="0 0 24 24" className="size-4 fill-current">
                  <path d="M11.5 8h4.67l-2.58-2.59L15 4l5 5-5 5-1.41-1.41L16.17 10H11.5a3.5 3.5 0 0 0 0 7H14v2h-2.5a5.5 5.5 0 0 1 0-11z" />
                </svg>
              </Button>
            </span>

            <span className="mx-1 h-4 w-px bg-[var(--md-sys-color-outline-variant)]" />

            {/* 添加元素：+ 文本 / + 贴图 / + 色块 */}
            <span className="flex items-center gap-1">
              <Button variant="tonal" size="small" title="添加文本行" onClick={() => addElement('text')}>
                + 文本
              </Button>
              <Button variant="tonal" size="small" title="添加贴图行" onClick={() => addElement('logo')}>
                + 贴图
              </Button>
              <Button variant="tonal" size="small" title="添加色块行" onClick={() => addElement('rect')}>
                + 色块
              </Button>
            </span>

            <span className="ml-auto flex items-center gap-2">
              <span className="hidden text-[11px] text-muted-foreground xl:inline">
                拖动摆位置 · 方向键微调 · R 旋转 · 空格平移
              </span>
              <Button variant="text" size="small" onClick={() => setShortcutOpen(true)}>
                快捷键
              </Button>
            </span>
          </div>

          <div className="min-h-0 flex-1">
            <DesignCanvas
              project={project}
              selectedId={selectedId}
              selectedIds={selectedIds}
              hoverId={hoverId}
              view={view}
              onSelect={setSelectedId}
              onSelectMany={selectElements}
              onHover={setHoverId}
              onMove={move}
              onResize={resize}
              onRotate={rotate}
              onEditText={editText}
              onViewChange={patchView}
              activeVariantId={activeVariantId}
              recenterToken={recenterToken}
            />
          </div>
        </section>

        <aside className="flex min-h-0 flex-col border-l border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-low)] max-md:border-l-0 max-md:border-t">
          {/* M3 primary tabs */}
          <nav className="flex shrink-0 items-stretch border-b border-[var(--md-sys-color-outline-variant)] px-1">
            {TABS.map(item => {
              const active = tab === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTab(item.value)}
                  className={cn(
                    'relative flex flex-1 items-center justify-center gap-1 px-2 py-2.5 text-[11px] font-medium',
                    'transition-colors duration-[var(--md-sys-motion-duration-short)]',
                    active
                      ? 'text-primary'
                      : 'text-muted-foreground hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_var(--md-sys-state-hover-opacity),transparent)]',
                  )}
                >
                  {item.label}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-[var(--md-sys-color-primary)]"
                    />
                  )}
                </button>
              )
            })}
          </nav>

          {/*
            上方信息区：`min-h-0` + `overflow-y-auto` 让 flex 子项真正可滚动；
            `scrollbar-gutter: stable` 预留滚动条槽位，避免出现/消失时布局跳动。
          */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 [scrollbar-gutter:stable]">
            {tab === 'element' && (
              <ElementPanel
                elements={previewElements}
                fields={project.fields}
                selectedId={selectedId}
                selectedIds={selectedIds}
                onSelect={setSelectedId}
                onToggleSelect={toggleElementSelection}
                onUpdate={patchElement}
                onUpdateText={patchTextElement}
                onRemove={removeElement}
                onDuplicate={duplicateElement}
                onMoveLayer={(id, delta) => moveLayer({ id, delta })}
                assets={project.assets ?? []}
                onImportAsset={importAsset}
                onRemoveAsset={removeAsset}
                onEnsureFields={ensureDynamicFields}
                variants={variants}
                activeVariantId={activeVariantId}
                onActiveVariantChange={setActiveVariant}
                variantActions={variantActions}
                part="properties"
              />
            )}
            {tab === 'project' && <GeneratePanel section="project" />}
            {tab === 'field' && <FieldPanel />}
            {tab === 'export' && <GeneratePanel section="export" />}
          </div>

          {/* 下方图层：固定在底部，列表独立滚动 */}
          <div className="flex h-[34%] max-h-[340px] min-h-[150px] shrink-0 flex-col border-t border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-low)]">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 [scrollbar-gutter:stable]">
              <ElementPanel
                elements={previewElements}
                fields={project.fields}
                selectedId={selectedId}
                selectedIds={selectedIds}
                onSelect={setSelectedId}
                onToggleSelect={toggleElementSelection}
                onUpdate={patchElement}
                onUpdateText={patchTextElement}
                onRemove={removeElement}
                onDuplicate={duplicateElement}
                onMoveLayer={(id, delta) => moveLayer({ id, delta })}
                assets={project.assets ?? []}
                onImportAsset={importAsset}
                onRemoveAsset={removeAsset}
                onEnsureFields={ensureDynamicFields}
                variants={variants}
                activeVariantId={activeVariantId}
                onActiveVariantChange={setActiveVariant}
                variantActions={variantActions}
                part="layers"
              />
            </div>
          </div>
        </aside>
      </div>

      {libraryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onMouseDown={() => setLibraryOpen(false)}
        >
          <div
            className="max-h-[82vh] w-full max-w-3xl overflow-y-auto rounded-[var(--md-sys-shape-corner-large)] bg-[var(--md-sys-color-surface)] p-4 shadow-2xl"
            onMouseDown={event => event.stopPropagation()}
          >
            <LibraryPanel onClose={() => setLibraryOpen(false)} />
          </div>
        </div>
      )}

      <NewProjectDialog
        open={newDialogOpen}
        initialWidth={project.width}
        initialHeight={project.height}
        hasContent={project.elements.length > 0}
        onCancel={() => setNewDialogOpen(false)}
        onConfirm={size => {
          setSignSize({
            ...size,
            reset: true,
          })
          setNewDialogOpen(false)
        }}
      />

      <ShortcutHelpDialog
        open={shortcutOpen}
        onClose={() => setShortcutOpen(false)}
      />

      {/* 一次性操作反馈（复制元素 / 粘贴 / 复制为新项目） */}
      {notice !== null && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-40 -translate-x-1/2">
          <p className="rounded-full bg-[var(--md-sys-color-inverse-surface)] px-4 py-2 text-[11px] text-[var(--md-sys-color-inverse-on-surface)] shadow-[var(--md-sys-elevation-level-2)]">
            {notice}
          </p>
        </div>
      )}

      <AiWindow />
    </main>
  )
}

/**
 * 方块变体切换器。
 *
 * 决定画布 / 属性面板此刻编辑的是「基础版式」还是某个变体的覆盖值：
 * - 选「基础」→ 所有写入落到元素本体，生成的 switch 分支不会用到；
 * - 选某个变体 → 写入落到 `variantOverrides[variantId]`，本体不变，
 *   生成时该变体走自己的一套 `TextLineData`。
 *
 * 只有一个变体时调用方不会渲染它（没有选择的意义）。
 */
function VariantSwitcher({
  variants,
  activeId,
  onChange,
}: {
  variants: LayoutVariant[]
  activeId: string | null
  onChange: (id: string | null) => void
}) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="shrink-0 text-[11px] text-muted-foreground">变体</span>
      <span className="flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-[var(--md-sys-shape-corner-full)] bg-[var(--md-sys-color-surface-container-high)] p-0.5">
        <VariantTab
          active={activeId === null}
          title="基础版式：所有变体的默认值"
          onClick={() => onChange(null)}
        >
          基础
        </VariantTab>
        {variants.map(variant => (
          <VariantTab
            key={variant.id}
            active={activeId === variant.id}
            title={`${variant.displayNameZh}（${variant.registryId}）`}
            onClick={() => onChange(variant.id)}
          >
            {variant.displayNameZh}
          </VariantTab>
        ))}
      </span>
    </span>
  )
}

function VariantTab({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-[var(--md-sys-shape-corner-full)] px-2 py-1 text-[11px] leading-none whitespace-nowrap',
        'transition-colors duration-[var(--md-sys-motion-duration-short)]',
        active
          ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

/** 内联的 bit 数值输入（失焦 / 回车才提交，避免输入过程反复重建工程） */
function SizeInput({
  value,
  onCommit,
  label,
}: {
  value: number
  onCommit: (value: number) => void
  label: string
}) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  return (
    <input
      aria-label={label}
      value={draft}
      inputMode="numeric"
      onChange={event => setDraft(event.target.value.replace(/[^0-9]/g, ''))}
      onBlur={() => {
        const next = Number(draft)
        if (Number.isFinite(next) && next > 0) onCommit(next)
        else setDraft(String(value))
      }}
      onKeyDown={event => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
      className="h-7 w-12 rounded-[var(--md-sys-shape-corner-extra-small)] border border-[var(--md-sys-color-outline)] bg-transparent px-1.5 text-center text-[11px] text-foreground md-code transition-colors focus:border-[var(--md-sys-color-primary)] focus:ring-1 focus:ring-[var(--md-sys-color-primary)] focus:outline-none"
    />
  )
}

function formatBlocks(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
}

/** 旋转角度取到 0.1°（避免浮点噪声） */
function roundTenth(value: number): number {
  return Math.round(value * 10) / 10
}
