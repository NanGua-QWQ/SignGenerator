/**
 * AI 版面配置的中间表示（Spec）。
 *
 * 为什么不直接让模型输出 `LayoutProject`：
 *
 * 1. `LayoutProject` 的坐标是 **bit**（原点在牌面中心、Y 向上），模型对绝对数值没有感觉；
 * 2. 贴图路径有 600+ 张、字段 key 有命名约束，模型很容易编造出并不存在的资源，
 *    而错误路径在游戏里会**把整行原文画在牌面上**（见 `project.ts` 的 `ensureFieldsForPath`）；
 * 3. spec 是「归一化坐标 + 枚举」的窄接口，映射到工程由 `apply.ts` 的确定性代码完成，
 *    出错面小、可测试、可复现。
 *
 * 坐标约定：x / y 都是 0~1 的相对位置，原点在**左上角**，x 向右、y 向下 ——
 * 与模型读图时的直觉一致（先上后下）。转成 bit 坐标由 `apply.ts` 统一做。
 */

import type {
  AbcFont,
} from '@/lib/studio/layout-model'

/** 一次最多接受多少个元素，超出直接丢弃（防止模型输出畸形版面） */
export const AI_MAX_ITEMS = 24

/** 一次最多接受多少个方块变体 */
export const AI_MAX_VARIANTS = 4

/** 单行文本最大字数 */
export const AI_MAX_TEXT_CHARS = 40

export type AiHAlign = 'left' | 'center' | 'right'
export type AiVAlign = 'top' | 'middle' | 'bottom'

/** 文本行 */
export interface AiTextItem {
  kind: 'text'
  text: string
  /** 相对牌面的水平位置（0~1，锚点在元素中心） */
  x: number
  /** 相对牌面的垂直位置（0~1，锚点在元素中心） */
  y: number
  /** 行高占牌面高度的比例 */
  sizePct?: number
  align?: AiHAlign
  valign?: AiVAlign
  color?: string
  font?: AbcFont
  bold?: boolean
}

/** 贴图（只能取自 `apply.ts` 里的白名单） */
export interface AiTextureItem {
  kind: 'texture'
  /** 贴图文件名（可含 `{占位符}`） */
  texture: string
  x: number
  y: number
  /** 边长占牌面高度的比例 */
  sizePct?: number
}

/** 色块（分隔条 / 衬底） */
export interface AiRectItem {
  kind: 'rect'
  x: number
  y: number
  /** 宽占牌面宽度的比例 */
  widthPct: number
  /** 高占牌面高度的比例 */
  heightPct: number
  color?: string
}

export type AiItem = AiTextItem | AiTextureItem | AiRectItem

/** 数据字段（占位符）声明 */
export interface AiFieldSpec {
  /** 占位符 key，元素里写 `{key}` */
  key: string
  /** 面板上显示的中文名 */
  label?: string
  /** 默认值；enum 字段必须落在选项组里 */
  default?: string
}

/**
 * 一个「方块变体」的版面。
 *
 * 模组里一个工程可以注册多个方块（`options.variants`），它们共用同一个方块实体类，
 * 靠注册名分流各自的文本行。AI 可以一次给出多个变体的版面，
 * 比如同一块牌子的「路侧版 / 门架版」，或同一类标志的几种不同内容组合。
 */
export interface AiVariantSpec {
  /** 方块注册名（可选；不给就按类名自动生成 sign_custom_01 / 02 …） */
  registryId?: string
  /** 该变体的中文名（可选） */
  nameZh?: string
  items: AiItem[]
}

/** 一份完整的版面配置 */
export interface AiSpec {
  /** 给用户看的识别说明 */
  note: string
  /** 建议的方块中文名 */
  displayNameZh?: string
  /** 牌面宽高比（宽 ÷ 高） */
  aspect?: number
  /**
   * 画布预览底色（枚举 id 见 `BASEPLATE_PRESETS`）。
   *
   * ⚠️ **不参与代码生成**：它只决定画布上垫什么颜色（方便判断字色对比），
   * 牌面底色由方块模型提供。`none` / 缺省 = 画布不垫底色。
   */
  baseplate?: string
  /** 各变体的版面，至少 1 个；单状态时长度为 1 */
  variants: AiVariantSpec[]
  /**
   * 便捷字段：等于 `variants[0].items`。
   *
   * 单状态的模型回答（老写法，没有 `variants`）被解析后也会补齐到这里，
   * 所以调用方既可以按变体遍历，也可以只读第一个变体。
   */
  items: AiItem[]
  fields: AiFieldSpec[]
}

