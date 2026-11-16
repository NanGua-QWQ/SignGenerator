/**
 * 动态贴图目录 —— 路径里的 `{占位符}` 与模组实体里的「选项组」的对应关系。
 *
 * 模组里凡是贴图路径写成 `sign_expressway_{logo1}.png` 这种形式的，运行时都会用
 * 实体的 `getPlaceholderValue` 把 `{logo1}` 换成一个**贴图文件名段**；而换什么，
 * 由实体内部的一个枚举字段决定（见各 `*Entity.java` 的 `getFieldOptions`）。
 *
 * 本文件逐条复刻这些枚举，供工坊：
 * 1. 选中动态贴图时**自动补一个 enum 字段**（选项就是这些枚举值）；
 * 2. 画布按字段值把 `{占位符}` 换成真实贴图文件名，直接显示对应 PNG。
 *
 * ⚠️ 关键约定：**选项的 `value` 就是贴图文件名段本身**。
 *
 * 工坊生成的 `getPlaceholderValue` 是**直通**的
 * （`case "logo1" -> logo1;`，不做二次映射），所以字段值必须直接能拼进路径。
 * 模组源码里 `ZonesBoardImageEntity` 那种「枚举名 red → 段名 sign_red_number_logo」
 * 的两段式映射，在工坊里统一收敛成一段：路径模板写成 `sign_{logo}.png`，
 * 选项值直接给 `red_number_logo`。两边拼出来的文件名完全一致。
 *
 * 同理 `SignGuideLaneIndicator1Entity` 的 `LEFT_TURN_AROUND` 在模组里映射成
 * `straight_left_turn_around`（`arrowTexture()`），这里直接给段名。
 *
 * 参考实现：`D:\yunbei-urban-construction\versions\common\src\main\java\com\beigu\yunbeiuc\entity`
 */

import type {
  LayoutFieldOption,
} from './layout-model'

/** 一个「选项组」= 模组里的一组 `FieldOptionGroup` */
export interface DynamicOptionGroup {
  /** 组 id（工坊内部用） */
  id: string
  /** 游戏内选项行的标题（对应 `FieldOptionGroup` 第 1 个参数） */
  title: string
  /** 面板上的说明 */
  hint: string
  options: LayoutFieldOption[]
  /** 默认选项的 value —— 保证画布一选出来就能解析成真实贴图 */
  default: string
  /**
   * 模组实体里承载这个枚举的 Java 字段名前缀。
   *
   * 完整字段名 = 前缀 + 占位符 key 末尾的数字
   * （`logo1` + `direction` → `direction1`），见 `modFieldName`。
   */
  fieldPrefix: string
  /**
   * 字段名与占位符 key 无关时（只有一个固定字段）直接写死，例如
   * `ZonesBoardImageEntity` 的 `image`。
   */
  fixedField?: string
}

/**
 * 全部选项组。
 *
 * 逐条取自模组实体的 `getFieldOptions`：
 * - 高速Logo        → SignExpresswayDirection3/5、DistanceFromLocation2/5/6、EntranceAdvance1/4/10/13、Exit8
 * - 方向            → SignExpresswayDirection5、EntranceAdvance4、Exit8
 * - 转向            → SignGuideIntersectionAdvanceWarning6/7、IntersectionWarning4
 * - 箭头            → SignGuideLaneIndicator1
 * - 普通公路Logo    → SignExpresswayDistanceFromLocation4
 * - 底色            → ZonesBoardImageEntity
 */
