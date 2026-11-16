/**
 * Spec → LayoutProject 的**确定性**映射。
 *
 * 模型只负责「看图说人话」，所有几何换算、枚举收敛、贴图白名单校验都在这里做，
 * 所以同一份 spec 永远映射出同一个版面，出问题也能稳定复现。
 *
 * 单位换算依据 `lib/studio/text.ts` 的 `elementBox`：
 *
 * | 元素 | 源码换算 | 反推公式 |
 * | --- | --- | --- |
 * | 文本 | 行高 = `0.8 * (scale*20) * 9` bit | `scale = sizePct * 牌高 / 144` |
 * | 贴图 | 边长 = `0.4 * (size/0.4) * 16` bit | `size = sizePct * 牌高 / 16`（方块） |
 * | 色块 | 宽高直接是 bit | `width = widthPct * 牌宽` |
 */

import {
  BASEPLATE_PRESETS,
} from '@/lib/studio/layout-model'
import {
  DYNAMIC_TEXTURES, textureFileName,
} from '@/lib/studio/dynamic-textures'
import {
  clampSize, createField, createLayoutId, createLogoElement, createRectElement, createTextElement,
  ensureFieldsForPath, toSnakeCase,
} from '@/lib/studio/project'
import {
  extractPlaceholderKeys,
} from '@/lib/studio/text'
import {
  TEXTURE_GROUPS,
} from '@/lib/studio/texture-catalog'
import {
  variantDiffPatch,
} from '@/lib/studio/variant'

import type {
  LayoutAlignment, LayoutElement, LayoutField, LayoutOptions, LayoutProject,
  VariantOverrideValue,
} from '@/lib/studio/layout-model'
import type {
  AiFieldSpec, AiItem, AiRectItem, AiSpec, AiTextItem, AiTextureItem, AiVariantSpec,
} from './spec'

/** 贴图路径前缀（与 `dynamic-textures.ts` / `sprites.ts` 一致） */
const TEXTURE_PREFIX = 'yunbeiuc:textures/block/sign/'

/** 模型可以写的颜色名 → 0xRRGGBB（取值与基板预设统一，避免两套配色） */
const NAMED_COLORS: Record<string, number> = {
  WHITE: 0xFFFFFF,
  BLACK: 0x000000,
  YELLOW: 0xF2C300,
  RED: 0xC8102E,
  GREEN: 0x00703C,
  BLUE: 0x0055A4,
  ORANGE: 0xF07C00,
  BROWN: 0x6B4A2B,
  GRAY: 0x9E9E9E,
  GREY: 0x9E9E9E,
}

const DEFAULT_TEXT_COLOR = NAMED_COLORS.WHITE
const DEFAULT_SHAPE_COLOR = NAMED_COLORS.WHITE

/** 静态贴图白名单（`public/textures/sign/` 下真实存在的 627 张） */
const STATIC_TEXTURE_FILES: ReadonlySet<string> = new Set(
  TEXTURE_GROUPS.flatMap(group => group.items.map(item => item.file)),
)

/** 动态贴图白名单（路径里带 `{占位符}` 的那些模板） */
const DYNAMIC_TEXTURE_FILES: ReadonlySet<string> = new Set(
  DYNAMIC_TEXTURES.map(entry => entry.file),
)

/** 文本行默认行高占牌高的比例（≈ 20 bit 牌面下的 scale 0.03） */
const DEFAULT_TEXT_SIZE_PCT = 0.22
/** 贴图默认边长占牌高的比例（≈ 20 bit 牌面下的 size 0.65） */
const DEFAULT_LOGO_SIZE_PCT = 0.5

const round = (value: number, digits: number) => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/** 颜色名 → 0xRRGGBB；不认识的名字回退 */
function colorOf(name: string | undefined, fallback: number): number {
  if (!name) return fallback
  return NAMED_COLORS[name.toUpperCase()] ?? fallback
}

/**
 * 贴图名 → 完整路径。
 *
 * 接受三种写法：`sign_x.png`、`yunbeiuc:textures/block/sign/sign_x.png`、
 * 以及带占位符的动态模板 `sign_expressway_{logo1}.png`。
 * **不在白名单里的一律返回 null** —— 宁可少一个贴图，也不要让游戏里
 * 拼出一个不存在的 PNG（那样会把 `-texture ...` 整行原文画在牌面上）。
 */
export function resolveTexturePath(input: string): string | null {
  const file = textureFileName(input)
  if (file === '') return null
  if (!STATIC_TEXTURE_FILES.has(file) && !DYNAMIC_TEXTURE_FILES.has(file)) return null
  return `${TEXTURE_PREFIX}${file}`
}