export interface ParsedSpec {
  spec: AiSpec
  /** 丢弃 / 修正了哪些内容，原样展示给用户 */
  warnings: string[]
}

const H_ALIGNS: readonly AiHAlign[] = ['left', 'center', 'right']
const V_ALIGNS: readonly AiVAlign[] = ['top', 'middle', 'bottom']
const FONTS: readonly AbcFont[] = ['a', 'b', 'c']
const BASE_IDS = [
  'expressway',
  'national',
  'provincial',
  'municipal',
  'tourist',
  'construction',
  'none',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  // 模型偶尔把数字写成字符串（"0.5"），宽容一次
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** 归一化坐标：缺省 0.5（居中），越界夹回 0~1 */
function coord(value: unknown, fallback = 0.5): number {
  const parsed = num(value)
  return parsed === undefined ? fallback : clamp01(parsed)
}

/** 比例值：缺省 undefined（交给 apply.ts 用默认尺寸），非法值丢弃 */
function ratio(value: unknown): number | undefined {
  const parsed = num(value)
  if (parsed === undefined) return undefined
  if (parsed <= 0 || parsed > 1) return undefined
  return parsed
}

function colorName(value: unknown): string | undefined {
  const raw = str(value).toUpperCase()
  if (raw === '') return undefined
  return raw.slice(0, 16)
}

function baseplateId(value: unknown): string | undefined {
  const raw = str(value).toLowerCase()
  if (raw === '') return undefined
  const hit = BASE_IDS.find(id => id === raw)
  return hit
}

function font(value: unknown): AbcFont | undefined {
  const raw = str(value).toLowerCase()
  return FONTS.find(item => item === raw)
}

function label(value: unknown): string | undefined {
  const raw = str(value)
  return raw === '' ? undefined : Array.from(raw).slice(0, 20).join('')
}

/**
 * 字段 key 收窄到 Java 标识符允许的字符集（与 `sanitizeField` 一致）。
 * 收窄后为空说明模型编了个不能用的 key，直接丢掉。
 */
function fieldKey(value: unknown): string {
  return str(value).replace(/[^A-Za-z0-9_]/g, '').slice(0, 32)
}

function parseItem(raw: unknown, warnings: string[]): AiItem | null {
  if (!isRecord(raw)) return null
  const kind = str(raw.kind).toLowerCase()

  if (kind === 'text') {
    const text = Array.from(str(raw.text) ?? '')
      .slice(0, AI_MAX_TEXT_CHARS)
      .join('')
    if (text.trim() === '') return null
    return {
      kind: 'text',
      text,
      x: coord(raw.x),
      y: coord(raw.y),
      sizePct: ratio(raw.sizePct),
      align: H_ALIGNS.find(item => item === str(raw.align).toLowerCase()),
      valign: V_ALIGNS.find(item => item === str(raw.valign).toLowerCase()),
      color: colorName(raw.color),
      font: font(raw.font),
      bold: raw.bold === true,
    }
  }

  if (kind === 'texture' || kind === 'logo' || kind === 'image') {
    const texture = str(raw.texture) || str(raw.file) || str(raw.path)
    if (texture === '') {
      warnings.push('有一个贴图元素没给文件名，已忽略')
      return null
    }
    return {
      kind: 'texture',
      texture,
      x: coord(raw.x),
      y: coord(raw.y),
      sizePct: ratio(raw.sizePct),
    }
  }

  if (kind === 'rect' || kind === 'block') {
    const widthPct = ratio(raw.widthPct) ?? 0.5
    const heightPct = ratio(raw.heightPct) ?? 0.05
    return {
      kind: 'rect',
      x: coord(raw.x),
      y: coord(raw.y),
      widthPct,
      heightPct,
      color: colorName(raw.color),
    }
  }

  warnings.push(`不认识的元素类型「${kind || '空'}」，已忽略`)
  return null
}

/** 一批元素（单个变体的 items） */
function parseItems(rawItems: unknown[], warnings: string[], where: string): AiItem[] {
  const items: AiItem[] = []
  for (const rawItem of rawItems) {
    const item = parseItem(rawItem, warnings)
    if (item) items.push(item)
    if (items.length >= AI_MAX_ITEMS) {
      warnings.push(`${where}的元素超过 ${AI_MAX_ITEMS} 个，多余的已丢弃`)
      break
    }
  }
  if (rawItems.length > 0 && items.length === 0) {
    warnings.push(`${where}没有一个合法元素`)
  }
  return items
}

/** 注册名：只留小写字母数字下划线 */
function registryIdOf(value: unknown): string {
  return str(value)
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '')
    .slice(0, 48)
}

