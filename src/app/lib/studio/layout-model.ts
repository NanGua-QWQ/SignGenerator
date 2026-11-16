/**
 * 标牌版面模型 —— 2D 版面设计器的类型契约。
 *
 * 单位一律是 **bit**（1 bit = 1/16 方块），与模组 `TextLineData.xOffset/yOffset`
 * 以及 `SignTextLinesHelper` 的 `andX/andY` 参数完全一致。
 *
 * 画布坐标系：原点在牌面中心，X 向右为正，Y 向上为正。
 * 这与模组渲染器的文本局部坐标系一致（`makeTextFrame` 的局部 XY 平面）。
 */

/** 版面元素类型 —— 一一对应 TextLineData 的几种形态 */
export type LayoutElementKind = 'text' | 'logo' | 'rect'

/**
 * 括号内字体（helper 第 6 个参数 / `TextLineData.abcFont`）。
 *
 * **只有 A / B / C 三种**，对应 `yunbeiuc:traf_sign_font_{a|b|c}`。
 * 这是「方块自带布局」给每一行记录的字体意图，与全局设置无关。
 *
 * ⚠️ 模组「全局设置」里的另外两个取值（**原版 uniform**、**路牌自适应**）
 * 是**全局模式**，不是每行可选项：它们都建立在行上这个 a/b/c 之上 ——
 * 原版模式忽略它、自适应模式按它取字体（见 `GlobalFontSettings.resolveFont` /
 * `SignTextLinesHelper.forceFont`）。所以这里不提供这两个选项。
 */
export type AbcFont = 'a' | 'b' | 'c'

/** 括号内字体下拉选项：仅交通字体 A / B / C */
export const LINE_FONT_OPTIONS: { value: AbcFont, label: string, hint: string }[] = [
  { value: 'a', label: '交通字体 A', hint: 'yunbeiuc:traf_sign_font_a（中文）' },
  { value: 'b', label: '交通字体 B', hint: 'yunbeiuc:traf_sign_font_b（英文 / 数字）' },
  { value: 'c', label: '交通字体 C', hint: 'yunbeiuc:traf_sign_font_c' },
]

/** 合法字体值，供消毒/生成共用 */
export const VALID_ABC_FONTS: readonly AbcFont[] = ['a', 'b', 'c']

/** 默认字体：路牌以中文为主，默认 A 型 */
export const DEFAULT_ABC_FONT: AbcFont = 'a'

/** 文本行对齐；helper 只产出 *_CENTER，其余组合需要显式 setter */
export type LayoutAlignment
  = | 'LEFT_TOP' | 'LEFT_CENTER' | 'LEFT_BOTTOM'
    | 'CENTER_TOP' | 'CENTER_CENTER' | 'CENTER_BOTTOM'
    | 'RIGHT_TOP' | 'RIGHT_CENTER' | 'RIGHT_BOTTOM'

/** 一个方块变体（同一块牌子有多个安装 / 用途形态，各自注册成独立方块） */
export interface LayoutVariant {
  id: string
  registryId: string
  displayNameZh: string
  displayNameEn: string
}

/**
 * 单个参数在某个变体下的覆盖值。
 *
 * 存成 `字段名 → 值` 的扁平结构，而不是给每种元素各写一份 `Partial<>` ——
 * 变体覆盖的字段集合本来就随 `kind` 变，扁平表 + 一张白名单最好维护。
 */
export type VariantOverrideValue = number | string | boolean

export interface LayoutElementBase {
  id: string
  /** 画布上显示的名字 */
  name: string
  /** 中心点 X（bit，牌面中心为 0，向右为正） */
  x: number
  /** 中心点 Y（bit，牌面中心为 0，向上为正） */
  y: number
  /** 图层顺序：数组下标即 lines.add 顺序，先加的在下层 */
  visible: boolean
  /**
   * 按方块变体覆盖的参数：`variantId → { 字段名 → 值 }`。
   *
   * 只记录「与被覆盖的元素不同的字段」没有意义 —— 面板要显示完整的一套值，
   * 所以打开一个变体覆盖时会把当时的基础值全部种进去，之后改哪个写哪个。
   * `undefined` / 空对象 = 该变体没有覆盖。
   */
  variantOverrides?: Record<string, Record<string, VariantOverrideValue>>
}