function alignmentOf(item: AiTextItem): LayoutAlignment {
  const h = item.align === 'left' ? 'LEFT' : item.align === 'right' ? 'RIGHT' : 'CENTER'
  const v = item.valign === 'top' ? 'TOP' : item.valign === 'bottom' ? 'BOTTOM' : 'CENTER'
  return `${h}_${v}` as LayoutAlignment
}

/** 归一化坐标 → bit 坐标（原点在牌面中心、Y 向上） */
const toBitX = (nx: number, width: number) => round((nx - 0.5) * width, 1)
const toBitY = (ny: number, height: number) => round((0.5 - ny) * height, 1)

function textElement(item: AiTextItem, width: number, height: number): LayoutElement {
  const sizePct = item.sizePct ?? DEFAULT_TEXT_SIZE_PCT
  return createTextElement({
    id: createLayoutId('text'),
    name: Array.from(item.text).slice(0, 8).join(''),
    text: item.text,
    x: toBitX(item.x, width),
    y: toBitY(item.y, height),
    // 行高 = 144 * scale（bit），所以 scale 由「行高占牌高比例」反推
    scale: round(clamp(sizePct * height / 144, 0.002, 2), 4),
    color: colorOf(item.color, DEFAULT_TEXT_COLOR),
    abcFont: item.font ?? 'a',
    alignment: alignmentOf(item),
    bold: Boolean(item.bold),
  })
}

function textureElement(item: AiTextureItem, width: number, height: number): LayoutElement | null {
  const path = resolveTexturePath(item.texture)
  if (!path) return null
  const sizePct = item.sizePct ?? DEFAULT_LOGO_SIZE_PCT
  return createLogoElement({
    id: createLayoutId('logo'),
    name: textureFileName(path).replace(/\.png$/i, ''),
    path,
    x: toBitX(item.x, width),
    y: toBitY(item.y, height),
    // 渲染出来的边长 = size * 16 bit，所以 size 是方块单位
    size: round(clamp(sizePct * height / 16, 0.02, 8), 3),
  })
}

function rectElement(item: AiRectItem, width: number, height: number): LayoutElement {
  return createRectElement({
    id: createLayoutId('rect'),
    name: '色块',
    x: toBitX(item.x, width),
    y: toBitY(item.y, height),
    // 色块宽高直接是 bit（rectFontSize = 1）
    width: round(clamp(item.widthPct * width, 1, width * 4), 1),
    height: round(clamp(item.heightPct * height, 0.5, height * 4), 1),
    color: colorOf(item.color, DEFAULT_SHAPE_COLOR),
  })
}

/** 元素里引用到、但还没有对应字段的占位符 —— 补成 string 字段（默认空） */
/**
 * 元素里的占位符 → 补 string 字段（默认空值，玩家在游戏里填）。
 *
 * `extraTexts` 收的是「只在某个变体里出现」的文字 —— 变体覆盖里的 `text`
 * 不在元素本体上，光扫 elements 会漏掉它们引用的 `{key}`。
 */
function ensureTextFields(
  elements: LayoutElement[],
  fields: LayoutField[],
  extraTexts: readonly string[] = [],
): LayoutField[] {
  const used = new Set<string>()
  const collect = (source: string) => {
    for (const key of extractPlaceholderKeys(source)) used.add(key)
  }
  for (const element of elements) {
    collect(element.kind === 'text' ? element.text : element.kind === 'logo' ? element.path : '')
  }
  for (const text of extraTexts) collect(text)

  const known = new Set(fields.map(field => field.key))
  const appended: LayoutField[] = []
  for (const key of used) {
    if (known.has(key)) continue
    appended.push(createField({
      key,
      label: key,
      defaultValue: '',
    }))
  }
  return appended.length > 0 ? [...fields, ...appended] : fields
}

/**
 * 把 spec 里的 field 声明合并进「已由占位符自检生成的字段表」。
 *
 * enum 字段（动态贴图占位符）的默认值必须落在选项里 —— 否则游戏里会拼出
 * `sign_expressway_.png` 这种空段；不在选项里就保留原默认值并给出提示。
 */
function mergeSpecFields(
  base: LayoutField[],
  entries: AiFieldSpec[],
  warnings: string[],
): LayoutField[] {
  const fields = base.map(field => ({ ...field }))
  for (const entry of entries) {
    const key = entry.key
    const label = entry.label ?? key
    const value = entry.default ?? ''
    const index = fields.findIndex(field => field.key === key)

    if (index < 0) {
      fields.push(createField({
        key,
        label,
        defaultValue: value,
      }))
      continue
    }

    const field = fields[index]
    const options = Array.isArray(field.options) ? field.options : []
    const isEnum = field.type === 'enum'

    if (value === '') {
      fields[index] = {
        ...field,
        label,
      }
      continue
    }

    if (isEnum && !options.some(option => option.value === value)) {
      warnings.push(
        `字段 ${key} 的默认值「${value}」不在可选项里，已保留 ${field.defaultValue || '（空）'}`,
      )
      fields[index] = {
        ...field,
        label,
      }
      continue
    }

    fields[index] = {
      ...field,
      label,
      defaultValue: value,
    }
  }
  return fields
}

