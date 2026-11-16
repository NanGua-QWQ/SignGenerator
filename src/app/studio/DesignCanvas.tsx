'use client'

import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react'

import {
  ColorInput, NumberInput, SelectInput, Toggle,
} from './controls'
import {
  ReferenceImageControl,
} from './ReferenceImageControl'

import {
  builtinTextureFile, texturePreviewUrl,
} from '@/lib/studio/assets'
import {
  buildTextPreview, colorToCss, elementBox, MC_FONT_HEIGHT, resolvePlaceholders, trafficFontStack,
} from '@/lib/studio/text'
import { applyVariantOverrides, hasVariantOverride } from '@/lib/studio/variant'
import {
  cn,
} from '@/lib/utils'

import type {
  LayoutAsset, LayoutBaseplate, LayoutElement, LayoutField, LayoutLogoElement, LayoutRectElement,
  LayoutReference, LayoutTextElement,
} from '@/lib/studio/layout-model'

/**
 * 2D 版面画布 —— PPT 式交互。
 *
 * 坐标系：单位 bit（1 bit = 1/16 方块），原点在牌面中心，X 向右，Y 向上。
 * 屏幕上按 `zoom` 像素/bit 绘制，1 bit 正好 1 格网。
 *
 * 交互（对齐 PowerPoint）：
 * - 点选 / 框选；拖动主体移动；**8 个手柄缩放**；顶部手柄旋转
 * - 缩放时中心固定、两侧对称；文本等比缩放 scale，色块自由改宽高，贴图等比改 size
 * - 双击进入文字编辑；Esc 取消选择；方向键微调；Delete 删除
 * - 拖动 / 缩放手柄默认 1 bit；按住 Alt 全部变为 0.5 bit；Shift 缩放 = 强制等比 / 旋转 = 15° 步进
 *
 * 完整的快捷键表见 `studio/ShortcutHelpDialog.tsx`，按键分发在 `page.tsx`。
 */

export interface DesignCanvasProps {
  project: {
    width: number
    height: number
    elements: LayoutElement[]
    fields: LayoutField[]
    baseplate: LayoutBaseplate
    assets: LayoutAsset[]
    reference: LayoutReference | null
  }
  selectedId: string | null
  /** 框选出来的多选集合（主选中 = selectedId） */
  selectedIds?: string[]
  hoverId: string | null
  view: {
    zoom: number
    showGrid: boolean
    showAxes: boolean
    maskOutside: boolean
    snap: boolean
    showSafeArea: boolean
    previewValues: Record<string, string>
  }
  onSelect: (id: string | null) => void
  /** 框选多个元素时调用；缺省退化为选中最上面一个 */
  onSelectMany?: (ids: string[]) => void
  onHover: (id: string | null) => void
  onMove: (id: string, x: number, y: number, snap: boolean) => void
  onResize: (request: ResizePayload) => void
  onRotate: (id: string, rotZ: number) => void
  onEditText: (id: string, text: string) => void
  onViewChange: (patch: Partial<DesignCanvasProps['view']>) => void
  /** 正在编辑的方块变体（null = 基础版式）；元素会并入该变体的覆盖后再渲染 */
  activeVariantId?: string | null
  /** 自增即让画布回到中心（快捷键 0 / 工具栏「回到中心」） */
  recenterToken?: number
}

/** 缩放请求（画布算好参数，store 只负责落库） */
export interface ResizePayload {
  id: string
  x: number
  y: number
  scale?: number
  scaleX?: number
  scaleY?: number
  size?: number
  width?: number
  height?: number
  snap: boolean
}

/** 缩放手柄方位 */
type HandleDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const HANDLES: { dir: HandleDir, fx: number, fy: number, cursor: string }[] = [
  { dir: 'nw', fx: 0, fy: 0, cursor: 'nwse-resize' },
  { dir: 'n', fx: 0.5, fy: 0, cursor: 'ns-resize' },
  { dir: 'ne', fx: 1, fy: 0, cursor: 'nesw-resize' },
  { dir: 'e', fx: 1, fy: 0.5, cursor: 'ew-resize' },
  { dir: 'se', fx: 1, fy: 1, cursor: 'nwse-resize' },
  { dir: 's', fx: 0.5, fy: 1, cursor: 'ns-resize' },
  { dir: 'sw', fx: 0, fy: 1, cursor: 'nesw-resize' },
  { dir: 'w', fx: 0, fy: 0.5, cursor: 'ew-resize' },
]

/** 相邻两档缩放的比例 */
export const ZOOM_STEPS = [3, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64]

/** 拖拽会话 */
type DragState
  = | {
    mode: 'move'
    id: string
    startX: number
    startY: number
    originX: number
    originY: number
    /** 多选整体拖动时，各元素的起始坐标 */
    group: { id: string, x: number, y: number }[] | null
  }
    | {
      mode: 'resize'
      id: string
      kind: LayoutElement['kind']
      dir: HandleDir
      /** 开始时元素包围盒（bit，左下原点） */
      startBox: { x: number, y: number, w: number, h: number }
      /** 开始时元素的锚点坐标，缩放期间保持不变 */
      originX: number
      originY: number
      /** 对角固定点（bit） */
      anchorX: number
      anchorY: number
      startScale: number
      startScaleX: number
      startScaleY: number
      startWidth: number
      startHeight: number
      startSize: number
      /** 宽高比（等比时用） */
      aspect: number
    }
    | { mode: 'rotate', id: string, startAngle: number, originZ: number, cx: number, cy: number }
    | { mode: 'pan', startX: number, startY: number, originOffsetX: number, originOffsetY: number }
    | {
      mode: 'marquee'
      startBitX: number
      startBitY: number
      currentBitX: number
      currentBitY: number
      /** 增量框选（Ctrl / Cmd 起手）：结果并入现有选择；没有拖动则切换起手处元素 */
      additive: boolean
      /** 起手时命中的元素（Ctrl 点击用） */
      clickId: string | null
    }