/** 文本元素 → SignTextLinesHelper.centered / centeredWithZ / left / right */
export interface LayoutTextElement extends LayoutElementBase {
  kind: 'text'
  text: string
  /**
   * `scale`，即 helper 的第 4 个参数。
   * 源码换算：fontSize = scale * 20f。常见值 0.03（小字）… 0.06（大字）。
   */
  scale: number
  color: number
  /** 括号内字体（helper 第 6 个参数）：交通字体 A / B / C */
  abcFont: AbcFont
  alignment: LayoutAlignment
  bold: boolean
  italic: boolean
  underline: boolean
  shadow: boolean
  outline: boolean
  outlineColor: number
  glowing: boolean
  /** 方块单位的 Z 微调（helper 的 zOffsetDelta）；非 0 时生成 centeredWithZ */
  zDelta: number
  /** 旋转（度）——非 0 时无法用 helper，展开为显式 setter */
  rotX: number
  rotY: number
  rotZ: number
  /** 额外缩放——非 1 时无法用 helper，展开为显式 setter */
  scaleX: number
  scaleY: number
  scaleZ: number
}

/**
 * 贴图元素 → SignTextLinesHelper.logo(path, x, y, size[, rotZ])。
 *
 * `size` 即 helper 第 4 参数，源码换算 fontSize = size / 0.4f；
 * `rotZ` 是第 5 参数（Z 轴旋转，单位**度**），模组里直接写进行的 `rotZ`
 * 字段、随 NBT 持久化，渲染贴图时由 `applyRotation` 应用，
 * 与文本行共用同一套旋转机制。
 * 为 0 时走 4 参数重载，生成的代码更干净。
 */
export interface LayoutLogoElement extends LayoutElementBase {
  kind: 'logo'
  /** 贴图路径，可含 {占位符}，例如 yunbeiuc:textures/block/sign/sign_expressway_{logo1}.png */
  path: string
  /** helper 的 size 参数，常见 0.4（方向图标）/ 0.65 ~ 0.85（高速 Logo） */
  size: number
  /** Z 轴旋转（度）—— helper 第 5 参数；0 = 不旋转 */
  rotZ: number
}

/** 色块元素 → `-rect` 指令行 */
export interface LayoutRectElement extends LayoutElementBase {
  kind: 'rect'
  /** 宽（bit），对应 -rect 的第 1 个参数 */
  width: number
  /** 高（bit），对应 -rect 的第 2 个参数 */
  height: number
  color: number
}

export type LayoutElement = LayoutTextElement | LayoutLogoElement | LayoutRectElement

// ==================== 数据字段（占位符） ====================

/**
 * 实体的可编辑字段。
 *
 * `{key}` 在文本/贴图路径里做占位符，生成实体的 `getPlaceholderValue`；
 * `enum` 类型额外生成 `getFieldOptions` 选项行与 `applyFieldOption`。
 */
export interface LayoutFieldOption {
  label: string
  value: string
}

export interface LayoutField {
  id: string
  /** 占位符 key，例如 text1 / logoType1 / arrow1（元素里写 `{key}`） */
  key: string
  /**
   * NBT 键名 —— 生成 `nbt.putString("<nbtKey>", this.<javaField>)` 与
   * `NbtCompat.getString(nbt, "<nbtKey>")`（读走版本兼容的 `NbtCompat`，
   * 跨 MC 版本才编得过）。
   *
   * 模组惯例是**与占位符 key 同名**（例如 `putString("text1", this.text1)`），
   * 所以留空即等于 `key`。需要沿用别的存档键名时（老方块实体、兼容旧存档）在这里改。
   */
  nbtKey: string
  label: string
  type: 'string' | 'enum'
  defaultValue: string
  options: LayoutFieldOption[]
}

/**
 * 字段实际写进 NBT 用的键名。
 *
 * `nbtKey` 为空时回退占位符 `key` —— 模组惯例两者同名
 * （`nbt.putString("text1", this.text1)`），所以默认不需要填。
 */
export function fieldNbtKey(field: Pick<LayoutField, 'key' | 'nbtKey'>): string {
  const nbtKey = typeof field.nbtKey === 'string' ? field.nbtKey.trim() : ''
  return nbtKey !== '' ? nbtKey : field.key
}

// ==================== 工程 ====================

/** 生成选项 —— 与模组注册代码一一对应 */
export interface LayoutOptions {
  modId: string
  packageName: string
  className: string
  displayNameZh: string
  displayNameEn: string
  tooltipKey: string
  blockSettings: string
  category: 'sign' | 'municipal'
  /** 方块变体：一个 = 一个注册方块；`getTextLines()` 会按注册名分流出各自的版面 */
  variants: LayoutVariant[]
  /** 三种安装类型的文本平面 Z 偏移（方块单位） */
  zOffset: { NORMAL: number; POLE_H: number; POLE_L: number }
  glowingText: boolean
  emitEnUs: boolean
}