export const DYNAMIC_OPTION_GROUPS: readonly DynamicOptionGroup[] = [
  {
    id: 'expresswayLogo',
    title: '高速Logo',
    hint: '国家 / 省级高速公路编号盾牌，2 位数用宽版、1 位数用窄版',
    default: 'national_logo_1',
    fieldPrefix: 'logoType',
    options: [
      { label: '国家高速公路（2位数）', value: 'national_logo_1' },
      { label: '国家高速公路（1位数）', value: 'national_logo_2' },
      { label: '省级高速公路（2位数）', value: 'provincial_logo_1' },
      { label: '省级高速公路（1位数）', value: 'provincial_logo_2' },
    ],
  },
  {
    id: 'compassDirection',
    title: '方向',
    hint: '罗盘方向（SignCompassDirection），决定方向图标用哪一张',
    default: 'north',
    fieldPrefix: 'direction',
    options: [
      { label: '北（N）', value: 'north' },
      { label: '南（S）', value: 'south' },
      { label: '西（W）', value: 'west' },
      { label: '东（E）', value: 'east' },
    ],
  },
  {
    id: 'turnDirection',
    title: '转向',
    hint: '左转 / 直行 / 右转（SignTurnDirection）',
    default: 'left',
    fieldPrefix: 'direction',
    options: [
      { label: '左转', value: 'left' },
      { label: '直行', value: 'straight' },
      { label: '右转', value: 'right' },
    ],
  },
  {
    id: 'laneArrow',
    title: '箭头',
    hint: '车道导向箭头（ArrowDirection）；「掉头」在模组里对应 straight_left_turn_around 贴图',
    default: 'straight',
    fieldPrefix: 'direction',
    options: [
      { label: '左转', value: 'left_turn' },
      { label: '直行', value: 'straight' },
      { label: '右转', value: 'right_turn' },
      { label: '直行和左转', value: 'straight_left_turn' },
      { label: '直行和右转', value: 'straight_right_turn' },
      { label: '掉头', value: 'straight_left_turn_around' },
    ],
  },
  {
    id: 'ordinaryRoadLogo',
    title: '普通公路Logo',
    hint: '普通公路路名盾牌，按路名字数选 3 字 / 4 字',
    default: 'ordinary_municipal_road_logo_1',
    fieldPrefix: 'logoType',
    options: [
      { label: '普通公路（3字）', value: 'ordinary_municipal_road_logo_1' },
      { label: '普通公路（4字）', value: 'ordinary_municipal_road_logo_2' },
    ],
  },
  {
    id: 'roadLevelColor',
    title: '底色',
    hint: '告示牌底色（ZonesBoardImageEntity 的 BoardImage，字段名 image）',
    default: 'red_number_logo',
    fieldPrefix: '',
    fixedField: 'image',
    options: [
      { label: '国道', value: 'red_number_logo' },
      { label: '省道', value: 'yellow_number_logo' },
      { label: '县、乡道', value: 'white_number_logo' },
      { label: '快速路', value: 'expressway_logo' },
    ],
  },
]

const GROUP_BY_ID = new Map(DYNAMIC_OPTION_GROUPS.map(group => [group.id, group]))

/** 按 id 取选项组 */
export function optionGroupById(id: string): DynamicOptionGroup | null {
  return GROUP_BY_ID.get(id) ?? null
}

/** 一条动态贴图 = 一个文件名模板 + 它依赖的占位符 */
export interface DynamicTextureEntry {
  /** 贴图**文件名**模板（含 `{占位符}`，不含 `yunbeiuc:textures/block/sign/` 前缀） */
  file: string
  /** 图案库里的名字 */
  label: string
  /** 这条路径里的占位符 key */
  keys: string[]
  /** 这些 key 共用的选项组 id */
  group: string
}

/**
 * 全部动态贴图模板。
 *
 * 逐条来自模组实体 `ensureDefaultTextLines` 里真实出现的 `logo(...)` 路径，
 * 并已核对「模板 + 每个选项值」都能拼出一个真实存在的 PNG
 * （跑 `node scripts/verify-dynamic-textures.mjs` 复验）。
 */
export const DYNAMIC_TEXTURES: readonly DynamicTextureEntry[] = [
  { file: 'sign_expressway_{logo1}.png', label: '高速编号 Logo 1', keys: ['logo1'], group: 'expresswayLogo' },
  { file: 'sign_expressway_{logo2}.png', label: '高速编号 Logo 2', keys: ['logo2'], group: 'expresswayLogo' },
  { file: 'sign_expressway_{logo3}.png', label: '高速编号 Logo 3', keys: ['logo3'], group: 'expresswayLogo' },
  { file: 'sign_expressway_{dir1}.png', label: '高速方向图标 1', keys: ['dir1'], group: 'compassDirection' },
  { file: 'sign_expressway_{dir2}.png', label: '高速方向图标 2', keys: ['dir2'], group: 'compassDirection' },
  { file: 'sign_expressway_{direction1}.png', label: '高速方向图标（Direction5）', keys: ['direction1'], group: 'compassDirection' },
  { file: 'sign_indication_{logo1}.png', label: '指示 Logo 1（转向）', keys: ['logo1'], group: 'turnDirection' },
  { file: 'sign_indication_{logo2}.png', label: '指示 Logo 2（转向）', keys: ['logo2'], group: 'turnDirection' },
  { file: 'sign_indication_{logo3}.png', label: '指示 Logo 3（转向）', keys: ['logo3'], group: 'turnDirection' },
  { file: 'sign_guide_intersection_warning_5_{logo1}.png', label: '路口警告背景 1', keys: ['logo1'], group: 'turnDirection' },
  { file: 'sign_guide_intersection_warning_5_{logo2}.png', label: '路口警告背景 2', keys: ['logo2'], group: 'turnDirection' },
  { file: 'sign_guide_lane_arrow_{arrow1}.png', label: '车道箭头 1', keys: ['arrow1'], group: 'laneArrow' },
  { file: 'sign_guide_lane_arrow_{arrow2}.png', label: '车道箭头 2', keys: ['arrow2'], group: 'laneArrow' },
  { file: 'sign_guide_lane_arrow_{arrow3}.png', label: '车道箭头 3', keys: ['arrow3'], group: 'laneArrow' },
  { file: 'sign_guide_lane_arrow_{arrow4}.png', label: '车道箭头 4', keys: ['arrow4'], group: 'laneArrow' },
  { file: 'sign_{logo1}.png', label: '普通公路 Logo 1', keys: ['logo1'], group: 'ordinaryRoadLogo' },
  { file: 'sign_{logo2}.png', label: '普通公路 Logo 2', keys: ['logo2'], group: 'ordinaryRoadLogo' },
  { file: 'sign_{logo3}.png', label: '普通公路 Logo 3', keys: ['logo3'], group: 'ordinaryRoadLogo' },
  { file: 'sign_{logo}.png', label: '告示牌底色 Logo', keys: ['logo'], group: 'roadLevelColor' },
]