export function DesignCanvas({
  project,
  selectedId,
  selectedIds = [],
  hoverId,
  view,
  onSelect,
  onSelectMany,
  onHover,
  onMove,
  onResize,
  onRotate,
  onEditText,
  onViewChange,
  activeVariantId = null,
  recenterToken = 0,
}: DesignCanvasProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const [pointerBit, setPointerBit] = useState<{ x: number, y: number } | null>(null)
  const [spaceDown, setSpaceDown] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [marquee, setMarquee] = useState<{ x0: number, y0: number, x1: number, y1: number } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [, forceFont] = useState(0)

  const { width, height } = project
  const zoom = view.zoom
  const pxW = width * zoom
  const pxH = height * zoom

  /**
   * 画布渲染用的元素表 = 原始元素 + 当前变体的覆盖。
   *
   * 命中的、拖动的、选中的、显示的全都是这一份，所以「改位置立刻看到变体里的位置」
   * 不会出现「这一处用的是原值」的分叉。id 不变，所有按 id 的查找都不用改。
   */
  const elements = useMemo(
    () => applyVariantOverrides(project.elements, activeVariantId),
    [project.elements, activeVariantId],
  )

  const selected = useMemo(
    () => elements.find(element => element.id === selectedId) ?? null,
    [elements, selectedId],
  )

  /**
   * 画布实际用的占位符取值 = **字段默认值** ← 用户临时预览值（后者优先）。
   *
   * 这样「动态贴图」一摆上来就能解析成真实 PNG：路径里的 `{logo1}` 会被
   * 对应 enum 字段的默认值（`national_logo_1`）填掉，而不是一直显示占位框。
   * 字段还没建（占位符无处可解）时保持 `{}`，由元素面板提示补字段。
   */
  const previewValues = useMemo(() => {
    const defaults: Record<string, string> = {}
    for (const field of project.fields) {
      if (field.defaultValue) defaults[field.key] = field.defaultValue
    }
    return { ...defaults, ...view.previewValues }
  }, [project.fields, view.previewValues])

  // 切换画布尺寸时重新居中
  useEffect(() => {
    setOffset({ x: 0, y: 0 })
  }, [width, height])

  // 快捷键 0 / 工具栏按钮：偏移归零（token 自增即触发）
  useEffect(() => {
    if (!recenterToken) return
    setOffset({ x: 0, y: 0 })
  }, [recenterToken])

  useEffect(() => {
    let disposed = false
    import('@/lib/studio/text').then(({ ensureTrafficFonts }) => {
      ensureTrafficFonts(() => {
        if (!disposed) forceFont(value => value + 1)
      })
    })
    return () => {
      disposed = true
    }
  }, [])

  // 空格平移
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isEditingTarget(event.target)) {
        event.preventDefault()
        setSpaceDown(true)
      }
    }
    const up = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpaceDown(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // Esc 退出文字编辑
  useEffect(() => {
    if (!editingId) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEditingId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editingId])

  /** 屏幕坐标 -> 牌面 bit 坐标 */
  const screenToBit = useCallback((clientX: number, clientY: number) => {
    const node = wrapRef.current
    if (!node) return { x: 0, y: 0 }
    const rect = node.getBoundingClientRect()
    const originX = rect.left + rect.width / 2 + offset.x
    const originY = rect.top + rect.height / 2 + offset.y
    return {
      x: (clientX - originX) / zoom,
      y: -(clientY - originY) / zoom,
    }
  }, [offset.x, offset.y, zoom])

  /** 在元素上做命中测试（从上层往下找） */
  const hitAt = useCallback((x: number, y: number) => {
    return [...elements].reverse().find(element => element.visible
      && hitElement(element, x, y, previewValues)) ?? null
  }, [elements, previewValues])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    // 手柄 / 旋转柄自己处理
    const handleEl = target.closest('[data-handle]')
    if (handleEl) return
    if (target.closest('[data-text-editor]')) return

    const bit = screenToBit(event.clientX, event.clientY)

    // 中键 / 空格 / 右键 → 平移
    if (event.button === 1 || spaceDown) {
      dragRef.current = {
        mode: 'pan',
        startX: event.clientX,
        startY: event.clientY,
        originOffsetX: offset.x,
        originOffsetY: offset.y,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    if (event.button !== 0) return

    const hit = hitAt(bit.x, bit.y)

    /*
     * Ctrl / Cmd 起手：直接进入「增量框选」。
     *
     * 这样即使牌面被一整块底色/贴图铺满（没有空白可下笔），也能按住 Ctrl
     * 从元素上拉框选；松手时如果没拖动，就退化成 Ctrl 点击的加选 / 减选。
     */
    if (event.ctrlKey || event.metaKey) {
      dragRef.current = {
        mode: 'marquee',
        startBitX: bit.x,
        startBitY: bit.y,
        currentBitX: bit.x,
        currentBitY: bit.y,
        additive: true,
        clickId: hit?.id ?? null,
      }
      setMarquee({
        x0: bit.x, y0: bit.y, x1: bit.x, y1: bit.y,
      })
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    if (hit) {
      if (hit.id !== selectedId) onSelect(hit.id)
      if (editingId && editingId !== hit.id) setEditingId(null)
      // 点在已选中的元素上 → 整组一起拖
      const group = selectedIds.length > 1 && selectedIds.includes(hit.id)
        ? elements
            .filter(element => selectedIds.includes(element.id))
            .map(element => ({ id: element.id, x: element.x, y: element.y }))
        : null
      dragRef.current = {
        mode: 'move',
        id: hit.id,
        startX: event.clientX,
        startY: event.clientY,
        originX: hit.x,
        originY: hit.y,
        group,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    // 空白处：开始框选
    onSelect(null)
    setEditingId(null)
    dragRef.current = {
      mode: 'marquee',
      startBitX: bit.x,
      startBitY: bit.y,
      currentBitX: bit.x,
      currentBitY: bit.y,
      additive: false,
      clickId: null,
    }
    setMarquee({ x0: bit.x, y0: bit.y, x1: bit.x, y1: bit.y })
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [editingId, elements, hitAt, offset.x, offset.y, onSelect, screenToBit, selectedId, selectedIds, spaceDown])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const bit = screenToBit(event.clientX, event.clientY)
    setPointerBit({ x: Math.floor(bit.x), y: Math.floor(bit.y) })

    const drag = dragRef.current

    if (!drag) {
      if (spaceDown) return
      const hit = hitAt(bit.x, bit.y)
      onHover(hit?.id ?? null)
      return
    }

    if (drag.mode === 'pan') {
      setOffset({
        x: drag.originOffsetX + (event.clientX - drag.startX),
        y: drag.originOffsetY + (event.clientY - drag.startY),
      })
      return
    }

    if (drag.mode === 'move') {
      const dx = (event.clientX - drag.startX) / zoom
      const dy = -(event.clientY - drag.startY) / zoom
      const deltaX = event.altKey ? Math.round(dx / 0.5) * 0.5 : dx
      const deltaY = event.altKey ? Math.round(dy / 0.5) * 0.5 : dy
      const snap = event.altKey ? false : view.snap
      const targets = drag.group ?? [{ id: drag.id, x: drag.originX, y: drag.originY }]
      for (const target of targets) {
        onMove(target.id, target.x + deltaX, target.y + deltaY, snap)
      }
      return
    }

    if (drag.mode === 'marquee') {
      drag.currentBitX = bit.x
      drag.currentBitY = bit.y
      setMarquee({ x0: drag.startBitX, y0: drag.startBitY, x1: bit.x, y1: bit.y })
      return
    }

    if (drag.mode === 'resize') {
      applyResize(drag, bit.x, bit.y, event.shiftKey, event.altKey, onResize)
      return
    }

    if (drag.mode === 'rotate') {
      const angle = Math.atan2(bit.y - drag.cy, bit.x - drag.cx) * 180 / Math.PI
      const delta = angle - drag.startAngle
      let next = drag.originZ + delta
      if (event.shiftKey) next = Math.round(next / 15) * 15
      // 归一到 (-180, 180]
      next = ((next + 180) % 360 + 360) % 360 - 180
      onRotate(drag.id, Math.round(next * 10) / 10)
      return
    }
  }, [hitAt, onHover, onMove, onResize, onRotate, screenToBit, spaceDown, view.snap, zoom])

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (drag?.mode === 'marquee') {
      const x0 = Math.min(drag.startBitX, drag.currentBitX)
      const x1 = Math.max(drag.startBitX, drag.currentBitX)
      const y0 = Math.min(drag.startBitY, drag.currentBitY)
      const y1 = Math.max(drag.startBitY, drag.currentBitY)
      const dragged = Math.abs(x1 - x0) > 1 || Math.abs(y1 - y0) > 1

      if (!dragged) {
        // 只有 Ctrl 起手且点到了元素 → 当作 Ctrl 点击的加选 / 减选
        const clickId = drag.additive ? drag.clickId : null
        if (clickId) {
          const next = selectedIds.includes(clickId)
            ? selectedIds.filter(id => id !== clickId)
            : [...selectedIds, clickId]
          if (onSelectMany) onSelectMany(next)
          else onSelect(next[0] ?? null)
        }
      }
      else {
        /*
         * 命中规则：完全落进框内，或者元素中心落进框内。
         *
         * 后者让「贴着整块底色/贴图的小元素」也能被框到，同时不会因为
         * 框住一角就把铺满牌面的大色块一起选中（它的中心不在框里）。
         */
        const ids = elements
          .filter(element => {
            if (!element.visible) return false
            const box = elementBox(element, previewValues)
            const fullyInside = box.cx - box.halfW >= x0 && box.cx + box.halfW <= x1
              && box.cy - box.halfH >= y0 && box.cy + box.halfH <= y1
            const centerInside = box.cx >= x0 && box.cx <= x1 && box.cy >= y0 && box.cy <= y1
            return fullyInside || centerInside
          })
          .map(element => element.id)
        const next = drag.additive ? Array.from(new Set([...selectedIds, ...ids])) : ids
        if (next.length > 0) {
          if (onSelectMany) onSelectMany(next)
          else onSelect(next[0])
        }
        else if (!drag.additive) onSelect(null)
      }
    }
    dragRef.current = null
    setMarquee(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [onSelect, onSelectMany, elements, previewValues, selectedIds])

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey) {
      const direction = event.deltaY > 0 ? -1 : 1
      const index = ZOOM_STEPS.findIndex(step => step >= view.zoom)
      const current = index < 0 ? ZOOM_STEPS.length - 1 : index
      const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, current + direction))]
      onViewChange({ zoom: next })
      return
    }
    setOffset(prev => ({
      x: prev.x - event.deltaX,
      y: prev.y - event.deltaY,
    }))
  }, [onViewChange, view.zoom])

  /** 开始缩放 */
  const beginResize = useCallback((
    event: React.PointerEvent<HTMLElement>,
    element: LayoutElement,
    dir: HandleDir,
  ) => {
    event.stopPropagation()
    event.preventDefault()
    const box = elementBox(element, previewValues)
    const x = box.cx - box.halfW
    const y = box.cy - box.halfH
    const w = box.halfW * 2
    const h = box.halfH * 2

    // 对角固定点
    const anchorX = dir.includes('w') ? x + w : x
    const anchorY = dir.includes('s') ? y + h : y

    dragRef.current = {
      mode: 'resize',
      id: element.id,
      kind: element.kind,
      dir,
      startBox: { x, y, w, h },
      originX: element.x,
      originY: element.y,
      anchorX,
      anchorY,
      startScale: element.kind === 'text' ? element.scale : 1,
      startScaleX: element.kind === 'text' ? element.scaleX : 1,
      startScaleY: element.kind === 'text' ? element.scaleY : 1,
      startWidth: element.kind === 'rect' ? element.width : w,
      startHeight: element.kind === 'rect' ? element.height : h,
      startSize: element.kind === 'logo' ? element.size : 1,
      aspect: h > 0 ? w / h : 1,
    }
    wrapRef.current?.setPointerCapture(event.pointerId)
  }, [previewValues])

  /** 开始旋转 */
  const beginRotate = useCallback((
    event: React.PointerEvent<HTMLElement>,
    element: LayoutElement,
  ) => {
    event.stopPropagation()
    event.preventDefault()
    if (element.kind !== 'text') return
    const box = elementBox(element, previewValues)
    const bit = screenToBit(event.clientX, event.clientY)
    dragRef.current = {
      mode: 'rotate',
      id: element.id,
      startAngle: Math.atan2(bit.y - box.cy, bit.x - box.cx) * 180 / Math.PI,
      originZ: element.rotZ,
      cx: box.cx,
      cy: box.cy,
    }
    wrapRef.current?.setPointerCapture(event.pointerId)
  }, [screenToBit, previewValues])

  return (
    <div className="relative flex h-full flex-col">
      <CanvasToolbar
        width={width}
        height={height}
        zoom={zoom}
        view={view}
        pointerBit={pointerBit}
        onViewChange={onViewChange}
        onResetView={() => setOffset({ x: 0, y: 0 })}
      />

      <div
        ref={wrapRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => {
          setPointerBit(null)
          onHover(null)
        }}
        onWheel={handleWheel}
        onDoubleClick={event => {
          const target = event.target as HTMLElement
          if (target.closest('[data-handle]') || target.closest('input, textarea')) return
          const bit = screenToBit(event.clientX, event.clientY)
          const hit = hitAt(bit.x, bit.y)
          if (hit && hit.kind === 'text') {
            onSelect(hit.id)
            setEditingId(hit.id)
          }
        }}
        className={cn(
          'relative flex-1 touch-none overflow-hidden bg-[var(--md-sys-color-surface-container-lowest)] select-none',
          spaceDown ? 'cursor-grab' : 'cursor-default',
        )}
      >
        <CanvasGridBackground
          width={width}
          height={height}
          zoom={zoom}
          offset={offset}
          view={view}
          baseplate={project.baseplate}
        />

        {/*
          参考图（描图底图）—— 刻意排在网格**之后**、元素层**之前**：
          这样它压在网格上方、又被自己的元素盖住，正好当描图纸用。
          `pointer-events-none` 保证不抢画布的拖拽/框选。
        */}
        {project.reference?.visible && project.reference.dataUrl && (
          <CanvasReferenceImage
            reference={project.reference}
            width={width}
            height={height}
            zoom={zoom}
            offset={offset}
          />
        )}

        {/* 元素层 —— 与选中框/框选框共用同一个已平移的容器，保证原点一致 */}
        <div
          className="absolute top-1/2 left-1/2"
          style={{
            width: pxW,
            height: pxH,
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
          }}
        >
          {elements.map((element, index) => element.visible && (
            <ElementView
              key={element.id}
              element={element}
              index={index}
              zoom={zoom}
              width={width}
              height={height}
              selected={element.id === selectedId || selectedIds.includes(element.id)}
              hovered={element.id === hoverId}
              editing={element.id === editingId}
              previewValues={previewValues}
              assets={project.assets}
              variantMarked={!!activeVariantId && hasVariantOverride(element, activeVariantId)}
            />
          ))}

          {/* 框选矩形（同容器，坐标直接用 bit 换算） */}
          {marquee && (
            <MarqueeRect
              marquee={marquee}
              width={width}
              height={height}
              zoom={zoom}
            />
          )}

          {/* 选中框 + 手柄（同容器，永远画在元素之上） */}
          {selected && (
            <SelectionOverlay
              element={selected}
              zoom={zoom}
              width={width}
              height={height}
              previewValues={previewValues}
              editing={editingId === selected.id}
              onBeginResize={beginResize}
              onBeginRotate={beginRotate}
              onStartEdit={() => setEditingId(selected.id)}
              onCommitText={text => {
                onEditText(selected.id, text)
                setEditingId(null)
              }}
            />
          )}
        </div>

        {elements.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="rounded-full bg-[var(--md-sys-color-surface-container-high)] px-4 py-2 text-[11px] text-muted-foreground shadow-[var(--md-sys-elevation-level-1)]">
              用画布上方操作条的「+ 文本 / + 贴图 / + 色块」添加内容，然后拖拽摆放
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== 缩放算法 ====================

/**
 * 缩放算法：始终以元素中心为不动点，左右 / 上下两侧同时缩放。
 *
 * - 普通拖拽：每侧 1 bit 步进（左右 / 上下保持原中心轴）；
 * - 按住 Alt：每侧 0.5 bit 步进（精细缩放）；
 * - 文本：等比改 `scale`（`scaleX/scaleY` 由角手柄 Shift 或边手柄控制）；
 * - 贴图：等比改 `size`；
 * - 色块：自由改 `width` / `height`。
 */
function applyResize(
  drag: Extract<DragState, { mode: 'resize' }>,
  bitX: number,
  bitY: number,
  shiftKey: boolean,
  altKey: boolean,
  onResize: (payload: ResizePayload) => void,
) {
  const { startBox, dir, aspect } = drag
  const horizontal = dir.includes('e') || dir.includes('w')
  const vertical = dir.includes('n') || dir.includes('s')
  // 每侧步进：普通 1 bit，Alt 0.5 bit
  const step = altKey ? 0.5 : 1
  const quantize = (delta: number) => Math.round(delta / step) * step

  let newW = startBox.w
  let newH = startBox.h

  // 每侧的变化量按步进取整，中心轴不动
  if (dir.includes('e')) {
    newW = startBox.w + quantize(bitX - (startBox.x + startBox.w)) * 2
  }
  else if (dir.includes('w')) {
    newW = startBox.w + quantize(startBox.x - bitX) * 2
  }
  if (dir.includes('n')) {
    newH = startBox.h + quantize(bitY - (startBox.y + startBox.h)) * 2
  }
  else if (dir.includes('s')) {
    newH = startBox.h + quantize(startBox.y - bitY) * 2
  }

  newW = Math.max(0.5, newW)
  newH = Math.max(0.5, newH)

  // 角手柄：默认等比（文本/贴图天然等比）；Shift 反向切换为自由
  // 边手柄：只影响一个方向
  const isCorner = horizontal && vertical
  const forceAspect = isCorner ? !shiftKey : false
  if (forceAspect) {
    const byW = newW / aspect
    const byH = newH * aspect
    if (Math.abs(byW - newH) < Math.abs(byH - newW)) newH = byW
    else newW = byH
  }

  // 中心轴不动：保留元素原始锚点，只改尺寸
  const ratioW = startBox.w > 0 ? newW / startBox.w : 1
  const ratioH = startBox.h > 0 ? newH / startBox.h : 1

  const payload: ResizePayload = {
    id: drag.id,
    x: drag.originX,
    y: drag.originY,
    snap: false,
  }

  if (drag.kind === 'rect') {
    payload.width = drag.startWidth * ratioW
    payload.height = drag.startHeight * ratioH
  }
  else if (drag.kind === 'logo') {
    payload.size = drag.startSize * ratioW
  }
  else {
    // 文本：角手柄等比 → 改 scale；边手柄 → 改 scaleX / scaleY
    if (forceAspect || isCorner) {
      payload.scale = drag.startScale * ratioW
    }
    if (!isCorner && horizontal) {
      payload.scaleX = drag.startScaleX * ratioW
    }
    if (!isCorner && vertical) {
      payload.scaleY = drag.startScaleY * ratioH
    }
    if (isCorner && shiftKey) {
      // Shift + 角 = 自由非等比
      payload.scaleX = drag.startScaleX * ratioW
      payload.scaleY = drag.startScaleY * ratioH
    }
  }

  onResize(payload)
}

/** 统一命中测试：直接复用 elementBox（已含 scaleX/scaleY 与占位符） */
function hitElement(
  element: LayoutElement,
  x: number,
  y: number,
  previewValues: Record<string, string>,
): boolean {
  const box = elementBox(element, previewValues)
  return Math.abs(x - box.cx) <= box.halfW && Math.abs(y - box.cy) <= box.halfH
}

// ==================== 工具条 ====================

function CanvasToolbar({
  width,
  height,
  zoom,
  view,
  pointerBit,
  onViewChange,
  onResetView,
}: {
  width: number
  height: number
  zoom: number
  view: DesignCanvasProps['view']
  pointerBit: { x: number, y: number } | null
  onViewChange: (patch: Partial<DesignCanvasProps['view']>) => void
  onResetView: () => void
}) {
  const stepZoom = (direction: number) => {
    const index = ZOOM_STEPS.findIndex(step => step >= view.zoom)
    const current = index < 0 ? ZOOM_STEPS.length - 1 : index
    onViewChange({ zoom: ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, current + direction))] })
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] px-3 py-2">
      <span className="rounded-full bg-[var(--md-sys-color-surface-container-highest)] px-2.5 py-1 text-[11px] leading-none text-foreground md-code">
        {width}
        {' × '}
        {height}
        {' bit'}
      </span>
      <span className="text-[11px] text-muted-foreground md-code">
        {formatBlocks(width / 16)}
        {' × '}
        {formatBlocks(height / 16)}
        {' 方块'}
      </span>

      <span className="mx-1 h-4 w-px bg-[var(--md-sys-color-outline-variant)]" />

      <button type="button" title="缩小" onClick={() => stepZoom(-1)} className="md-icon-button size-7">
        <svg viewBox="0 0 24 24" className="size-4 fill-current"><path d="M19 13H5v-2h14v2z" /></svg>
      </button>
      <span className="w-10 text-center text-[11px] text-muted-foreground md-code">
        {Math.round(zoom * 100 / 16)}
        %
      </span>
      <button type="button" title="放大" onClick={() => stepZoom(1)} className="md-icon-button size-7">
        <svg viewBox="0 0 24 24" className="size-4 fill-current"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
      </button>
      <button type="button" title="复位视图" onClick={onResetView} className="md-icon-button size-7">
        <svg viewBox="0 0 24 24" className="size-4 fill-current"><path d="M12 5V1L7 6l5 5V7c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6H4c0 4.4 3.6 8 8 8s8-3.6 8-8-3.6-8-8-8z" /></svg>
      </button>

      <span className="mx-1 h-4 w-px bg-[var(--md-sys-color-outline-variant)]" />

      {([
        ['showGrid', '网格'],
        ['showAxes', '中心轴'],
        ['snap', '吸附'],
        ['maskOutside', '压暗牌外'],
        ['showSafeArea', '安全区'],
      ] as const).map(([key, label]) => (
        <label key={key} className="flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground select-none">
          <input
            type="checkbox"
            checked={view[key]}
            onChange={event => onViewChange({ [key]: event.target.checked })}
            className="accent-primary size-3.5"
          />
          {label}
        </label>
      ))}

      <span className="mx-1 h-4 w-px bg-[var(--md-sys-color-outline-variant)]" />

      {/* 参考图：铺在网格上方、元素下方的半透明底图（组件自带 store 连接） */}
      <ReferenceImageControl />

      <span className="ml-auto text-[11px] text-muted-foreground md-code">
        {pointerBit ? `x ${pointerBit.x}  y ${pointerBit.y}` : '空白拖拽框选 · Ctrl 拖拽追加框选 · Ctrl 点击加减选'}
      </span>
    </div>
  )
}