/**
 * 把模型返回的任意 JSON 收敛成 `AiSpec`。
 *
 * 宽容策略：能修的修（字符串数字、多余字段、越界坐标），修不了就丢，
 * 并在 `warnings` 里留一句人话，用户能看到 AI 到底哪一步没按 schema 来。
 * **绝不抛异常** —— 上层拿到所有变体都没元素时再决定要不要让模型重试。
 *
 * 变体容错：
 * - 给了 `variants` → 逐个解析，跳过空变体；
 * - 只给了顶层 `items`（单状态老写法）→ 包成一个变体；
 * - 两者都给 → 以 `variants` 为准，`items` 只用来兜底。
 */
export function parseAiSpec(raw: unknown): ParsedSpec {
  const warnings: string[] = []
  const root = isRecord(raw) ? raw : {}
  if (!isRecord(raw)) warnings.push('模型返回的不是 JSON 对象')

  // 兼容 `{ "sign": { ... } }` / `{ "spec": { ... } }` 这类多包一层的情况
  const nested = isRecord(root.sign) ? root.sign : isRecord(root.spec) ? root.spec : null
  const body = nested ?? root

  const rawVariants = Array.isArray(body.variants) ? body.variants : []
  const variants: AiVariantSpec[] = []
  for (let index = 0; index < rawVariants.length; index += 1) {
    if (variants.length >= AI_MAX_VARIANTS) {
      warnings.push(`变体超过 ${AI_MAX_VARIANTS} 个，多余的已丢弃`)
      break
    }
    const rawVariant = rawVariants[index]
    if (!isRecord(rawVariant)) continue
    const rawItems = Array.isArray(rawVariant.items) ? rawVariant.items : []
    const items = parseItems(rawItems, warnings, `变体 ${index + 1} `)
    if (items.length === 0) {
      warnings.push(`变体 ${index + 1} 没有可用元素，已跳过`)
      continue
    }
    variants.push({
      registryId: registryIdOf(rawVariant.registryId) || undefined,
      nameZh: label(rawVariant.nameZh) ?? label(rawVariant.displayNameZh),
      items,
    })
  }

  if (variants.length === 0) {
    const rawItems = Array.isArray(body.items) ? body.items : []
    const items = parseItems(rawItems, warnings, '')
    if (items.length > 0) variants.push({ items })
  }

  const items = variants[0]?.items ?? []

  const rawFields = Array.isArray(body.fields) ? body.fields : []
  const fields: AiFieldSpec[] = []
  const seen = new Set<string>()
  for (const rawField of rawFields) {
    if (!isRecord(rawField)) continue
    const key = fieldKey(rawField.key)
    if (key === '') {
      warnings.push('有一个字段的 key 含非法字符，已忽略')
      continue
    }
    if (seen.has(key)) continue
    seen.add(key)
    fields.push({
      key,
      label: label(rawField.label),
      default: str(rawField.default) || undefined,
    })
  }

  const aspect = num(body.aspect)

  return {
    spec: {
      note: str(body.note),
      displayNameZh: label(body.displayNameZh),
      aspect: aspect !== undefined && aspect > 0 ? Math.min(8, Math.max(0.15, aspect)) : undefined,
      baseplate: baseplateId(body.baseplate),
      variants,
      items,
      fields,
    },
    warnings,
  }
}