/** 路径前缀（与 `sprites.ts` 的 `SIGN_TEXTURE_PREFIX` 一致） */
const TEXTURE_PREFIX = 'yunbeiuc:textures/block/sign/'

/** 去掉命名空间前缀，只留文件名 */
export function textureFileName(path: string): string {
  const trimmed = typeof path === 'string' ? path.trim() : ''
  const withoutPrefix = trimmed.startsWith(TEXTURE_PREFIX) ? trimmed.slice(TEXTURE_PREFIX.length) : trimmed
  return withoutPrefix.split('/').pop() ?? withoutPrefix
}

/** 路径 → 条目（按**文件名**匹配，前缀有没有都行） */
export function findDynamicTexture(path: string): DynamicTextureEntry | null {
  const file = textureFileName(path)
  if (!file || !file.includes('{')) return null
  return DYNAMIC_TEXTURES.find(entry => entry.file === file) ?? null
}

/**
 * 路径 + 占位符 key → 应该用哪个选项组。
 *
 * 优先按模板命中；命中不了再按 key 兜底 ——
 * 同一个 key（比如 `logo1`）在不同牌子上含义不同，兜底只取最常用的那个。
 */
export function optionGroupFor(path: string, key: string): DynamicOptionGroup | null {
  const entry = findDynamicTexture(path)
  if (entry && entry.keys.includes(key)) return optionGroupById(entry.group)
  const fallback = DEFAULT_GROUP_BY_KEY[key]
  return fallback ? optionGroupById(fallback) : null
}

/** key 的兜底选项组（模板没命中时用） */
const DEFAULT_GROUP_BY_KEY: Record<string, string> = {
  logo: 'roadLevelColor',
  logo1: 'expresswayLogo',
  logo2: 'expresswayLogo',
  logo3: 'expresswayLogo',
  dir1: 'compassDirection',
  dir2: 'compassDirection',
  direction1: 'compassDirection',
  arrow1: 'laneArrow',
  arrow2: 'laneArrow',
  arrow3: 'laneArrow',
  arrow4: 'laneArrow',
}

/**
 * 占位符 key 在模组实体里对应的 **Java 字段名**（也就是 NBT 键名）。
 *
 * 模组里占位符名和字段名常常不一致：`{logo1}` 由 `direction1` 决定（转向牌）、
 * 由 `logoType1` 决定（高速编号牌），`{logo}` 由 `image` 决定（告示牌）。
 * 自动补字段时把这个名字填进 `LayoutField.nbtKey`，生成的实体就能直接读
 * 模组既有存档。
 */
export function modFieldName(group: DynamicOptionGroup, key: string): string {
  if (group.fixedField) return group.fixedField
  const digits = /(\d+)$/.exec(key)?.[1] ?? ''
  return `${group.fieldPrefix}${digits}`
}

/** 用一组字段值把文件名模板里的占位符换掉；缺值的占位符原样保留 */
export function resolveTextureFile(file: string, values: Record<string, string>): string {
  return file.replace(/\{([A-Za-z0-9_]+)\}/g, (match, key: string) => {
    const value = values[key]
    return value === undefined || value === '' ? match : value
  })
}

/**
 * 动态条目的**默认预览文件名** —— 用选项组的默认值把占位符填满，
 * 让图案库直接显示一张真实 PNG（而不是 `{}` 占位符）。
 */
export function defaultTextureFile(entry: DynamicTextureEntry): string | null {
  const group = optionGroupById(entry.group)
  if (!group) return null
  const values: Record<string, string> = {}
  for (const key of entry.keys) values[key] = group.default
  const file = resolveTextureFile(entry.file, values)
  return file.includes('{') ? null : file
}
