'use client'

import {
  useMemo,
} from 'react'

import {
  ActionButton, Chip, ColorInput, EmptyHint, Field, NumberInput, Panel, SelectInput, TextInput, Toggle,
} from './controls'
import {
  SpriteLibrary,
} from './SpriteLibrary'

import {
  ALIGNMENT_OPTIONS,
  elementSummary,
} from '@/lib/studio/project'
import {
  ABC_FONT_OPTIONS, FIELD_OPTION_PRESETS, SIGN_TEXTURE_PREFIX,
} from '@/lib/studio/sprites'
import {
  extractPlaceholderKeys,
} from '@/lib/studio/text'
import {
  findDynamicTexture, modFieldName, optionGroupFor,
} from '@/lib/studio/dynamic-textures'
import {
  cn,
} from '@/lib/utils'
import {
  LINE_FONT_OPTIONS,
} from '@/lib/studio/layout-model'

import type {
  LayoutAsset, LayoutElement, LayoutElementKind, LayoutField, LayoutLogoElement,
  LayoutRectElement, LayoutTextElement, LayoutVariant,
} from '@/lib/studio/layout-model'
import {
  hasAnyVariantOverride, hasVariantOverride, overriddenKeys,
} from '@/lib/studio/variant'

/**
 * 元素面板：左侧是元素列表，右侧（或下方）是选中元素的属性。
 *
 * 元素类型与生成的 Java 一一对应：
 * - `text`  → `SignTextLinesHelper.centered / centeredWithZ / left / right`
 * - `logo`  → `SignTextLinesHelper.logo(path, x, y, size)`
 * - `rect`  → `new TextLineData("-rect w h")`
 */

/**
 * 变体覆盖的写操作。面板只负责发起，真正的落库 / 历史 / 撤销在 store 里。
 *
 * 传对象而不是四个独立 props：这些操作永远一起用，拆开只会让调用处更长。
 */
export interface VariantActions {
  /** 清空该元素在此变体下的全部覆盖，完全退回基础值 */
  disable: (elementId: string, variantId: string) => void
  /** 撤销单个字段的覆盖 */
  clearField: (elementId: string, variantId: string, key: string) => void
}

export interface ElementPanelProps {
  elements: LayoutElement[]
  fields: LayoutField[]
  selectedId: string | null
  /** 框选出的多选集合 */
  selectedIds?: string[]
  onSelect: (id: string | null) => void
  /** Ctrl / Cmd 点击图层行时增删选择 */
  onToggleSelect?: (id: string) => void
  onUpdate: (id: string, patch: Partial<LayoutElement>) => void
  onUpdateText: (id: string, patch: Partial<LayoutTextElement>) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onMoveLayer: (id: string, delta: number) => void
  /** 已导入的图片资源 */
  assets: LayoutAsset[]
  /** 导入本地图片（返回后由外层落库） */
  onImportAsset: (file: File) => Promise<void>
  onRemoveAsset: (id: string) => void
  /**
   * 给「动态贴图」路径里缺失的占位符补 enum 字段。
   *
   * 贴图路径里带 `{logo1}` 这类占位符时，模组需要一个同名字段来决定
   * 贴哪张图；选项组来自 `lib/studio/dynamic-textures.ts`（逐条抄模组实体）。
   */
  onEnsureFields: (path: string) => void
  /** 工程里声明的方块变体 */
  variants: LayoutVariant[]
  /** 当前正在编辑的变体；`null` = 基础版式 */
  activeVariantId: string | null
  /** 切到基础版式或某个变体 */
  onActiveVariantChange: (id: string | null) => void
  /** 变体覆盖的写操作 */
  variantActions: VariantActions
  /** 只渲染图层列表 / 只渲染选中属性；缺省两块都渲染 */
  part?: 'all' | 'layers' | 'properties'
}

