/**
 * 版面工程模型：默认值、序列化、持久化。
 *
 * 一个 LayoutProject 描述一块标牌的版面：牌面尺寸（bit）+ 元素表 + 数据字段 + 生成选项。
 */

import type {
  AbcFont,
  LayoutAlignment,
  LayoutAsset,
  LayoutBaseplate,
  LayoutElement,
  LayoutElementKind,
  LayoutField,
  LayoutLogoElement,
  LayoutOptions,
  LayoutProject,
  LayoutRectElement,
  LayoutReference,
  LayoutTextElement,
  VariantOverrideValue,
} from './layout-model'
import {
  BASEPLATE_PRESETS, DEFAULT_ABC_FONT, LINE_FONT_OPTIONS, VALID_ABC_FONTS,
} from './layout-model'
import {
  modFieldName, optionGroupFor,
} from './dynamic-textures'
import {
  extractPlaceholderKeys,
} from './text'
import { OVERRIDABLE_FIELDS } from './variant'

export const STORAGE_KEY = 'sign-generator.layout.project.v2'

/** 各安装类型的默认文本平面 Z 偏移（方块单位），取自模组参考渲染器 */
export const DEFAULT_Z_OFFSET: Record<'NORMAL' | 'POLE_H' | 'POLE_L', number> = {
  NORMAL: -0.45,
  POLE_H: -0.81,
  POLE_L: -0.74,
}

export const DEFAULT_SETTINGS
  = 'VersionServices.blocks().copyProperties(VanillaBlocks.CYAN_TERRACOTTA).noOcclusion().requiresCorrectToolForDrops()'

/** 常用颜色 */
export const WHITE = 0xFFFFFF
export const GREEN = 0x2D9B47
export const BLACK = 0x000000

export const ALIGNMENT_OPTIONS: { value: LayoutAlignment; label: string }[] = [
  { value: 'CENTER_CENTER', label: '居中' },
  { value: 'LEFT_CENTER', label: '左对齐 · 垂直居中' },
  { value: 'RIGHT_CENTER', label: '右对齐 · 垂直居中' },
  { value: 'CENTER_TOP', label: '居中 · 上对齐' },
  { value: 'CENTER_BOTTOM', label: '居中 · 下对齐' },
  { value: 'LEFT_TOP', label: '左上' },
  { value: 'LEFT_BOTTOM', label: '左下' },
  { value: 'RIGHT_TOP', label: '右上' },
  { value: 'RIGHT_BOTTOM', label: '右下' },
]

/** 括号内字体选项（唯一来源在 layout-model.ts 的 LINE_FONT_OPTIONS） */
export const FONT_OPTIONS: { value: AbcFont, label: string }[]
  = LINE_FONT_OPTIONS.map(item => ({ value: item.value, label: item.label }))

let idCounter = 0