export interface SpecApplyStats {
  width: number
  height: number
  elements: number
  fields: number
  /** 本次 spec 里包含几个方块变体（1 = 单状态） */
  variants: number
}

export interface SpecApplyResult {
  project: LayoutProject
  /** 映射过程中修正 / 丢弃了什么 */
  warnings: string[]
  stats: SpecApplyStats
}

/** 画布预览底色：`none` / 未指定 → 不垫色；其余按预设色板（不参与生成） */
function baseplateOf(id: string | undefined): { color: number, visible: boolean } {
  if (!id || id === 'none') {
    return {
      color: BASEPLATE_PRESETS[0].color,
      visible: false,
    }
  }
  const preset = BASEPLATE_PRESETS.find(item => item.id === id) ?? BASEPLATE_PRESETS[0]
  return {
    color: preset.color,
    visible: true,
  }
}

/** 单个 spec 元素 → 版面元素（贴图不在白名单时返回 null 并记一条提示） */
function buildElement(
  item: AiItem,
  width: number,
  height: number,
  warnings: string[],
): LayoutElement | null {
  if (item.kind === 'text') return textElement(item, width, height)
  if (item.kind === 'texture') {
    const element = textureElement(item, width, height)
    if (!element) warnings.push(`贴图「${item.texture}」不在图案库里，已跳过这个元素`)
    return element
  }
  return rectElement(item, width, height)
}

/**
 * 两个同一种类的元素之间的差异 → 变体覆盖表。
 *
 * 只写**真的不一样**的字段：`variant.ts` 的约定是「只存被显式改过的字段」，
 * 全量抄一遍会让面板上每块牌子都显示「已覆盖十几项」，反而看不出改了什么。
 */
const diffPatch = variantDiffPatch

/**
 * 多变体时的 `options.variants`：注册名优先用模型给的，没给就
 * `<类名 snake_case>_1 / _2 …`；重名自动加后缀，保证注册表不冲突。
 */
function buildVariantOptions(params: {
  variants: readonly AiVariantSpec[]
  variantIds: readonly string[]
  current: LayoutProject
  displayNameZh: string
}): LayoutOptions {
  const { variants, variantIds, current, displayNameZh } = params
  const fallbackId = toSnakeCase(current.options.className) || 'sign_custom'
  const used = new Set<string>()
  return {
    ...current.options,
    displayNameZh,
    variants: variants.map((variant, index) => {
      let registryId = variant.registryId ?? `${fallbackId}_${index + 1}`
      let suffix = 2
      while (used.has(registryId)) {
        registryId = `${registryId}_${suffix}`
        suffix += 1
      }
      used.add(registryId)
      const nameZh = variant.nameZh ?? (index === 0 ? displayNameZh : `${displayNameZh} ${index + 1}`)
      return {
        id: variantIds[index],
        registryId,
        displayNameZh: nameZh,
        displayNameEn: nameZh,
      }
    }),
  }
}

/**
 * spec + 当前工程 → 新工程。
 *
 * 保留的东西：`options` 里除变体外的字段（命名 / z 偏移）、`assets`（已导入的贴图）、
 * `reference`（参考图由调用方决定是否替换）。
 * 替换的东西：牌面尺寸、底色、元素、字段；AI 给出多个变体时连 `options.variants` 一起换。
 *
 * 变体对齐规则：各变体的 `items` 按**下标**对应同一个元素槽位，
 * 差异写进 `variantOverrides[variantId]`；某个变体没有这个下标就把它在那个变体里隐藏。
 * 这样「同一块牌子的几种状态」共用一套元素，生成的代码是一份 `lines.add` + 一个按
 * 注册名分流的 `switch`，而不是复制好几份实体。
 */
