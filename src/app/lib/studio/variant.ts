/**
 * 方块变体覆盖 —— 同一个元素在不同方块变体下的不同参数。
 *
 * ## 为什么要有
 * 一个工程会生成多个方块变体（`options.variants`，各自有 `registryId`）。
 * 同一块牌子的不同形态（比如同一面牌子装在路侧 / 门架上）常常要求
 * 文本行位置、字号、甚至内容都不一样，逐个复制整块牌子又太笨重。
 *
 * ## 数据形状
 * 每个元素带 `variantOverrides: { [variantId]: { 字段名: 值 } }`，
 * **只存被显式改过的字段** —— 没写的字段读的时候回退基础值（见 `applyVariantOverride`）。
 *
 * 这一点很关键：如果开启覆盖时就把基础值全量抄进来，那「哪些字段真的被改过」
 * 就永久丢失了，面板上「已覆盖 N 项」永远等于白名单长度，也没法逐项撤销。
 *
 * ## 谁负责合并
 * `applyVariantOverride()` 是唯一的读合并点：画布、属性面板、代码生成全部先过它，
 * 不会出现「画布看的是合并值、生成用的是原值」这种分叉。
 */

import type {
  LayoutElement,
  LayoutElementKind,
  VariantOverrideValue,
} from './layout-model'

/**
 * 每种元素允许被变体覆盖的字段。
 *
 * 白名单里只有**标量字段**：`id / name / kind / variantOverrides` 一律不覆盖
 * （覆盖了就把元素身份改掉了），数组 / 对象字段目前也没有可覆盖的需求。
 */
export const OVERRIDABLE_FIELDS: Record<LayoutElementKind, readonly string[]> = {
  text: [
    'x', 'y', 'visible',
    'text', 'scale', 'scaleX', 'scaleY', 'scaleZ',
    'color', 'abcFont', 'alignment',
    'bold', 'italic', 'underline', 'shadow', 'outline', 'glowing', 'zDelta',
    'rotX', 'rotY', 'rotZ',
  ],
  logo: ['x', 'y', 'visible', 'path', 'size', 'rotZ'],
  rect: ['x', 'y', 'visible', 'width', 'height', 'color'],
}

/** 该元素允许覆盖的字段表 */
export function overridableFields(element: LayoutElement): readonly string[] {
  return OVERRIDABLE_FIELDS[element.kind]
}

/** 该字段是不是可覆盖字段 */
export function isOverridable(element: LayoutElement, key: string): boolean {
  return OVERRIDABLE_FIELDS[element.kind].includes(key)
}

/** 元素的变体覆盖表（缺省返回空表，调用方不用判 undefined） */
export function elementOverrides(
  element: LayoutElement,
): Record<string, Record<string, VariantOverrideValue>> {
  return element.variantOverrides ?? {}
}

/** 元素在某个变体下是否已经开了一组覆盖 */
export function hasVariantOverride(element: LayoutElement, variantId: string): boolean {
  const entry = elementOverrides(element)[variantId]
  return !!entry && Object.keys(entry).length > 0
}

/** 元素是否定义了任一变体覆盖（列表角标用） */
export function hasAnyVariantOverride(element: LayoutElement): boolean {
  return Object.values(elementOverrides(element)).some(entry => Object.keys(entry).length > 0)
}

/** 某个字段在某个变体下有没有覆盖值 */
export function variantField(
  element: LayoutElement,
  variantId: string,
  key: string,
): VariantOverrideValue | undefined {
  return elementOverrides(element)[variantId]?.[key]
}

/** 关闭某元素的某变体覆盖：整组删掉，退回基础值 */
export function clearVariantOverride(
  element: LayoutElement,
  variantId: string,
): LayoutElement {
  const overrides = { ...elementOverrides(element) }
  delete overrides[variantId]
  const next: LayoutElement = { ...element }
  if (Object.keys(overrides).length > 0) next.variantOverrides = overrides
  else delete next.variantOverrides
  return next
}

/**
 * 改某元素在某变体下的某个字段。
 *
 * 只写这一项 —— 没写过的字段读的时候自然回退基础值（`applyVariantOverride`），
 * 不需要也不应该先把基础值抄一份进来。
 */