/** 生成稳定唯一 id（不依赖 crypto，SSR 与客户端都能跑） */
export function createLayoutId(prefix: string): string {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`
}

// ==================== 元素工厂 ====================

export function createTextElement(overrides: Partial<LayoutTextElement> = {}): LayoutTextElement {
  return {
    id: createLayoutId('text'),
    kind: 'text',
    name: '文本',
    x: 0,
    y: 0,
    visible: true,
    text: '新建文本',
    scale: 0.03,
    color: WHITE,
    abcFont: DEFAULT_ABC_FONT,
    alignment: 'CENTER_CENTER',
    bold: false,
    italic: false,
    underline: false,
    shadow: false,
    outline: false,
    outlineColor: BLACK,
    glowing: false,
    zDelta: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    ...overrides,
  }
}

/** 新建贴图元素的默认路径：必须是**真实存在**的动态模板，占位符 key 也要对得上 */
export const DEFAULT_LOGO_PATH = 'yunbeiuc:textures/block/sign/sign_expressway_{logo1}.png'

export function createLogoElement(overrides: Partial<LayoutLogoElement> = {}): LayoutLogoElement {
  return {
    id: createLayoutId('logo'),
    kind: 'logo',
    name: '贴图',
    x: 0,
    y: 0,
    visible: true,
    path: DEFAULT_LOGO_PATH,
    size: 0.65,
    rotZ: 0,
    ...overrides,
  }
}

export function createRectElement(overrides: Partial<LayoutRectElement> = {}): LayoutRectElement {
  return {
    id: createLayoutId('rect'),
    kind: 'rect',
    name: '色块',
    x: 0,
    y: 0,
    visible: true,
    width: 8,
    height: 4,
    color: WHITE,
    ...overrides,
  }
}

export function createField(overrides: Partial<LayoutField> = {}): LayoutField {
  return {
    id: createLayoutId('field'),
    key: 'text1',
    // 留空 = 与占位符 key 同名（模组惯例）
    nbtKey: '',
    label: '文本',
    type: 'string',
    defaultValue: '',
    options: [],
    ...overrides,
  }
}

export function createOptions(): LayoutOptions {
  return {
    modId: 'yunbeiuc',
    packageName: 'com.beigu.yunbeiuc',
    className: 'SignCustom01',
    displayNameZh: '自定义标牌',
    displayNameEn: 'Custom Sign',
    tooltipKey: 'block.yunbeiuc.sign_text.tooltip',
    blockSettings: DEFAULT_SETTINGS,
    category: 'sign',
    variants: [
      {
        id: createLayoutId('variant'),
        registryId: 'sign_custom_01',
        displayNameZh: '自定义标牌',
        displayNameEn: 'Custom Sign',
      },
    ],
    zOffset: {
      ...DEFAULT_Z_OFFSET,
    },
    glowingText: false,
    emitEnUs: true,
  }
}

// ==================== 工程 ====================

/**
 * 新建工程。
 *
 * 尺寸单位 bit（1 bit = 1/16 方块）；不做任何「往里塞元素」的默认动作，
 * 交给用户在画布上自己摆。
 */
export function createLayoutProject(width = 32, height = 20): LayoutProject {
  return {
    version: 2,
    width: clampSize(width),
    height: clampSize(height),
    baseplate: createBaseplate(),
    options: createOptions(),
    elements: [],
    fields: [],
    assets: [],
    reference: null,
  }
}

/** 参考图默认值：半透明、等比放进牌面 */
export function createReference(overrides: Partial<LayoutReference> = {}): LayoutReference {
  return {
    dataUrl: '',
    name: '参考图',
    opacity: 0.5,
    visible: true,
    fit: 'contain',
    ...overrides,
  }
}

/**
 * 预览底色：默认关闭，**只影响画布，不参与代码生成**。
 *
 * 以前它会在实体里铺一条 `-rect <宽> <高>`；现在这条已经删掉 ——
 * 牌面底色由方块模型提供。画布上打开它只是为了判断字色对比，
 * 真要在游戏里铺纯色请放一个**色块元素**（`rect`）。
 */
export function createBaseplate(overrides: Partial<LayoutBaseplate> = {}): LayoutBaseplate {
  const preset = BASEPLATE_PRESETS[0]
  return {
    color: preset.color,
    visible: false,
    ...overrides,
  }
}

/** 牌面尺寸下限 1 bit、上限 128 bit（8 方块），避免画布不可用 */
export function clampSize(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 16
  return Math.min(128, Math.max(1, Math.round(value)))
}

/**
 * 给一条路径里出现的占位符补齐 / 修正字段（纯函数，不动元素）。
 *
 * 贴图路径里的 `{logo1}` 必须有同名字段，**而且字段默认值不能是空串** ——
 * 否则生成的实体里是 `private String logo1 = "";`，运行时把占位符替换成空，
 * 拼出 `sign_expressway_.png` 这种不存在的贴图；模组找不到图就会把这行原文
 * （`-texture yunbeiuc:...`）直接画在牌面上。
 *
 * 三件事：
 * 1. 缺字段 → 按 `dynamic-textures.ts` 的选项组补一个 enum 字段（默认值取组默认值）；
 * 2. 字段存在但默认值为空 → 用组默认值填上；
 * 3. enum 字段的默认值不在选项里 → 退回第一个选项。
 */
export function ensureFieldsForPath(
  path: string,
  current: LayoutField[],
  elementName = '元素',
): { fields: LayoutField[], warnings: string[] } {
  const warnings: string[] = []
  const fields: LayoutField[] = [...current]

  for (const key of extractPlaceholderKeys(path)) {
    const index = fields.findIndex(field => field.key === key)
    const group = optionGroupFor(path, key)

    if (index < 0) {
      if (!group) {
        warnings.push(`「${elementName}」的占位符 {${key}} 没有对应字段，游戏里会原样显示这行原文`)
        continue
      }
      const modField = modFieldName(group, key)
      fields.push(createField({
        key,
        nbtKey: modField === key ? '' : modField,
        label: group.title,
        type: 'enum',
        defaultValue: group.default,
        options: group.options.map(option => ({ ...option })),
      }))
      warnings.push(`已补上字段 ${key}（默认 ${group.default}）`)
      continue
    }

    const field = fields[index]
    const options = Array.isArray(field.options) ? field.options : []
    const value = typeof field.defaultValue === 'string' ? field.defaultValue.trim() : ''
    const inOptions = options.some(option => option.value === value)
    // 有值、且（没有选项约束 或 落在选项里）→ 不用动
    if (value !== '' && (options.length === 0 || inOptions)) continue

    const fallback = group?.default ?? options[0]?.value ?? ''
    if (fallback === '') {
      warnings.push(`字段 ${key} 没有可用默认值，「${elementName}」的贴图路径会拼出空段`)
      continue
    }
    fields[index] = { ...field, defaultValue: fallback }
    warnings.push(`字段 ${key} 的默认值已修正为 ${fallback}`)
  }

  return { fields, warnings }
}

/**
 * 生成前的占位符自检 / 自愈：把工程里所有可见元素的路径都过一遍
 * `ensureFieldsForPath`，只改字段、不动元素路径。
 */
export function repairPlaceholders(
  project: LayoutProject,
): { project: LayoutProject, warnings: string[] } {
  const original = Array.isArray(project.fields) ? project.fields : []
  let fields: LayoutField[] = [...original]
  const warnings: string[] = []

  for (const element of Array.isArray(project.elements) ? project.elements : []) {
    if (element.visible === false) continue
    const path = element.kind === 'logo'
      ? element.path
      : element.kind === 'text' ? element.text : ''
    if (!path) continue
    const repaired = ensureFieldsForPath(path, fields, element.name)
    fields = repaired.fields
    warnings.push(...repaired.warnings)
  }

  const changed = fields.length !== original.length
    || fields.some((field, index) => field.defaultValue !== original[index]?.defaultValue)
  return {
    project: changed ? { ...project, fields } : project,
    warnings,
  }
}

// ==================== 序列化 ====================

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

const VALID_ALIGNMENTS: readonly string[] = [
  'LEFT_TOP', 'LEFT_CENTER', 'LEFT_BOTTOM',
  'CENTER_TOP', 'CENTER_CENTER', 'CENTER_BOTTOM',
  'RIGHT_TOP', 'RIGHT_CENTER', 'RIGHT_BOTTOM',
]

/** 旧存档 / 外部数据消毒：任何非法字段都退回安全默认值，绝不抛异常 */
export function sanitizeProject(raw: unknown): LayoutProject | null {
  if (!isPlainRecord(raw)) return null
  const base = createLayoutProject(num(raw.width, 32), num(raw.height, 20))

  const rawOptions = isPlainRecord(raw.options) ? raw.options : {}
  const options: LayoutOptions = {
    ...base.options,
    modId: str(rawOptions.modId, base.options.modId),
    packageName: str(rawOptions.packageName, base.options.packageName),
    className: str(rawOptions.className, base.options.className),
    displayNameZh: str(rawOptions.displayNameZh, base.options.displayNameZh),
    displayNameEn: str(rawOptions.displayNameEn, base.options.displayNameEn),
    tooltipKey: str(rawOptions.tooltipKey, base.options.tooltipKey),
    blockSettings: str(rawOptions.blockSettings, base.options.blockSettings),
    category: rawOptions.category === 'municipal' ? 'municipal' : 'sign',
    glowingText: bool(rawOptions.glowingText, false),
    emitEnUs: bool(rawOptions.emitEnUs, true),
  }
  if (Array.isArray(rawOptions.variants)) {
    const variants = rawOptions.variants
      .filter(isPlainRecord)
      .map(variant => ({
        id: str(variant.id, createLayoutId('variant')),
        registryId: str(variant.registryId, 'sign_custom'),
        displayNameZh: str(variant.displayNameZh, '自定义标牌'),
        displayNameEn: str(variant.displayNameEn, 'Custom Sign'),
      }))
      .filter(variant => variant.registryId.trim() !== '')
    if (variants.length > 0) options.variants = variants
  }
  const rawZ = isPlainRecord(rawOptions.zOffset) ? rawOptions.zOffset : {}
  options.zOffset = {
    NORMAL: num(rawZ.NORMAL, DEFAULT_Z_OFFSET.NORMAL),
    POLE_H: num(rawZ.POLE_H, DEFAULT_Z_OFFSET.POLE_H),
    POLE_L: num(rawZ.POLE_L, DEFAULT_Z_OFFSET.POLE_L),
  }

  const elements = Array.isArray(raw.elements)
    ? raw.elements
      .filter(isPlainRecord)
      .map(sanitizeElement)
      .filter((element): element is LayoutElement => element !== null)
    : []

  const fields = Array.isArray(raw.fields)
    ? raw.fields
      .filter(isPlainRecord)
      .map(sanitizeField)
      .filter((field): field is LayoutField => field !== null)
    : []

  const rawBaseplate = isPlainRecord(raw.baseplate) ? raw.baseplate : {}
  const baseplate: LayoutBaseplate = {
    color: num(rawBaseplate.color, base.baseplate.color),
    visible: bool(rawBaseplate.visible, base.baseplate.visible),
  }

  const assets: LayoutAsset[] = Array.isArray(raw.assets)
    ? raw.assets
      .filter(isPlainRecord)
      .map(asset => ({
        id: str(asset.id, createLayoutId('asset')),
        name: str(asset.name, '导入图片'),
        dataUrl: str(asset.dataUrl, ''),
        texturePath: str(asset.texturePath, ''),
        width: num(asset.width, 16),
        height: num(asset.height, 16),
      }))
      .filter(asset => asset.dataUrl.startsWith('data:') && asset.texturePath !== '')
    : []

  // 参考图：旧存档没有这个字段 → null；dataUrl 不是图片就整条丢掉
  const rawReference = isPlainRecord(raw.reference) ? raw.reference : null
  const referenceDataUrl = rawReference ? str(rawReference.dataUrl, '') : ''
  const reference: LayoutReference | null
    = rawReference && referenceDataUrl.startsWith('data:')
      ? {
          dataUrl: referenceDataUrl,
          name: str(rawReference.name, '参考图'),
          opacity: clamp01(num(rawReference.opacity, 0.5)),
          visible: bool(rawReference.visible, true),
          fit: rawReference.fit === 'stretch' ? 'stretch' : 'contain',
        }
      : null

  // 读盘/导入时顺手把占位符字段修一遍（幂等）：旧存档里 `logo1 = ""`
  // 会让画布与生成结果都拼出 `sign_expressway_.png`
  const { project: repaired } = repairPlaceholders({
    version: 2,
    width: base.width,
    height: base.height,
    baseplate,
    options,
    elements,
    fields,
    assets,
    reference,
  })
  return repaired
}

/** 夹到 0 ~ 1（参考图不透明度） */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function sanitizeElement(raw: Record<string, unknown>): LayoutElement | null {
  const rawKind = str(raw.kind, 'text')
  const kind: LayoutElementKind = rawKind === 'logo' ? 'logo' : rawKind === 'rect' ? 'rect' : 'text'
  const common = {
    id: str(raw.id, createLayoutId(kind)),
    name: str(raw.name, '元素'),
    x: num(raw.x, 0),
    y: num(raw.y, 0),
    visible: bool(raw.visible, true),
  }
  // 变体覆盖：只留白名单字段 + 标量值，其余字段整组丢掉
  const variantOverrides = sanitizeVariantOverrides(raw.variantOverrides, kind)
  const withOverrides = <T extends LayoutElement>(element: T): T => (
    variantOverrides ? { ...element, variantOverrides } : element
  )
  if (kind === 'logo') {
    return withOverrides({
      ...common,
      kind: 'logo',
      path: str(raw.path, DEFAULT_LOGO_PATH),
      size: num(raw.size, 0.65),
      // 兼容旧存档：早期贴图旋转存在 rotX 里，读取时回退
      rotZ: num(raw.rotZ, num(raw.rotX, 0)),
    })
  }
  if (kind === 'rect') {
    return withOverrides({
      ...common,
      kind: 'rect',
      width: num(raw.width, 8),
      height: num(raw.height, 4),
      color: num(raw.color, WHITE),
    })
  }
  const alignment = str(raw.alignment, 'CENTER_CENTER')
  const abcFont = str(raw.abcFont, DEFAULT_ABC_FONT)
  return withOverrides({
    ...common,
    kind: 'text',
    text: str(raw.text, ''),
    scale: num(raw.scale, 0.03),
    color: num(raw.color, WHITE),
    // 模组只认交通字体 A/B/C；旧存档里的 'vanilla' / '' 一律回退默认
    abcFont: (VALID_ABC_FONTS as readonly string[]).includes(abcFont)
      ? abcFont as AbcFont
      : DEFAULT_ABC_FONT,
    alignment: (VALID_ALIGNMENTS.includes(alignment)
      ? alignment
      : 'CENTER_CENTER') as LayoutAlignment,
    bold: bool(raw.bold, false),
    italic: bool(raw.italic, false),
    underline: bool(raw.underline, false),
    shadow: bool(raw.shadow, false),
    outline: bool(raw.outline, false),
    outlineColor: num(raw.outlineColor, BLACK),
    glowing: bool(raw.glowing, false),
    zDelta: num(raw.zDelta, 0),
    rotX: num(raw.rotX, 0),
    rotY: num(raw.rotY, 0),
    rotZ: num(raw.rotZ, 0),
    scaleX: num(raw.scaleX, 1),
    scaleY: num(raw.scaleY, 1),
    scaleZ: num(raw.scaleZ, 1),
  })
}

/**
 * 变体覆盖消毒。
 *
 * 只保留「标量值 + 该 kind 的白名单字段」；某一组被清空就整组删掉。
 * 返回 null = 没有可用覆盖（不写进元素，省得每个元素都带一个空对象）。
 */
function sanitizeVariantOverrides(
  value: unknown,
  kind: LayoutElementKind,
): Record<string, Record<string, VariantOverrideValue>> | null {
  if (!isPlainRecord(value)) return null
  const allowed = new Set([...OVERRIDABLE_FIELDS[kind], 'visible'])
  const result: Record<string, Record<string, VariantOverrideValue>> = {}
  for (const [variantId, entry] of Object.entries(value)) {
    if (!isPlainRecord(entry)) continue
    const clean: Record<string, VariantOverrideValue> = {}
    for (const [field, fieldValue] of Object.entries(entry)) {
      if (!allowed.has(field)) continue
      if (typeof fieldValue === 'number' && Number.isFinite(fieldValue)) clean[field] = fieldValue
      else if (typeof fieldValue === 'string') clean[field] = fieldValue
      else if (typeof fieldValue === 'boolean') clean[field] = fieldValue
    }
    if (Object.keys(clean).length > 0) result[variantId] = clean
  }
  return Object.keys(result).length > 0 ? result : null
}

function sanitizeField(raw: Record<string, unknown>): LayoutField | null {
  // key 既是占位符名也是 Java 字段名，统一收窄到 [A-Za-z0-9_]
  const key = str(raw.key, '').trim().replace(/[^a-zA-Z0-9_]/g, '')
  if (key === '') return null
  const options = Array.isArray(raw.options)
    ? raw.options.filter(isPlainRecord).map(option => ({
      label: str(option.label, ''),
      value: str(option.value, ''),
    }))
    : []
  return {
    id: str(raw.id, createLayoutId('field')),
    key,
    // NBT 键名允许空（= 与 key 同名）；只保留 NBT 合法字符
    nbtKey: str(raw.nbtKey, '').trim().replace(/[^a-zA-Z0-9_.-]/g, ''),
    label: str(raw.label, key),
    type: raw.type === 'enum' ? 'enum' : 'string',
    defaultValue: str(raw.defaultValue, ''),
    options,
  }
}

// ==================== 校验 ====================

/** Java 类名：大写字母开头，只含字母数字下划线 */
export function isValidClassName(value: string): boolean {
  return /^[A-Z][A-Za-z0-9_]*$/.test(value.trim())
}

/** 包名：小写字母开头的点分标识符 */
export function isValidPackageName(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '') return false
  return trimmed.split('.').every(segment => /^[a-z][a-z0-9_]*$/.test(segment))
}

/** 注册名：小写字母数字下划线，且以字母开头 */
export function isValidRegistryId(value: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(value.trim())
}

/**
 * `SignCustom01` -> `sign_custom_01`
 *
 * 字母→数字之间也要断开，跟 `java.ts` 里的 `toSnakeCase` 保持一致：
 * 模组的注册名都是 `sign_custom_01` 这种带下划线的形式。
 */
export function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([A-Za-z])([0-9])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}

// ==================== 工程复制 / 跨页剪贴板 ====================

/**
 * 下一个可用的类名：`SignCustom01` → `SignCustom02`（保留数字位宽），
 * 没有尾部数字就加 `Copy`。
 */
export function nextProjectClassName(className: string): string {
  const base = typeof className === 'string' && className.trim() !== ''
    ? className.trim()
    : 'SignCustom'
  const match = /^(.*?)(\d+)$/.exec(base)
  if (match && match[1].trim() !== '') {
    const width = match[2].length
    const next = String(Number(match[2]) + 1).padStart(width, '0')
    return `${match[1]}${next}`
  }
  return `${base}Copy`
}

/**
 * 复制整份工程成**一个新项目**。
 *
 * 换掉的：类名、显示名、每个变体的 id 与注册名、元素 / 字段的 id
 * （`variantOverrides` 的键也跟着旧变体 id 重映射，否则变体覆盖会全部失效）。
 * 保留的：版面、尺寸、字段、导入的贴图、参考图。
 *
 * 这样「拿现成的一块牌子改一改」不会再覆盖原类，直接生成新方块。
 */
export function cloneProjectAsNew(
  project: LayoutProject,
  overrides: { className?: string } = {},
): LayoutProject {
  const rawClassName = typeof overrides.className === 'string' && overrides.className.trim() !== ''
    ? overrides.className.trim()
    : nextProjectClassName(project.options.className)
  const className = /^[A-Z]/.test(rawClassName) ? rawClassName : `Sign${rawClassName}`

  const variantIds = project.options.variants.map(() => createLayoutId('variant'))
  const idMap = new Map(project.options.variants.map((variant, index) => [variant.id, variantIds[index]]))

  const baseRegistry = toSnakeCase(className) || 'sign_custom'
  const usedRegistry = new Set<string>()
  const variants: LayoutProject['options']['variants'] = project.options.variants.map((variant, index) => {
    let registryId = index === 0 ? baseRegistry : `${baseRegistry}_${index + 1}`
    let suffix = 2
    while (usedRegistry.has(registryId)) {
      registryId = `${registryId}_${suffix}`
      suffix += 1
    }
    usedRegistry.add(registryId)
    const isFirst = index === 0
    return {
      id: variantIds[index],
      registryId,
      displayNameZh: isFirst ? `${variant.displayNameZh} 副本` : variant.displayNameZh,
      displayNameEn: isFirst ? `${variant.displayNameEn} Copy` : variant.displayNameEn,
    }
  })

  const elements: LayoutElement[] = project.elements.map((element) => {
    const copy: LayoutElement = {
      ...element,
      id: createLayoutId(element.kind),
    }
    const source = element.variantOverrides
    if (source && Object.keys(source).length > 0) {
      const remapped: Record<string, Record<string, VariantOverrideValue>> = {}
      for (const [oldId, patch] of Object.entries(source)) {
        const nextId = idMap.get(oldId)
        if (nextId) remapped[nextId] = { ...patch }
      }
      if (Object.keys(remapped).length > 0) copy.variantOverrides = remapped
      else delete copy.variantOverrides
    }
    else {
      delete copy.variantOverrides
    }
    return copy
  })

  const fields: LayoutField[] = project.fields.map(field => ({
    ...field,
    id: createLayoutId('field'),
    options: field.options.map(option => ({ ...option })),
  }))

  return {
    ...project,
    version: 2,
    options: {
      ...project.options,
      className,
      displayNameZh: `${project.options.displayNameZh} 副本`,
      displayNameEn: `${project.options.displayNameEn} Copy`,
      variants: variants.length > 0
        ? variants
        : [{
            id: createLayoutId('variant'),
            registryId: `${baseRegistry}_1`,
            displayNameZh: `${project.options.displayNameZh} 副本`,
            displayNameEn: `${project.options.displayNameEn} Copy`,
          }],
    },
    elements,
    fields,
  }
}

/** 跨页剪贴板里的元素消毒：非法字段回退默认值，坏数据直接丢掉 */
export function sanitizeClipboardElements(raw: unknown): LayoutElement[] {
  if (!Array.isArray(raw)) return []
  const out: LayoutElement[] = []
  for (const item of raw) {
    if (!isPlainRecord(item)) continue
    const element = sanitizeElement(item)
    if (element) out.push(element)
    if (out.length >= 64) break
  }
  return out
}

// ==================== 工程导入 / 导出 ====================

/** 导出用的文件名 */
export function projectExportFileName(project: LayoutProject): string {
  const name = project.options.className.trim() || 'sign-layout'
  return `${name}.layout.json`
}

/** 序列化（带缩进，便于 diff 与手工改） */
export function serializeProject(project: LayoutProject): string {
  return JSON.stringify(project, null, 2)
}

// ==================== localStorage ====================

export function loadProjectFromStorage(): LayoutProject | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return sanitizeProject(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveProjectToStorage(project: LayoutProject): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
  } catch {
    // 配额不足或隐私模式：静默忽略，UI 仍有内存态
  }
}

// ==================== 摘要 ====================

/** 元素列表里显示的一行摘要 */
export function elementSummary(element: LayoutElement): string {
  if (element.kind === 'text') {
    const text = element.text.trim()
    return text === '' ? '（空文本）' : text
  }
  if (element.kind === 'logo') {
    const file = element.path.split('/').pop() ?? element.path
    return file
  }
  return `${element.width} × ${element.height} bit`
}