export function specToProject(spec: AiSpec, current: LayoutProject): SpecApplyResult {
  const warnings: string[] = []

  // ---- 牌面尺寸：保持当前高度，按 aspect 反推宽度 ----
  const height = clampSize(current.height)
  const aspect = spec.aspect ?? current.width / current.height
  const width = clampSize(Math.round(height * aspect))

  // ---- 变体：解析层已保证至少一个，这里再兜一层 ----
  const variants: readonly AiVariantSpec[] = spec.variants.length > 0
    ? spec.variants
    : [{ items: spec.items }]
  const multiVariant = variants.length > 1
  const variantIds = variants.map(() => createLayoutId('variant'))

  // ---- 元素：把各变体按 items 下标对齐到同一批「槽位」 ----
  const maxItems = variants.reduce((max, variant) => Math.max(max, variant.items.length), 0)
  const elements: LayoutElement[] = []
  for (let index = 0; index < maxItems; index += 1) {
    const itemsAt = variants.map(variant => variant.items[index] ?? null)
    if (itemsAt.every(item => item === null)) continue

    // 基础值取第一个**能构建成功**的变体（贴图不在白名单时会构建失败）
    let base: LayoutElement | null = null
    let baseSource = -1
    for (let k = 0; k < itemsAt.length; k += 1) {
      const item = itemsAt[k]
      if (!item) continue
      const built = buildElement(item, width, height, warnings)
      if (!built) continue
      base = built
      baseSource = k
      break
    }
    if (!base) continue

    // 基础版式 = 变体 0；它本来没有这个元素就默认隐藏，靠各变体覆盖打开
    base.visible = baseSource === 0

    if (multiVariant) {
      const overrides: Record<string, Record<string, VariantOverrideValue>> = {}
      for (let k = 1; k < itemsAt.length; k += 1) {
        const item = itemsAt[k]
        const variantId = variantIds[k]
        if (!item) {
          overrides[variantId] = {
            visible: false,
          }
          continue
        }
        const built = buildElement(item, width, height, warnings)
        if (!built) {
          overrides[variantId] = {
            visible: false,
          }
          continue
        }
        if (built.kind !== base.kind) {
          warnings.push(
            `变体 ${k + 1} 的第 ${index + 1} 个元素类型和基础版式不同，已在该变体里隐藏`,
          )
          overrides[variantId] = {
            visible: false,
          }
          continue
        }
        overrides[variantId] = {
          visible: true,
          ...diffPatch(base, built),
        }
      }
      if (Object.keys(overrides).length > 0) base.variantOverrides = overrides
    }

    elements.push(base)
  }

  // ---- 字段：先按动态贴图路径补 enum 字段，再合并 spec 的声明 ----
  //
  // 这里不用 `repairPlaceholders`：它会把**文本**里的 `{text1}` 也当成贴图占位符
  // 去配选项组，配不到就报「会拼出空段」—— 对普通文本字段是假警报。
  // 所以只对 logo 元素跑 `ensureFieldsForPath`，文本占位符交给 `ensureTextFields`。
  const logoPaths = new Set<string>()
  for (const element of elements) {
    if (element.kind === 'logo') logoPaths.add(element.path)
  }
  for (const variant of variants) {
    for (const item of variant.items) {
      if (item.kind === 'texture' && resolveTexturePath(item.texture)) {
        logoPaths.add(resolveTexturePath(item.texture) as string)
      }
    }
  }

  let autoFields: LayoutField[] = []
  for (const path of logoPaths) {
    const repaired = ensureFieldsForPath(path, autoFields, '贴图')
    autoFields = repaired.fields
    warnings.push(...repaired.warnings)
  }

  // 变体覆盖里的文字也要能补出字段（它们不在元素本体上）
  const variantTexts: string[] = []
  for (const variant of variants) {
    for (const item of variant.items) {
      if (item.kind === 'text') variantTexts.push(item.text)
    }
  }

  const baseplate = baseplateOf(spec.baseplate)
  const mergedFields = mergeSpecFields(autoFields, spec.fields, warnings)
  const fields = ensureTextFields(elements, mergedFields, variantTexts)

  // ---- 命名与变体 ----
  let options: LayoutOptions = current.options
  if (multiVariant) {
    options = buildVariantOptions({
      variants,
      variantIds,
      current,
      displayNameZh: spec.displayNameZh ?? current.options.displayNameZh,
    })
  }
  else if (spec.displayNameZh) {
    options = {
      ...current.options,
      displayNameZh: spec.displayNameZh,
      variants: current.options.variants.map(variant => ({
        ...variant,
        displayNameZh: spec.displayNameZh as string,
      })),
    }
  }

  const project: LayoutProject = {
    version: 2,
    width,
    height,
    baseplate,
    options,
    elements,
    fields,
    assets: current.assets ?? [],
    reference: current.reference,
  }

  return {
    project,
    warnings,
    stats: {
      width,
      height,
      elements: project.elements.length,
      fields: project.fields.length,
      variants: variants.length,
    },
  }
}

/** 元素一行摘要（AI 结果预览用） */
export function specItemSummary(item: AiItem): string {
  const position = `${Math.round(item.x * 100)}%,${Math.round(item.y * 100)}%`
  if (item.kind === 'text') {
    const size = item.sizePct ? ` · ${Math.round(item.sizePct * 100)}%高` : ''
    return `${item.text}（${position}${size}）`
  }
  if (item.kind === 'texture') {
    const size = item.sizePct ? ` · ${Math.round(item.sizePct * 100)}%高` : ''
    return `${item.texture}（${position}${size}）`
  }
  return `色块 ${Math.round(item.widthPct * 100)}%×${Math.round(item.heightPct * 100)}%（${position}）`
}