export function ElementPanel({
  elements,
  fields,
  selectedId,
  selectedIds = [],
  onSelect,
  onToggleSelect,
  onUpdate,
  onUpdateText,
  onRemove,
  onDuplicate,
  onMoveLayer,
  assets,
  onImportAsset,
  onRemoveAsset,
  onEnsureFields,
  variants,
  activeVariantId,
  onActiveVariantChange,
  variantActions,
  part = 'all',
}: ElementPanelProps) {
  const selected = elements.find(element => element.id === selectedId) ?? null

  return (
    // ⚠️ 不要给根节点加 `h-full`：父级是 `overflow-y-auto` 的滚动容器，
    // 子节点高度被钉成 100% 后内容只会「溢出可见」，父级 scrollHeight 不增长，
    // 于是屏幕不够高时右侧面板**不会出现滚动条**。让它按内容自然撑高即可。
    <div className="flex flex-col gap-2">
      {part !== 'properties' && (
      <Panel
        title={part === 'layers' ? '图层' : '版面元素'}
        hint={`${elements.length} 个 · 列表顺序即 lines.add 顺序`}
      >
        {elements.length === 0
          ? <EmptyHint>还没有元素。点画布上方操作条的「+ 文本 / + 贴图 / + 色块」加一行，然后在画布上拖动定位。</EmptyHint>
          : (
              <ul className="max-h-64 space-y-1 overflow-auto">
                {elements.map((element, index) => {
                  const active = element.id === selectedId || selectedIds.includes(element.id)
                  return (
                    <li key={element.id}>
                      <div
                        className={cn(
                          'group flex items-center gap-2 rounded-[var(--md-sys-shape-corner-extra-small)] px-2 py-1.5',
                          'transition-colors duration-[var(--md-sys-motion-duration-short)]',
                          active
                            ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]'
                            : 'text-foreground hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_var(--md-sys-state-hover-opacity),transparent)]',
                        )}
                      >
                        <button
                          type="button"
                          onClick={event => {
                            if ((event.ctrlKey || event.metaKey) && onToggleSelect) onToggleSelect(element.id)
                            else onSelect(element.id)
                          }}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <KindGlyph kind={element.kind} active={active} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1">
                              <span className="truncate text-xs leading-4">{element.name}</span>
                              {/* 有任一变体覆盖时点一颗小圆点，列表里一眼能看出哪些元素被变体改过 */}
                              {hasAnyVariantOverride(element) && (
                                <span
                                  title="该元素在部分方块变体下有独立参数"
                                  className="size-1.5 shrink-0 rounded-full bg-[var(--md-sys-color-primary)]"
                                />
                              )}
                            </span>
                            <span
                              className={cn(
                                'block truncate text-[10px] leading-4 md-code',
                                active ? 'opacity-80' : 'text-muted-foreground',
                              )}
                            >
                              {elementSummary(element)}
                              {' · '}
                              {element.x}
                              {', '}
                              {element.y}
                            </span>
                          </span>
                        </button>

                        <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                          <IconButton
                            title="下移一层"
                            disabled={index === elements.length - 1}
                            onClick={() => onMoveLayer(element.id, 1)}
                          >
                            <path d="M12 16l-6-6h12z" />
                          </IconButton>
                          <IconButton
                            title="上移一层"
                            disabled={index === 0}
                            onClick={() => onMoveLayer(element.id, -1)}
                          >
                            <path d="M12 8l6 6H6z" />
                          </IconButton>
                          <IconButton
                            title={element.visible ? '隐藏' : '显示'}
                            onClick={() => onUpdate(element.id, { visible: !element.visible })}
                          >
                            {element.visible
                              ? <path d="M12 6a9.8 9.8 0 0 0-8.5 5.2 1 1 0 0 0 0 .9A9.8 9.8 0 0 0 12 18a9.8 9.8 0 0 0 8.5-6.9 1 1 0 0 0 0-.9A9.8 9.8 0 0 0 12 6zm0 9a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" />
                              : <path d="M12 6.5c-4.5 0-8.2 2.8-9.6 5.5.4.8 1 1.6 1.8 2.3l1.5-1.5A9.9 9.9 0 0 1 3.5 12c1.2-2.1 4.4-4.2 8.5-4.2h.6L11 9.4a3.5 3.5 0 0 0 4.4 4.4l3.6-3.6c-.3-.5-.7-1-1.2-1.5L17 8.7c.5.4.9.9 1.3 1.3C17.1 12.1 14.6 14 12 14.5l1.6 1.6c3.5-.9 6.3-3.2 7.5-5.6-1.4-2.7-5.1-5.5-9.1-5.5zm0 2l2 2h-2zm-6.3 12.6l13-13-.8-.8-13 13z" />}
                          </IconButton>
                          <IconButton title="复制" onClick={() => onDuplicate(element.id)}>
                            <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z" />
                          </IconButton>
                          <IconButton title="删除" danger onClick={() => onRemove(element.id)}>
                            <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                          </IconButton>
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
      </Panel>
      )}

      {selectedIds.length > 1 && (
        <p className="rounded-[var(--md-sys-shape-corner-extra-small)] bg-[var(--md-sys-color-secondary-container)] px-2 py-1.5 text-[11px] leading-4 text-[var(--md-sys-color-on-secondary-container)]">
          已选中
          {' '}
          {selectedIds.length}
          {' '}
          个元素：拖动任意一个可整体移动，Delete 删除全部。
        </p>
      )}

      {part !== 'layers' && (selected
        ? (
            <Panel title={`${selected.name} · 属性`} hint={KIND_HINT[selected.kind]}>
              {/*
                变体上下文提示：没有它，用户改完位置发现「基础版式也变了 / 没变」会一头雾水。
                基础版式下也给一条说明，讲清「切到变体才会分开存」。
              */}
              {variants.length > 1
                ? (
                    <VariantContext
                      element={selected}
                      variants={variants}
                      activeVariantId={activeVariantId}
                      onActiveVariantChange={onActiveVariantChange}
                      actions={variantActions}
                    />
                  )
                : (
                    <p className="mb-2 text-[10px] leading-4 text-muted-foreground">
                      只有一个方块变体。想给不同变体不同位置 / 字号，先去「生成代码」页加一个变体。
                    </p>
                  )}

              <CommonFields
                element={selected}
                onUpdate={patch => onUpdate(selected.id, patch)}
              />

              {selected.kind === 'text' && (
                <TextFields
                  element={selected}
                  fields={fields}
                  onChange={patch => onUpdateText(selected.id, patch)}
                />
              )}
              {selected.kind === 'logo' && (
                <LogoFields
                  element={selected}
                  fields={fields}
                  assets={assets}
                  onImportAsset={onImportAsset}
                  onRemoveAsset={onRemoveAsset}
                  onEnsureFields={onEnsureFields}
                  onChange={patch => onUpdate(selected.id, patch)}
                />
              )}
              {selected.kind === 'rect' && (
                <RectFields
                  element={selected}
                  onChange={patch => onUpdate(selected.id, patch)}
                />
              )}
            </Panel>
          )
        : <EmptyHint>在下方图层里选一个元素来编辑它的属性。</EmptyHint>)}
    </div>
  )
}

const KIND_HINT: Record<LayoutElementKind, string> = {
  text: '生成 helper centered / left / right，或展开成显式 setter',
  logo: '生成 SignTextLinesHelper.logo(path, x, y, size)',
  rect: '生成 new TextLineData("-rect w h")',
}

// ==================== 变体上下文 ====================

/** 覆盖 chip 上的短标签（用字段名会太长，用中文又对不上面板标签） */
const OVERRIDE_LABELS: Record<string, string> = {
  x: 'X',
  y: 'Y',
  visible: '显示',
  text: '文本',
  scale: 'scale',
  scaleX: 'scaleX',
  scaleY: 'scaleY',
  scaleZ: 'scaleZ',
  color: '颜色',
  abcFont: '字体',
  alignment: '对齐',
  bold: '粗体',
  italic: '斜体',
  underline: '下划线',
  shadow: '阴影',
  outline: '描边',
  glowing: '发光',
  zDelta: 'Z 微调',
  rotX: 'rotX',
  rotY: 'rotY',
  rotZ: 'rotZ',
  path: '贴图',
  size: 'size',
  width: '宽',
  height: '高',
}

/**
 * 变体上下文条。
 *
 * 覆盖表只存**被改过的字段**，所以这里没有「开启覆盖」开关 ——
 * 在那个变体下改一次参数就等于开了覆盖。这条说明必须写出来，
 * 否则用户会去找那个并不存在的开关。
 */
function VariantContext({
  element,
  variants,
  activeVariantId,
  onActiveVariantChange,
  actions,
}: {
  element: LayoutElement
  variants: LayoutVariant[]
  activeVariantId: string | null
  onActiveVariantChange: (id: string | null) => void
  actions: VariantActions
}) {
  const activeVariant = variants.find(variant => variant.id === activeVariantId) ?? null

  if (!activeVariant) {
    return (
      <div className="mb-2 rounded-[var(--md-sys-shape-corner-small)] bg-[var(--md-sys-color-surface-container)] px-2 py-1.5">
        <p className="text-[10px] leading-4 text-muted-foreground">
          正在编辑
          <span className="text-foreground">基础版式</span>
          （所有变体的默认值）。想让某个方块变体单独一套位置 / 字号 / 内容，切到该变体再改：
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {variants.map(variant => (
            <Chip
              key={variant.id}
              onClick={() => onActiveVariantChange(variant.id)}
              title={`切到 ${variant.displayNameZh}（${variant.registryId}）`}
            >
              {variant.displayNameZh}
            </Chip>
          ))}
        </div>
      </div>
    )
  }

  const keys = overriddenKeys(element, activeVariant.id)

  return (
    <div className="mb-2 space-y-1.5 rounded-[var(--md-sys-shape-corner-small)] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-[10px] leading-4 text-muted-foreground">
          变体
          <span className="mx-1 text-[11px] text-foreground">{activeVariant.displayNameZh}</span>
          <span className="md-code">{activeVariant.registryId}</span>
        </p>
        <ActionButton
          variant="ghost"
          onClick={() => onActiveVariantChange(null)}
          title="回到基础版式（不会删除已存的覆盖）"
        >
          返回基础
        </ActionButton>
      </div>

      {keys.length === 0
        ? (
            <p className="text-[10px] leading-4 text-muted-foreground">
              此元素在该变体下沿用基础值。现在改任意参数，就只作用于这个变体。
            </p>
          )
        : (
            <>
              <p className="text-[10px] leading-4 text-muted-foreground">
                已单独设置
                {' '}
                {keys.length}
                {' '}
                项 · 点 chip 撤销该项，退回基础值
              </p>
              <div className="flex flex-wrap gap-1">
                {keys.map(key => (
                  <Chip
                    key={key}
                    onClick={() => actions.clearField(element.id, activeVariant.id, key)}
                    title={`撤销 ${key} 在该变体下的覆盖`}
                  >
                    {`${OVERRIDE_LABELS[key] ?? key} ×`}
                  </Chip>
                ))}
              </div>
              <ActionButton
                variant="outlined"
                onClick={() => actions.disable(element.id, activeVariant.id)}
                title="清空该元素在此变体下的所有覆盖，完全回到基础版式"
              >
                全部恢复基础
              </ActionButton>
            </>
          )}
    </div>
  )
}

// ==================== 公共字段 ====================

function CommonFields({
  element,
  onUpdate,
}: {
  element: LayoutElement
  onUpdate: (patch: Partial<LayoutElement>) => void
}) {
  return (
    <div className="space-y-2">
      <Field label="名称">
        <TextInput value={element.name} onChange={name => onUpdate({ name })} />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="X" hint="bit">
          <NumberInput
            value={element.x}
            onChange={x => onUpdate({ x })}
            step={1}
          />
        </Field>
        <Field label="Y" hint="bit">
          <NumberInput
            value={element.y}
            onChange={y => onUpdate({ y })}
            step={1}
          />
        </Field>
      </div>

      <Toggle
        checked={element.visible}
        onChange={visible => onUpdate({ visible })}
        label="在版面与生成结果里显示"
      />
    </div>
  )
}

// ==================== 文本 ====================

function TextFields({
  element,
  fields,
  onChange,
}: {
  element: LayoutTextElement
  fields: LayoutField[]
  onChange: (patch: Partial<LayoutTextElement>) => void
}) {
  const usedKeys = useMemo(() => extractPlaceholderKeys(element.text), [element.text])
  const availableFields = useMemo(
    () => fields.filter(field => !usedKeys.includes(field.key)),
    [fields, usedKeys],
  )

  return (
    <div className="space-y-2 border-t border-[var(--md-sys-color-outline-variant)] pt-2">
      <Field label="文本内容" hint="支持 {key} 占位符">
        <TextInput
          value={element.text}
          onChange={text => onChange({ text })}
          placeholder="例如 北京 {text1}"
        />
      </Field>

      {/* 常用字段快捷插入 */}
      {availableFields.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {availableFields.slice(0, 8).map(field => (
            <Chip
              key={field.id}
              onClick={() => onChange({ text: `${element.text}{${field.key}}` })}
              title={field.label}
            >
              {`{${field.key}}`}
            </Chip>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="scale" hint="fontSize = scale×20">
          <NumberInput value={element.scale} onChange={scale => onChange({ scale })} step={0.005} min={0.001} />
        </Field>
        <Field label="Z 微调" hint="方块">
          <NumberInput value={element.zDelta} onChange={zDelta => onChange({ zDelta })} step={0.01} />
        </Field>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-[11px] text-muted-foreground">颜色</span>
        <ColorInput value={element.color} onChange={color => onChange({ color })} />
      </div>

      <Field label="对齐" hint="helper 只覆盖 *_CENTER">
        <SelectInput
          value={element.alignment}
          options={ALIGNMENT_OPTIONS}
          onChange={alignment => onChange({ alignment })}
        />
      </Field>

      <Field
        label="括号内字体"
        hint={`${LINE_FONT_OPTIONS.find(item => item.value === element.abcFont)?.hint ?? 'helper 第 6 参数'}｜原版 / 自适应是模组全局设置，不在这里选`}
      >
        <SelectInput
          value={element.abcFont}
          options={[...ABC_FONT_OPTIONS]}
          onChange={abcFont => onChange({ abcFont })}
        />
      </Field>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        <Toggle checked={element.bold} onChange={bold => onChange({ bold })} label="粗体" />
        <Toggle checked={element.italic} onChange={italic => onChange({ italic })} label="斜体" />
        <Toggle checked={element.underline} onChange={underline => onChange({ underline })} label="下划线" />
        <Toggle checked={element.shadow} onChange={shadow => onChange({ shadow })} label="阴影" />
        <Toggle checked={element.glowing} onChange={glowing => onChange({ glowing })} label="发光" />
        <Toggle checked={element.outline} onChange={outline => onChange({ outline })} label="描边" />
      </div>

      {element.outline && (
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[11px] text-muted-foreground">描边色</span>
          <ColorInput value={element.outlineColor} onChange={outlineColor => onChange({ outlineColor })} />
        </div>
      )}

      <details className="group">
        <summary className="cursor-pointer list-none text-[11px] text-muted-foreground hover:text-foreground">
          ▸ 高级（旋转 / 额外缩放 — 会让生成代码展开为显式 setter）
        </summary>
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Field label="rotX"><NumberInput value={element.rotX} onChange={rotX => onChange({ rotX })} /></Field>
            <Field label="rotY"><NumberInput value={element.rotY} onChange={rotY => onChange({ rotY })} /></Field>
            <Field label="rotZ"><NumberInput value={element.rotZ} onChange={rotZ => onChange({ rotZ })} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="scaleX"><NumberInput value={element.scaleX} onChange={scaleX => onChange({ scaleX })} step={0.05} /></Field>
            <Field label="scaleY"><NumberInput value={element.scaleY} onChange={scaleY => onChange({ scaleY })} step={0.05} /></Field>
            <Field label="scaleZ"><NumberInput value={element.scaleZ} onChange={scaleZ => onChange({ scaleZ })} step={0.05} /></Field>
          </div>
        </div>
      </details>
    </div>
  )
}

// ==================== 贴图 ====================

function LogoFields({
  element,
  fields,
  assets,
  onImportAsset,
  onRemoveAsset,
  onEnsureFields,
  onChange,
}: {
  element: LayoutLogoElement
  fields: LayoutField[]
  assets: LayoutAsset[]
  onImportAsset: (file: File) => Promise<void>
  onRemoveAsset: (id: string) => void
  onEnsureFields: (path: string) => void
  onChange: (patch: Partial<LayoutLogoElement>) => void
}) {
  const usedKeys = useMemo(() => extractPlaceholderKeys(element.path), [element.path])
  const dynamic = useMemo(() => findDynamicTexture(element.path), [element.path])
  const missingKeys = usedKeys.filter(key => !fields.some(field => field.key === key))

  /** 选中动态贴图：先落路径，再把缺的 enum 字段补上（画布随即显示真实 PNG） */
  const pickPath = (path: string) => {
    onChange({ path })
    onEnsureFields(path)
  }

  return (
    <div className="space-y-2 border-t border-[var(--md-sys-color-outline-variant)] pt-2">
      <Field label="图案库" hint="点缩略图选用；动态贴图会自动补 enum 字段">
        <SpriteLibrary
          value={element.path}
          fields={fields}
          assets={assets}
          onPick={pickPath}
          onImport={onImportAsset}
          onRemoveAsset={onRemoveAsset}
        />
      </Field>

      <Field label="贴图路径" hint="可含 {占位符}">
        <TextInput value={element.path} onChange={path => onChange({ path })} mono />
      </Field>

      {dynamic && (
        <p className="text-[10px] leading-4 text-muted-foreground">
          <span className="text-[var(--md-sys-color-on-surface-variant)]">动态贴图：</span>
          {' '}
          {dynamic.label}
          {' · 纹理段由 '}
          <span className="md-code">{`{${dynamic.keys.join('} {')}}`}</span>
          {' 决定'}
        </p>
      )}

      {/* 直接挑一个字段选项做成完整路径 */}
      {usedKeys.length > 0 && (
        <div className="rounded-[var(--md-sys-shape-corner-small)] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] leading-4 text-muted-foreground">
              路径里的占位符需要对应字段存在：
            </p>
            {missingKeys.length > 0 && (
              <ActionButton
                variant="outlined"
                onClick={() => onEnsureFields(element.path)}
                title="按模组实体里的选项组自动建 enum 字段（含 NBT 键名）"
              >
                补 {missingKeys.length} 个 enum 字段
              </ActionButton>
            )}
          </div>
          <ul className="mt-1 space-y-0.5">
            {usedKeys.map(key => {
              const exists = fields.some(field => field.key === key)
              const group = optionGroupFor(element.path, key)
              return (
                <li
                  key={key}
                  className={cn(
                    'flex items-center gap-1.5 text-[11px] md-code',
                    exists ? 'text-muted-foreground' : 'text-destructive',
                  )}
                >
                  <span>{`{${key}}`}</span>
                  {exists
                    ? <span title="已有同名字段">✓</span>
                    : (
                        <>
                          <span>—— 缺少此字段</span>
                          {group && (
                            <span className="text-muted-foreground">
                              （可补
                              {' '}
                              {group.title}
                              {'，NBT 键 '}
                              {modFieldName(group, key)}
                              ）
                            </span>
                          )}
                        </>
                      )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field
          label="size"
          hint={`边长 ${(element.size * 16).toFixed(1)} bit（${element.size.toFixed(2)} 方块） · fontSize = size / 0.4`}
        >
          <NumberInput value={element.size} onChange={size => onChange({ size })} step={0.05} min={0.05} />
        </Field>
        <Field
          label="rotZ"
          hint="Z 轴旋转（度），写进行的 rotZ 字段 · R 键可快速 ±15°"
        >
          <NumberInput value={element.rotZ} onChange={rotZ => onChange({ rotZ })} step={5} />
        </Field>
      </div>

      <div className="rounded-[var(--md-sys-shape-corner-small)] bg-[var(--md-sys-color-surface-container)] px-2 py-1.5">
        <p className="text-[10px] leading-4 text-muted-foreground">
          等价写法：
          <span className="md-code text-foreground">
            logo(&quot;
            {shortPath(element.path)}
            &quot;, {element.x}, {element.y}, {element.size}f
            {element.rotZ ? `, ${element.rotZ}f` : ''})
          </span>
        </p>
      </div>
    </div>
  )
}

// ==================== 色块 ====================

function RectFields({
  element,
  onChange,
}: {
  element: LayoutRectElement
  onChange: (patch: Partial<LayoutRectElement>) => void
}) {
  const presetField = FIELD_OPTION_PRESETS.find(preset => preset.key === 'roadLevelColor')

  return (
    <div className="space-y-2 border-t border-[var(--md-sys-color-outline-variant)] pt-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="宽" hint="w（bit）">
          <NumberInput value={element.width} onChange={width => onChange({ width })} min={1} step={1} />
        </Field>
        <Field label="高" hint="h（bit）">
          <NumberInput value={element.height} onChange={height => onChange({ height })} min={1} step={1} />
        </Field>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-[11px] text-muted-foreground">颜色</span>
        <ColorInput value={element.color} onChange={color => onChange({ color })} />
      </div>

      {presetField && (
        <div className="space-y-1">
          <span className="text-[11px] text-muted-foreground">道路等级底色</span>
          <div className="flex flex-wrap gap-1">
            <Chip active={element.color === 0xC1121F} onClick={() => onChange({ color: 0xC1121F })}>国道 · 红</Chip>
            <Chip active={element.color === 0xF2C230} onClick={() => onChange({ color: 0xF2C230 })}>省道 · 黄</Chip>
            <Chip active={element.color === 0xFFFFFF} onClick={() => onChange({ color: 0xFFFFFF })}>县乡道 · 白</Chip>
            <Chip active={element.color === 0x2D9B47} onClick={() => onChange({ color: 0x2D9B47 })}>高速 · 绿</Chip>
          </div>
        </div>
      )}

      <div className="rounded-[var(--md-sys-shape-corner-small)] bg-[var(--md-sys-color-surface-container)] px-2 py-1.5">
        <p className="text-[10px] leading-4 text-muted-foreground">
          等价写法：
          <span className="md-code text-foreground">
            new TextLineData(&quot;-rect {element.width} {element.height}&quot;)
          </span>
        </p>
      </div>
    </div>
  )
}

// ==================== 小组件 ====================

function KindGlyph({ kind, active }: { kind: LayoutElementKind; active: boolean }) {
  const path = {
    text: 'M5 4v3h5.5v12h3V7H19V4H5z',
    logo: 'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z',
    rect: 'M3 5h18v14H3V5zm2 2v10h14V7H5z',
  }[kind]
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('size-4 shrink-0', active ? 'fill-current' : 'fill-[var(--md-sys-color-outline)]')}
    >
      <path d={path} />
    </svg>
  )
}

function IconButton({
  title,
  onClick,
  children,
  disabled,
  danger,
}: {
  title: string
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={event => {
        event.stopPropagation()
        onClick()
      }}
      className={cn(
        'md-icon-button size-6',
        danger && 'text-destructive',
        'disabled:pointer-events-none disabled:opacity-30',
      )}
    >
      <svg viewBox="0 0 24 24" className="size-3.5 fill-current">
        {children}
      </svg>
    </button>
  )
}

function shortPath(path: string): string {
  return path.startsWith(SIGN_TEXTURE_PREFIX) ? path.slice(SIGN_TEXTURE_PREFIX.length) : path
}

export default ElementPanel