// ==================== 选中框 / 手柄 ====================

function SelectionOverlay({
  element,
  zoom,
  width,
  height,
  previewValues,
  editing,
  onBeginResize,
  onBeginRotate,
  onStartEdit,
  onCommitText,
}: {
  element: LayoutElement
  zoom: number
  width: number
  height: number
  previewValues: Record<string, string>
  editing: boolean
  onBeginResize: (event: React.PointerEvent<HTMLElement>, element: LayoutElement, dir: HandleDir) => void
  onBeginRotate: (event: React.PointerEvent<HTMLElement>, element: LayoutElement) => void
  onStartEdit: () => void
  onCommitText: (text: string) => void
}) {
  const box = elementBox(element, previewValues)
  // 与 ElementView 同一坐标系（bit(0,0) = 牌面中心）
  const left = (width / 2 + box.cx - box.halfW) * zoom
  const top = (height / 2 - (box.cy + box.halfH)) * zoom
  const w = box.halfW * 2 * zoom
  const h = box.halfH * 2 * zoom

  // 颜色块不提供缩放（颜色块大小由 w/h 决定，但这里统一允许）
  return (
    <div
      className="absolute"
      style={{
        left,
        top,
        width: Math.max(2, w),
        height: Math.max(2, h),
        zIndex: 20,
      }}
    >
      {/* 旋转柄 */}
      {element.kind === 'text' && (
        <>
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2"
            style={{ top: -32, height: 32, width: 1, background: 'var(--md-sys-color-primary)' }}
          />
          <button
            type="button"
            data-handle="rotate"
            title="拖动旋转（Shift 15° 步进）"
            onPointerDown={event => onBeginRotate(event, element)}
            className="group absolute left-1/2 grid size-7 -translate-x-1/2 cursor-grab place-items-center active:cursor-grabbing"
            style={{ top: -36 }}
          >
            <span className="pointer-events-none size-3.5 rounded-full border-2 border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface)] transition-transform duration-[var(--md-sys-motion-duration-short)] group-hover:scale-125 group-hover:bg-[var(--md-sys-color-primary)]" />
          </button>
        </>
      )}

      {/* 8 个缩放手柄（外层是放大后的热区，内层是可见方块） */}
      {HANDLES.map(handle => (
        <button
          key={handle.dir}
          type="button"
          data-handle={handle.dir}
          title="拖动缩放"
          onPointerDown={event => onBeginResize(event, element, handle.dir)}
          onDoubleClick={event => {
            event.stopPropagation()
            onStartEdit()
          }}
          className="group absolute grid size-6 place-items-center"
          style={{
            left: `${handle.fx * 100}%`,
            top: `${handle.fy * 100}%`,
            transform: 'translate(-50%, -50%)',
            cursor: handle.cursor,
          }}
        >
          <span className="pointer-events-none size-3 rounded-[2px] border-2 border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface)] transition-transform duration-[var(--md-sys-motion-duration-short)] group-hover:scale-125 group-hover:bg-[var(--md-sys-color-primary)]" />
        </button>
      ))}

      {/* 元素框 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          border: `${editing ? 1 : 2}px solid var(--md-sys-color-primary)`,
          borderStyle: editing ? 'dashed' : 'solid',
        }}
      />

      {editing && element.kind === 'text' && (
        <TextQuickEditor
          element={element}
          zoom={zoom}
          onCommit={onCommitText}
        />
      )}
    </div>
  )
}

/** 双击后的就地文字编辑（回车 / 失焦提交，Esc 放弃） */
function TextQuickEditor({
  element,
  zoom,
  onCommit,
}: {
  element: LayoutTextElement
  zoom: number
  onCommit: (text: string) => void
}) {
  const ref = useRef<HTMLInputElement | null>(null)
  const [draft, setDraft] = useState(element.text)
  const cancelledRef = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    node.focus()
    node.select()
  }, [])

  return (
    <input
      ref={ref}
      value={draft}
      onChange={event => setDraft(event.target.value)}
      onBlur={() => {
        if (cancelledRef.current) return
        onCommit(draft)
      }}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          cancelledRef.current = true
          onCommit(element.text)
        }
        event.stopPropagation()
      }}
      onPointerDown={event => event.stopPropagation()}
      className="absolute inset-x-0 top-full mt-1.5 h-7 rounded-[var(--md-sys-shape-corner-extra-small)] border border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container-highest)] px-1.5 text-[11px] text-foreground shadow-[var(--md-sys-elevation-level-2)] outline-none"
      style={{ minWidth: Math.max(90, 6 * zoom) }}
    />
  )
}