export interface LayoutProject {
  version: 2
  /** 牌面宽（bit） */
  width: number
  /** 牌面高（bit） */
  height: number
  /**
   * 道路等级底色 —— **只是画布预览，不参与代码生成**（详见 `LayoutBaseplate`）。
   *
   * 中国道路标志按等级使用固定基色：高速绿、国道红、省道黄、一般道路蓝、旅游棕。
   * 生成的实体里没有这一层，牌面底色由方块模型提供。
   */
  baseplate: LayoutBaseplate
  options: LayoutOptions
  elements: LayoutElement[]
  fields: LayoutField[]
  /**
   * 用户导入的图片资源。
   *
   * 画布/图案库显示真实图片的两条路：
   * 1. 内置贴图 → 模组素材 PNG 已拷到 `public/textures/sign/`，直接 `<img>`（见 `./texture-catalog`）；
   * 2. 用户导入 PNG → 存进这里，画布渲染真实位图，生成时写进模组资源目录。
   */
  assets: LayoutAsset[]
  /**
   * 参考图 —— 铺在**网格上方、元素下方**的一张半透明底图，用来对着描版面。
   *
   * ⚠️ 纯工坊产物：**不参与代码生成**，也不会写进模组工程。
   */
  reference: LayoutReference | null
}

/**
 * 参考图（描图底图）。
 *
 * 与 `LayoutAsset` 的区别：asset 是「要写进模组的贴图」，reference 只是
 * 画布上的一张对照图 —— 可以调透明度、可以随时关掉，生成时完全忽略。
 */
export interface LayoutReference {
  /** 图片数据 URL（`data:image/png;base64,…`） */
  dataUrl: string
  /** 原文件名（可读） */
  name: string
  /** 不透明度 0 ~ 1 */
  opacity: number
  /** 是否显示 */
  visible: boolean
  /**
   * 适配方式：
   * - `stretch` 拉伸铺满牌面（适合整张牌面的实拍/截图）
   * - `contain` 等比缩放完整放进牌面（居中，不裁切）
   */
  fit: 'stretch' | 'contain'
}

/** 用户导入的图片资源 */
export interface LayoutAsset {
  id: string
  /** 原文件名（可读） */
  name: string
  /** 数据 URL（`data:image/png;base64,…`），仅用于工坊预览 */
  dataUrl: string
  /** 生成时写入模组的资源路径，例如 `yunbeiuc:textures/block/sign/my_logo.png` */
  texturePath: string
  /** 图片像素尺寸（预览与比例参考） */
  width: number
  height: number
}

/**
 * 道路等级底色 —— **只用于画布预览，不参与代码生成**。
 *
 * 中国道路标志按等级使用固定基色（GB 5768）：高速绿、国道红、省道黄、
 * 一般道路蓝、旅游棕、施工橙。画布把它铺在元素下方，用来判断白字 / 黑字
 * 压不压得住底。
 *
 * ⚠️ 生成的实体里**没有**这一层 `-rect`：牌面底色由方块模型
 * （Blockbench 里的牌面贴图）决定。真要在游戏里铺一块纯色，
 * 请在版面里放一个**色块元素**（`rect`）—— 那条照旧会生成。
 */
export interface LayoutBaseplate {
  /** 预览基色（0xRRGGBB，不进生成） */
  color: number
  /** 是否在画布上显示这层预览底色 */
  visible: boolean
}

/** 道路等级基色预设（GB 5768 配色） */
export interface BaseplatePreset {
  id: string
  label: string
  color: number
  hint: string
}

export const BASEPLATE_PRESETS: readonly BaseplatePreset[] = [
  {
    id: 'expressway',
    label: '高速公路',
    color: 0x00703C,
    hint: '绿地白字',
  },
  {
    id: 'national',
    label: '国道',
    color: 0xC8102E,
    hint: '红底白字',
  },
  {
    id: 'provincial',
    label: '省道',
    color: 0xF2C300,
    hint: '黄底黑字',
  },
  {
    id: 'municipal',
    label: '城市／一般道路',
    color: 0x0055A4,
    hint: '蓝底白字',
  },
  {
    id: 'tourist',
    label: '旅游区',
    color: 0x6B4A2B,
    hint: '棕底白字',
  },
  {
    id: 'construction',
    label: '施工／警告',
    color: 0xF07C00,
    hint: '橙底黑字',
  },
  {
    id: 'plain',
    label: '无底色（透明）',
    color: 0x000000,
    hint: '不铺色块',
  },
]