export function setVariantField(
  element: LayoutElement,
  variantId: string,
  key: string,
  value: VariantOverrideValue,
): LayoutElement {
  return setVariantFields(element, variantId, { [key]: value })
}

/** 一次性改多个字段（面板的整组更新走这条，避免每键一次历史步骤） */
export function setVariantFields(
  element: LayoutElement,
  variantId: string,
  patch: Record<string, VariantOverrideValue>,
): LayoutElement {
  const clean: Record<string, VariantOverrideValue> = {}
  for (const [key, value] of Object.entries(patch)) {
    if (isOverridable(element, key)) clean[key] = value
  }
  if (Object.keys(clean).length === 0) return element
  return {
    ...element,
    variantOverrides: {
      ...elementOverrides(element),
      [variantId]: {
        ...elementOverrides(element)[variantId],
        ...clean,
      },
    },
  }
}

/**
 * 撤销某元素在某变体下的**单个字段**覆盖（其余字段保留）。
 *
 * 一个字段都不剩时整组删掉 —— 留一张空表会让 `hasVariantOverride` 之外的
 * 逻辑（比如面板的「已覆盖 N 项」）读到 0 项却仍认为组存在。
 */
export function clearVariantField(
  element: LayoutElement,
  variantId: string,
  key: string,
): LayoutElement {
  const entry = elementOverrides(element)[variantId]
  if (!entry || !(key in entry)) return element
  const nextEntry = { ...entry }
  delete nextEntry[key]
  if (Object.keys(nextEntry).length === 0) return clearVariantOverride(element, variantId)
  return {
    ...element,
    variantOverrides: {
      ...elementOverrides(element),
      [variantId]: nextEntry,
    },
  }
}

/** 某变体下被覆盖的字段名（面板列 chip 用，顺序跟白名单一致） */
export function overriddenKeys(element: LayoutElement, variantId: string): string[] {
  const entry = elementOverrides(element)[variantId]
  if (!entry) return []
  return overridableFields(element).filter(key => key in entry)
}

/**
 * 两个同种类元素之间的差异 → 覆盖表（只写真正不一样的字段）。
 *
 * 供「导入现成源码」与「AI 配置版面」共用：两边都是拿一份完整元素去打补丁，
 * 全量抄一遍会让面板上每块牌子都显示「已覆盖十几项」，看不出到底改了什么。
 *
 * 只比较**白名单内的标量字段**，`kind` 不同时返回空表（调用方自己决定隐藏）。
 */
export function variantDiffPatch(
  base: LayoutElement,
  next: LayoutElement,
): Record<string, VariantOverrideValue> {
  const patch: Record<string, VariantOverrideValue> = {}
  if (base.kind !== next.kind) return patch
  for (const key of overridableFields(base)) {
    const before = (base as unknown as Record<string, VariantOverrideValue>)[key]
    const after = (next as unknown as Record<string, VariantOverrideValue>)[key]
    if (before === undefined || after === undefined) continue
    if (before !== after) patch[key] = after
  }
  return patch
}

/**
 * 合并后的元素（读侧唯一入口）。
 *
 * 没有 / 空覆盖 → 原样返回（同一引用，调用方可以放心 `===` 判等）；
 * 有覆盖 → 返回一份浅拷贝，白名单内的字段被覆盖值替换。
 */
export function applyVariantOverride(
  element: LayoutElement,
  variantId: string | null,
): LayoutElement {
  if (!variantId) return element
  const entry = elementOverrides(element)[variantId]
  if (!entry || Object.keys(entry).length === 0) return element
  const next: Record<string, unknown> = { ...element }
  for (const key of overridableFields(element)) {
    if (!(key in entry)) continue
    next[key] = entry[key]
  }
  return next as unknown as LayoutElement
}

/** 整份工程的画布/生成用「合并视图」 */
export function applyVariantOverrides(
  elements: readonly LayoutElement[],
  variantId: string | null,
): LayoutElement[] {
  return elements.map(element => applyVariantOverride(element, variantId))
}

/** 某个变体是否至少改变过一个元素（决定要不要生成 switch） */
export function projectHasVariantOverrides(elements: readonly LayoutElement[]): boolean {
  return elements.some(element => hasAnyVariantOverride(element))
}