// ==================== 框选 ====================

function MarqueeRect({
  marquee,
  width,
  height,
  zoom,
}: {
  marquee: { x0: number, y0: number, x1: number, y1: number }
  width: number
  height: number
  zoom: number
}) {
  const minX = Math.min(marquee.x0, marquee.x1)
  const maxX = Math.max(marquee.x0, marquee.x1)
  const minY = Math.min(marquee.y0, marquee.y1)
  const maxY = Math.max(marquee.y0, marquee.y1)
  // 与 ElementView 同一坐标系：bit(0,0) = 牌面中心
  const left = (width / 2 + minX) * zoom
  const top = (height / 2 - maxY) * zoom
  return (
    <div
      className="pointer-events-none absolute border border-[var(--md-sys-color-primary)] bg-[color-mix(in_srgb,var(--md-sys-color-primary)_12%,transparent)]"
      style={{
        left,
        top,
        width: (maxX - minX) * zoom,
        height: (maxY - minY) * zoom,
        zIndex: 30,
      }}
    />
  )
}

// ==================== 网格 / 牌面 ====================

function CanvasGridBackground({
  width,
  height,
  zoom,
  offset,
  view,
  baseplate,
}: {
  width: number
  height: number
  zoom: number
  offset: { x: number, y: number }
  view: DesignCanvasProps['view']
  baseplate: LayoutBaseplate
}) {
  const pxW = width * zoom
  const pxH = height * zoom
  const minor = Math.max(1, zoom)

  const grid = useMemo(() => {
    const lines: React.ReactNode[] = []
    if (!view.showGrid) return lines
    for (let x = 0; x <= width; x++) {
      const isMajor = x % 8 === 0
      if (!isMajor && zoom < 6) continue
      lines.push(
        <line
          key={`v${x}`}
          x1={x * zoom}
          y1={0}
          x2={x * zoom}
          y2={pxH}
          stroke={isMajor ? 'var(--md-sys-color-outline)' : 'var(--sign-preview-grid)'}
          strokeWidth={isMajor ? 1 : 0.5}
          opacity={isMajor ? 0.7 : 1}
        />,
      )
    }
    for (let y = 0; y <= height; y++) {
      const isMajor = y % 8 === 0
      if (!isMajor && zoom < 6) continue
      lines.push(
        <line
          key={`h${y}`}
          x1={0}
          y1={y * zoom}
          x2={pxW}
          y2={y * zoom}
          stroke={isMajor ? 'var(--md-sys-color-outline)' : 'var(--sign-preview-grid)'}
          strokeWidth={isMajor ? 1 : 0.5}
          opacity={isMajor ? 0.7 : 1}
        />,
      )
    }
    return lines
  }, [width, height, zoom, pxW, pxH, view.showGrid])

  const overlayStyle: React.CSSProperties = {
    width: pxW,
    height: pxH,
    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
  }

  return (
    <>
      {view.maskOutside && (
        <div
          className="pointer-events-none absolute top-1/2 left-1/2"
          style={{
            ...overlayStyle,
            boxShadow: '0 0 0 100vmax color-mix(in srgb, var(--md-sys-color-scrim) 12%, transparent)',
          }}
        />
      )}

      <svg
        className="pointer-events-none absolute top-1/2 left-1/2 overflow-visible"
        style={overlayStyle}
        viewBox={`0 0 ${pxW} ${pxH}`}
      >
        <defs>
          {/* 无底色时的棋盘格，表示「透明」 */}
          <pattern id="baseplate-empty" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="var(--md-sys-color-surface-container)" />
            <rect width="6" height="6" fill="var(--md-sys-color-surface-container-high)" />
            <rect x="6" y="6" width="6" height="6" fill="var(--md-sys-color-surface-container-high)" />
          </pattern>
        </defs>
        {/* 道路等级底色 —— 只用于画布预览，不参与代码生成 */}
        <rect
          x={0}
          y={0}
          width={pxW}
          height={pxH}
          fill={baseplate.visible ? colorToCss(baseplate.color) : 'url(#baseplate-empty)'}
          stroke="var(--md-sys-color-outline)"
          strokeWidth={Math.max(1.5, minor / 4)}
        />
        {grid}
      </svg>

      {view.showAxes && (
        <svg
          className="pointer-events-none absolute top-1/2 left-1/2 overflow-visible"
          style={overlayStyle}
        >
          <line
            x1={0}
            y1={pxH / 2}
            x2={pxW}
            y2={pxH / 2}
            stroke="var(--md-sys-color-primary)"
            strokeWidth={1}
            strokeDasharray="6 4"
            opacity={0.5}
          />
          <line
            x1={pxW / 2}
            y1={0}
            x2={pxW / 2}
            y2={pxH}
            stroke="var(--md-sys-color-primary)"
            strokeWidth={1}
            strokeDasharray="6 4"
            opacity={0.5}
          />
          <circle cx={pxW / 2} cy={pxH / 2} r={2.5} fill="var(--md-sys-color-primary)" />
        </svg>
      )}

      {view.showSafeArea && (
        <svg
          className="pointer-events-none absolute top-1/2 left-1/2 overflow-visible"
          style={overlayStyle}
        >
          <rect
            x={zoom}
            y={zoom}
            width={Math.max(0, pxW - zoom * 2)}
            height={Math.max(0, pxH - zoom * 2)}
            fill="none"
            stroke="var(--md-sys-color-tertiary)"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.8}
          />
        </svg>
      )}
    </>
  )
}

// ==================== 参考图 ====================

/**
 * 参考图图层 —— 铺在牌面范围内的一张半透明底图。
 *
 * 与网格/元素层共用同一套「牌面中心对齐」的容器写法
 * （`translate(calc(-50% + offset))`），所以缩放/平移时始终贴合牌面。
 * 超出牌面的部分被 `overflow-hidden` 裁掉。
 */
function CanvasReferenceImage({
  reference,
  width,
  height,
  zoom,
  offset,
}: {
  reference: LayoutReference
  width: number
  height: number
  zoom: number
  offset: { x: number, y: number }
}) {
  return (
    <div
      className="pointer-events-none absolute top-1/2 left-1/2 overflow-hidden"
      style={{
        width: width * zoom,
        height: height * zoom,
        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
        opacity: Math.min(1, Math.max(0, reference.opacity)),
      }}
    >
      <img
        src={reference.dataUrl}
        alt={reference.name || '参考图'}
        draggable={false}
        className="size-full"
        style={{ objectFit: reference.fit === 'stretch' ? 'fill' : 'contain' }}
      />
    </div>
  )
}

// ==================== 元素渲染 ====================

function ElementView({
  element,
  index,
  zoom,
  width,
  height,
  selected,
  hovered,
  editing,
  previewValues,
  assets,
  variantMarked = false,
}: {
  element: LayoutElement
  index: number
  zoom: number
  width: number
  height: number
  selected: boolean
  hovered: boolean
  editing: boolean
  previewValues: Record<string, string>
  assets: LayoutAsset[]
  /** 该元素在当前变体下有覆盖：用虚线描边标出来，免得“以为改的是全局” */
  variantMarked?: boolean
}) {
  const box = elementBox(element, previewValues)
  // bit(0,0) = 牌面中心；容器是 pxW×pxH 且中心对齐到牌面中心，
  // 因此容器内的像素坐标要加上半宽/半高。
  const left = (width / 2 + box.cx - box.halfW) * zoom
  const top = (height / 2 - (box.cy + box.halfH)) * zoom
  const w = box.halfW * 2 * zoom
  const h = box.halfH * 2 * zoom

  // 文本与贴图都用行的 rotZ（绕 Z 轴旋转，即牌面内旋转），画布用 CSS rotate 表现
  const rotation = (element.kind === 'text' || element.kind === 'logo') && element.rotZ ? element.rotZ : 0
  const transform = rotation ? `rotate(${-rotation}deg)` : undefined

  return (
    <div
      className={cn(
        'absolute',
        editing && 'opacity-0',
        // 变体覆盖标记（只用于未被选中的元素，选中框会自己画边框）
        variantMarked && !selected && 'outline-1 -outline-offset-1 outline-dashed outline-primary/50',
      )}
      style={{
        left,
        top,
        width: Math.max(1, w),
        height: Math.max(1, h),
        transform,
        transformOrigin: 'center',
        zIndex: selected ? 10 : index,
      }}
    >
      <ElementContent
        element={element}
        previewValues={previewValues}
        zoom={zoom}
        assets={assets}
      />

      {hovered && !selected && (
        <div className="pointer-events-none absolute -inset-[2px] border border-[var(--md-sys-color-secondary)]" />
      )}
    </div>
  )
}

/** 元素内部实际绘制内容 */
function ElementContent({
  element,
  previewValues,
  zoom,
  assets,
}: {
  element: LayoutElement
  previewValues: Record<string, string>
  zoom: number
  assets: LayoutAsset[]
}) {
  if (element.kind === 'rect') {
    return (
      <div
        className="absolute inset-0"
        style={{ backgroundColor: colorToCss(element.color) }}
      />
    )
  }

  if (element.kind === 'logo') {
    const { text } = resolvePlaceholders(element.path, previewValues)
    // 1. 用户导入的真实图片
    const asset = assets?.find(item => item.texturePath === text)
    if (asset) {
      return (
        <img
          src={asset.dataUrl}
          alt={asset.name}
          draggable={false}
          className="absolute inset-0 size-full object-fill [image-rendering:pixelated]"
        />
      )
    }
    // 2. 内置贴图：直接显示模组素材的真实 PNG
    const url = texturePreviewUrl(text)
    if (url) {
      return (
        <img
          src={url}
          alt={builtinTextureFile(text) ?? ''}
          draggable={false}
          className="absolute inset-0 size-full object-fill [image-rendering:pixelated]"
        />
      )
    }
    // 3. 动态路径（含 {占位符}）或本站没有的贴图：画占位图
    const file = text.split('/').pop() ?? text
    const dynamic = text.includes('{')
    return (
      <div className="absolute inset-0 grid place-items-center gap-0.5 overflow-hidden rounded-[2px] border border-dashed border-[var(--md-sys-color-outline)] bg-[color-mix(in_srgb,var(--md-sys-color-surface-container-highest)_70%,transparent)] p-0.5 text-center">
        <span className="text-[9px] leading-tight font-medium break-all text-[var(--md-sys-color-on-surface-variant)]">
          {dynamic ? file : '贴图缺失'}
        </span>
      </div>
    )
  }

  const display = resolvePlaceholders(element.text, previewValues).text
  const preview = buildTextPreview(element, display)
  const box = elementBox(element, previewValues)
  /** px / 文本像素（纵向，已含 scaleY） */
  const unit = preview.unit * zoom
  /**
   * 描边 / 辉光的参考字号：一个行高 = `MC_FONT_HEIGHT`(=9) 个文本像素。
   * （字形本身的实际 em 由 `glyph.em` 给出，拉丁是 10.5 个文本像素、
   * 中文是 7.54 —— 那是字体文件里 ascent/descent 决定的，不能拿来当行高用。）
   */
  const refEm = Math.max(1, MC_FONT_HEIGHT * unit)
  const color = colorToCss(element.color)

  /**
   * 包围盒在 bit 空间的左上角。SVG 是包围盒的 `100% × 100%`，
   * 所以字形相对包围盒左上角的 bit 偏移直接乘 zoom 就是像素位置。
   */
  const boxLeftBit = box.cx - box.halfW
  const boxTopBit = box.cy + box.halfH
  /**
   * 横向缩放的**支点**必须是元素原点 `element.x`（= `TextLineData` 的对齐原点），
   * 而不是包围盒左边缘：`scaleX` 在游戏里是挂在这个原点上的 pose 缩放，
   * 连对齐偏移 `renderX` 一起被拉。绕包围盒左边缘缩放会让整行整体平移。
   */
  const anchorPx = (element.x - boxLeftBit) * zoom
  const inkWidth = Math.max(1, refEm / 8)
  /** 该行选中的交通字体（a/b/c）—— 画布预览就用模组同款 TTF */
  const fontStack = trafficFontStack(element.abcFont)

  return (
    <div className="absolute inset-0">
      <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
        <g
          fontFamily={fontStack}
          fontWeight={element.bold ? 700 : 400}
          fontStyle={element.italic ? 'italic' : 'normal'}
          style={{
            paintOrder: element.outline ? 'stroke' : undefined,
            stroke: element.outline ? colorToCss(element.outlineColor) : undefined,
            strokeWidth: element.outline ? inkWidth : undefined,
            filter: element.glowing
              ? `drop-shadow(0 0 ${Math.max(2, refEm / 4)}px ${color})`
              : element.shadow
                ? 'drop-shadow(1px 1px 0 rgba(0,0,0,0.55))'
                : undefined,
          }}
        >
          {/*
           * 横向非等比缩放统一在这一层做：`scale(squeeze, 1)` 绕 `anchorPx` 缩放，
           * 于是 `x` 可以只按「未缩放的文本像素」算，不用逐字乘 scaleX。
           */}
          <g transform={`translate(${anchorPx} 0) scale(${preview.squeeze} 1)`}>
            {preview.glyphs.map((glyph, index) => (
              <text
                key={`${index}-${glyph.char}`}
                /* 左边缘：相对元素原点的未缩放偏移（scaleX 交给外层） */
                x={(glyph.left - element.x) * zoom}
                /* 基线：`TextLineData` 的 y 轴向上，SVG 向下 */
                y={(boxTopBit - glyph.baseline) * zoom}
                fontSize={glyph.em * zoom}
                fill={color}
                textDecoration={element.underline ? 'underline' : undefined}
              >
                {glyph.char === ' ' ? '\u00a0' : glyph.char}
              </text>
            ))}
          </g>
        </g>
      </svg>
      {display.trim() === '' && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--md-sys-color-outline)]">
          （空文本）
        </span>
      )}
    </div>
  )
}

// ==================== 导出的小工具 ====================

export function SizeFields() {
  return null
}

export type { LayoutLogoElement, LayoutRectElement, LayoutTextElement }

/** 判断事件目标是否是输入类元素（空格键不应触发平移） */
function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

function formatBlocks(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
}

export function BitNumberField({
  value,
  onChange,
  label,
  min,
  max,
  step,
}: {
  value: number
  onChange: (value: number) => void
  label: string
  min?: number
  max?: number
  step?: number
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <NumberInput value={value} onChange={onChange} min={min} max={max} step={step} suffix="bit" />
    </div>
  )
}

export function ColorField({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  return <ColorInput value={value} onChange={onChange} />
}

export { SelectInput, Toggle }
