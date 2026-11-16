/**
 * 版面文本度量与画布几何。
 *
 * 单位换算（全部对齐 `SignTextLinesHelper` 与 `TextLineData`）：
 *
 * | 概念 | 换算式 |
 * | --- | --- |
 * | 文本元素 `scale` | helper 第 4 参数；源码内 `fontSize = scale * 20f` |
 * | 贴图元素 `size` | helper 第 4 参数；源码内 `fontSize = size / 0.4f` |
 * | 文本字形大小 | 模型空间每文本像素 = `0.8 * fontSize`（1/16 方块单位） |
 * | 贴图边长 | `0.4 * fontSize`（1/16 方块单位） |
 * | 色块尺寸 | `w * fontSize` × `h * fontSize`（1/16 方块单位） |
 * | Z 微调 | `zOffset = zDelta * 16f` |
 *
 * 因此画布上「元素的 bit 尺寸」可以直接算出来，不需要额外缩放系数。
 */

import {
  DEFAULT_ABC_FONT, VALID_ABC_FONTS,
} from './layout-model'
import {
  CJK_ADVANCES, CJK_DEFAULT_ADVANCE, CJK_FONT, CJK_PROVIDER,
  LATIN_ADVANCES, LATIN_CODEPOINTS, LATIN_FONT, LATIN_PROVIDERS,
} from './font-metrics'

import type {
  AbcFont, LayoutAlignment, LayoutElement, LayoutLogoElement, LayoutRectElement, LayoutTextElement,
} from './layout-model'

/** Minecraft 行高（文本像素）。对齐、包围盒都按它算 */
export const MC_FONT_HEIGHT = 9

/**
 * 码位 → `LATIN_CODEPOINTS` 下标（交通字体共 186 个码位）。
 *
 * ⚠️ 这里**不能**再用 Minecraft 原版 ASCII 宽度表（`1`=6、`i`=2、`M`=6）：
 * 模组用的是 TTF，真实推进宽度完全不同（re2014a：`1`=3.37、`i`=3.59、`M`=7.26）。
 * 用原版表算出来的行宽是错的，居中位置自然跟游戏里对不上。
 */
const LATIN_INDEX = new Map<number, number>()
LATIN_CODEPOINTS.forEach((codepoint, index) => LATIN_INDEX.set(codepoint, index))

/** 交通字体 json 的 `skip` 覆盖的三段：这些字符走中文 provider */
function isCjkCodePoint(codepoint: number): boolean {
  return (codepoint >= 0x4E00 && codepoint <= 0x9FFF)
    || (codepoint >= 0x3000 && codepoint <= 0x303F)
    || (codepoint >= 0xFF00 && codepoint <= 0xFFEF)
}

/**
 * 一个字符在牌面上的排版参数（单位都是**文本像素**）。
 *
 * 推导自模组 font json 的 provider：
 * - `size` 是 em 盒高（交通字体 10.5、中文 10）；
 * - MC 的 `pointScale = size / (ascent - descent)`，所以 CSS 的 em 要换算成
 *   `size * unitsPerEm / (ascent - descent)` —— 交通字体 upem 恰好等于 ascent-descent，
 *   于是就是 10.5；MiSans 是 1326 vs 1000，算出来 7.54，直接写 10 会大 33%；
 * - `shift` 是把 em 盒往上顶，让底部贴住 9px 行底，所以基线 = `ascent - shift`。
 */
export interface CharMetric {
  /** 推进宽度（文本像素） */
  advance: number
  /** CSS `font-size` 用的 em（文本像素） */
  em: number
  /** 基线距行顶（文本像素） */
  baseline: number
  /** 是否由交通字体渲染（false = 中文兜底 MiSans） */
  latin: boolean
}

const LATIN_EM = LATIN_PROVIDERS.a.size * (LATIN_FONT.unitsPerEm / (LATIN_FONT.ascent - LATIN_FONT.descent))
const LATIN_ASCENT = (LATIN_FONT.ascent / LATIN_FONT.unitsPerEm) * LATIN_EM
const CJK_EM = CJK_PROVIDER.size * (CJK_FONT.unitsPerEm / (CJK_FONT.ascent - CJK_FONT.descent))
const CJK_ASCENT = (CJK_FONT.ascent / CJK_FONT.unitsPerEm) * CJK_EM

const charMetricCache = new Map<string, CharMetric>()

/** 单个字符的排版参数（带缓存） */
export function charMetric(char: string, abcFont: AbcFont = DEFAULT_ABC_FONT): CharMetric {
  const font = normalizeAbcFont(abcFont)
  const codepoint = char.codePointAt(0) ?? 0
  const cacheKey = `${font}:${codepoint}`
  const cached = charMetricCache.get(cacheKey)
  if (cached) return cached

  let metric: CharMetric | null = null
  if (!isCjkCodePoint(codepoint)) {
    const index = LATIN_INDEX.get(codepoint)
    const units = index === undefined ? -1 : LATIN_ADVANCES[font][index]
    // -1 = 这套字体没有这个字（如 rg2014c 缺 ²³¹），跟游戏一样回退中文 provider
    if (units >= 0) {
      metric = {
        advance: (units / LATIN_FONT.unitsPerEm) * LATIN_EM,
        em: LATIN_EM,
        baseline: LATIN_ASCENT - LATIN_PROVIDERS[font].shiftY,
        latin: true,
      }
    }
  }
  if (!metric) {
    const units = CJK_ADVANCES[codepoint] ?? CJK_DEFAULT_ADVANCE
    metric = {
      advance: (units / CJK_FONT.unitsPerEm) * CJK_EM,
      em: CJK_EM,
      baseline: CJK_ASCENT - CJK_PROVIDER.shiftY,
      latin: false,
    }
  }

  charMetricCache.set(cacheKey, metric)
  return metric
}

/** 单个字符的推进宽度（文本像素，未取整） */
export function charAdvance(char: string, abcFont: AbcFont = DEFAULT_ABC_FONT): number {
  return charMetric(char, abcFont).advance
}

/**
 * 整行推进量之和（文本像素，**保留小数**）。
 *
 * 逐字定位必须用这个值：MC 的 `Font` 累加的是 `GlyphInfo#getAdvance()` 的 float，
 * 一旦取整，后面每个字都会累积误差。
 */
export function sumAdvance(text: string, abcFont: AbcFont = DEFAULT_ABC_FONT): number {
  let width = 0
  for (const char of Array.from(text)) width += charAdvance(char, abcFont)
  return width
}

/**
 * 按真实字体度量计算文本宽度（单位：文本像素）。
 *
 * ⚠️ 这里是**向上取整**的，不是随手 round：模组渲染器里
 * `int textWidth = this.textRenderer.width(renderText)`，而 `Font#width` 返回
 * `Mth.ceil(浮点累加值)`。`renderX = -textWidth / 2f` 也基于这个整数，
 * 所以对齐偏移必须跟着取整，否则居中行会整体偏半个字。
 */
export function measureTextWidth(text: string, abcFont: AbcFont = DEFAULT_ABC_FONT): number {
  return Math.ceil(sumAdvance(text, abcFont))
}

// ==================== 颜色 ====================

/** 0xRRGGBB -> `#rrggbb` */
export function colorToCss(color: number): string {
  const value = color & 0xFFFFFF
  return `#${value.toString(16).padStart(6, '0')}`
}

/** 0xRRGGBB -> `0xRRGGBB` 形式的 Java 字面量 */
export function colorToJava(color: number): string {
  return `0x${(color & 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0')}`
}

/** `#rrggbb` / `rrggbb` -> 0xRRGGBB；非法输入返回 fallback */
export function cssToColor(value: string, fallback = 0xFFFFFF): number {
  const hex = value.trim().replace(/^#/, '')
  if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback
  return Number.parseInt(hex, 16)
}

// ==================== 元素尺寸（bit） ====================

/** 文本元素对应的 `fontSize`（= scale * 20） */
export function textFontSize(element: LayoutTextElement): number {
  return element.scale * 20
}

/** 贴图元素对应的 `fontSize`（= size / 0.4） */
export function logoFontSize(element: LayoutLogoElement): number {
  return element.size / 0.4
}

export interface ElementBox {
  /** 中心点（bit） */
  cx: number
  cy: number
  /** 半宽 / 半高（bit） */
  halfW: number
  halfH: number
}

/**
 * 计算元素在牌面上的包围盒（bit）。
 *
 * 对齐规则与 `TextLineData` 的 `renderX/renderY` 一致：
 * 文本按字形框的左上角定位，再按对齐方式回退半宽/半高。
 */
export function elementBox(
  element: LayoutElement,
  previewValues: Record<string, string> = {},
): ElementBox {
  if (element.kind === 'logo') {
    /**
     * 渲染器（`AbstractTextDisplayEntityRenderer.renderTexture`）：
     *   `imageSize = 0.4f * fontSize`，而 `fontSize = size / 0.4f`
     *   ⇒ `imageSize = size`，单位是**方块**，换算成 bit 要 ×16。
     * 这里以前漏了 ×16，导致画布上贴图比真实尺寸小 16 倍（框极小、图也极小）。
     */
    const sideBit = 0.4 * logoFontSize(element) * 16
    const half = sideBit / 2
    return {
      cx: element.x,
      cy: element.y,
      halfW: half,
      halfH: half,
    }
  }

  if (element.kind === 'rect') {
    const halfW = (element.width / 2) * rectFontSize(element)
    const halfH = (element.height / 2) * rectFontSize(element)
    return {
      cx: element.x,
      cy: element.y,
      halfW,
      halfH,
    }
  }

  const display = previewValues && Object.keys(previewValues).length > 0
    ? resolvePlaceholders(element.text, previewValues).text
    : element.text
  const fontSize = textFontSize(element)
  const unit = 0.8 * fontSize * (element.scaleY || 1)
  const unitX = 0.8 * fontSize * (element.scaleX || 1)
  const width = measureTextWidth(display, element.abcFont)
  const height = MC_FONT_HEIGHT
  const { renderX, renderY } = alignmentRenderOffset(element.alignment, width, height)
  // 文本像素空间（y 向下）-> bit 空间（y 向上）
  // 预览基线微调要让包围盒跟着字形走，否则选中框会跟字差半像素
  const nudge = previewBaselineNudge(element.abcFont)
  const x0 = renderX * unitX
  const x1 = (renderX + width) * unitX
  const yTop = -renderY * unit - nudge * unit
  const yBottom = -(renderY + height) * unit - nudge * unit
  return {
    cx: element.x + (x0 + x1) / 2,
    cy: element.y + (yTop + yBottom) / 2,
    halfW: Math.abs(x1 - x0) / 2,
    halfH: Math.abs(yBottom - yTop) / 2,
  }
}

/**
 * 色块元素对应的 `fontSize`。
 *
 * `-rect` 指令行不经过 helper，`fontSize` 由渲染器按行自身的 fontSize 读取；
 * 工坊里色块没有单独的 scale，因此沿用「与同为 20 的基准一致」的约定：
 * 尺寸就是 `w × h` bit。
 */
export function rectFontSize(_element: LayoutRectElement): number {
  return 1
}

/**
 * 元素**当前**在牌面上的总尺寸（bit，含 scaleX/scaleY）。
 *
 * 供 PPT 式缩放反推新参数用：已知拖拽后的目标尺寸，换算回 `scale` / `size` / `width`。
 */
export function elementSize(
  element: LayoutElement,
  previewValues: Record<string, string> = {},
): { w: number, h: number } {
  const box = elementBox(element, previewValues)
  return {
    w: box.halfW * 2,
    h: box.halfH * 2,
  }
}

/**
 * 每 1 个「缩放参数」单位对应多少 bit（用于把目标宽度换算成新的缩放值）。
 *
 * 文本：`1 scale` → `fontSize = 20` → 宽 `0.8*20*文本像素数`（再乘 scaleX）
 * 贴图：`size` 是**方块**单位，渲染出来的边长 = `size` 方块 = `size*16` bit
 * 色块：不走 scale，直接是 `w`/`h`
 */
export function bitPerScale(element: LayoutElement): number {
  if (element.kind === 'text') {
    const width = measureTextWidth(element.text, element.abcFont)
    const scaleX = element.scaleX || 1
    return 0.8 * 20 * width * scaleX
  }
  if (element.kind === 'logo') return 16
  return element.width
}

/** 行对齐决定的绘制原点偏移（文本像素；hAlign/vAlign 与 `TextLineData` 的 renderX/renderY 一致） */
export function alignmentRenderOffset(
  alignment: LayoutAlignment,
  width: number,
  height: number,
): { renderX: number, renderY: number } {
  const [horizontal, vertical] = alignment.split('_')
  const hAlign = horizontal === 'LEFT' ? 0 : horizontal === 'RIGHT' ? 2 : 1
  const vAlign = vertical === 'TOP' ? 0 : vertical === 'BOTTOM' ? 2 : 1
  const renderX = hAlign === 0 ? 0 : hAlign === 2 ? -width : -width / 2
  const renderY = vAlign === 0 ? 0 : vAlign === 2 ? -height : -height / 2
  return { renderX, renderY }
}

/** 元素包围盒的四角（bit，左上、右上、右下、左下——屏幕坐标系里 y 向下，这里返回的是牌面坐标系） */
export function elementCorners(element: LayoutElement): { x: number, y: number }[] {
  const box = elementBox(element)
  return [
    { x: box.cx - box.halfW, y: box.cy + box.halfH },
    { x: box.cx + box.halfW, y: box.cy + box.halfH },
    { x: box.cx + box.halfW, y: box.cy - box.halfH },
    { x: box.cx - box.halfW, y: box.cy - box.halfH },
  ]
}

/** 命中测试：牌面 bit 坐标是否落在元素内 */
export function hitTestElement(element: LayoutElement, x: number, y: number): boolean {
  const box = elementBox(element)
  return Math.abs(x - box.cx) <= box.halfW && Math.abs(y - box.cy) <= box.halfH
}

// ==================== 指令文本 ====================

/**
 * 组装真正写进 `TextLineData.text` 的文本。
 *
 * - `text` 元素：写纯文本。ABC 交通字体由模组 `SignTextLinesHelper` 按全局设置
 *   `GlobalFontSettings.isAbcMode()` 自动包裹，工坊不在这里生成 json 指令。
 * - `logo` 元素：走 helper 的 `logo(...)`，**不**是 `-texture` 指令。
 * - `rect` 元素：`-rect w h` 指令行。
 */
export function buildDirectiveText(element: LayoutElement): string {
  switch (element.kind) {
    case 'logo':
      return element.path
    case 'rect':
      return `-rect ${element.width} ${element.height}`
    default:
      return element.text
  }
}

/** 预览时把 `{key}` 替换成当前值；没有值的占位符原样保留（高亮显示） */
export function resolvePlaceholders(
  text: string,
  values: Record<string, string>,
): { text: string, unresolved: string[] } {
  const unresolved: string[] = []
  const resolved = text.replace(/\{([A-Za-z0-9_]+)\}/g, (match, key: string) => {
    const value = values[key]
    if (value === undefined || value === '') {
      unresolved.push(key)
      return match
    }
    return value
  })
  return { text: resolved, unresolved }
}

/** 提取文本 / 路径里引用到的所有占位符 key */
export function extractPlaceholderKeys(text: string): string[] {
  const keys: string[] = []
  for (const match of text.matchAll(/\{([A-Za-z0-9_]+)\}/g)) {
    if (!keys.includes(match[1])) keys.push(match[1])
  }
  return keys
}

// ==================== 画布预览字形 ====================

/**
 * 画布预览的逐字体纵向微调（单位：**文本像素**；正数 = 往下）。
 *
 * 游戏里 MC 用 `stbtt` 的字形 bearing 定位墨迹，浏览器则是把字形挂在 SVG 基线上，
 * 同一份 TTF 两边会差零点几像素；数字（b 字体）字形更矮，同样的偏差看起来更明显，
 * 所以 b 补得比 a 多。
 *
 * ⚠️ 只影响画布预览（字形绘制与选中框），**不写进生成的 `TextLineData`** ——
 * 生成代码里的 y 永远是你看到的那个坐标。
 */
export const PREVIEW_BASELINE_NUDGE: Record<AbcFont, number> = {
  a: 0.4,
  b: 1,
  c: 0.4,
}

/** 中文兜底字体（MiSans）的微调：跟 a 一样按小字号的观测值走 */
const PREVIEW_CJK_NUDGE = 0.4

/** 某行字体对应的预览微调（按行字体取值，逐字再用 `latin` 细分） */
export function previewBaselineNudge(abcFont: unknown): number {
  return PREVIEW_BASELINE_NUDGE[normalizeAbcFont(abcFont)]
}

/**
 * 一个「待绘制的字形」。
 *
 * ⚠️ **不要**再用 SVG 的 `textLength` / `lengthAdjust="spacingAndGlyphs"` 把每个字
 * 塞进固定宽度的格子 —— 那样每个字都会被横向拉伸（字宽和格子宽本来就不相等，
 * `i` 的墨迹只有 1px 却被拉到 2px，`M` 又被压到 6px）。现在按字体真实字宽定位、
 * 按字形自然宽度绘制，只有位置是我们算的，形状交给字体本身。
 */
export interface PreviewGlyph {
  char: string
  /** 左边缘（牌面 bit；横向未乘 scaleX，外层统一乘 squeeze） */
  left: number
  /** 基线（牌面 bit，y 向上） */
  baseline: number
  /** CSS `font-size`（牌面 bit） */
  em: number
}

export interface TextPreview {
  glyphs: PreviewGlyph[]
  /** 文本块在牌面 bit 坐标里的左边缘（同样未乘 scaleX） */
  x: number
  /** 文本块底边（bit） */
  y: number
  /** 每个文本像素对应的 bit 数（纵向，含 scaleY） */
  unit: number
  /** 每个文本像素对应的 bit 数（横向，含 scaleX） */
  unitX: number
  /** 水平/竖直缩放比 = scaleX / scaleY，渲染时给 `<g transform="scale(...)">` */
  squeeze: number
  width: number
  height: number
}

/** 计算文本元素在牌面坐标系（bit，y 向上）里的逐字形位置 */
export function buildTextPreview(
  element: LayoutTextElement,
  displayText?: string,
): TextPreview {
  const text = displayText ?? element.text
  const fontSize = textFontSize(element)
  // 与 elementBox 保持一致：横向 / 纵向分别带 scaleX / scaleY
  const unit = 0.8 * fontSize * (element.scaleY || 1)
  const unitX = 0.8 * fontSize * (element.scaleX || 1)
  const width = measureTextWidth(text, element.abcFont)
  const height = MC_FONT_HEIGHT
  const { renderX, renderY } = alignmentRenderOffset(element.alignment, width, height)

  /** 行顶（bit，y 向上）—— 字形的基线从这里往下量 */
  const lineTop = element.y - renderY * unit
  /** 文本块左边缘（横向用 unit，非等比缩放交给外层 squeeze） */
  const left = element.x + renderX * unit

  const glyphs: PreviewGlyph[] = []
  let cursor = 0
  for (const char of Array.from(text)) {
    const metric = charMetric(char, element.abcFont)
    // 交通 TTF 与中文兜底字体的微调不同：逐字按「实际用哪个字体渲染」取
    const nudge = metric.latin
      ? PREVIEW_BASELINE_NUDGE[normalizeAbcFont(element.abcFont)]
      : PREVIEW_CJK_NUDGE
    glyphs.push({
      char,
      left: left + cursor * unit,
      // 文本像素空间 y 向下 -> bit 空间 y 向上
      baseline: lineTop - (metric.baseline + nudge) * unit,
      em: metric.em * unit,
    })
    cursor += metric.advance
  }

  return {
    glyphs,
    x: left,
    y: element.y - (renderY + height) * unit,
    unit,
    unitX,
    squeeze: unit > 0 ? unitX / unit : 1,
    width,
    height,
  }
}

// ==================== 字体 ====================

const FONT_FALLBACK_STACK
  = '"Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", "PingFang SC", monospace'

/**
 * 画布文本预览用的交通字体族名，与模组 `assets/yunbeiuc/font/traf_sign_font_{a,b,c}.json`
 * 一一对应（TTF 自托管在 `public/fonts/traffic/`，`@font-face` 声明在 `globals.css`）。
 */
export const TRAFFIC_FONT_FAMILY: Record<AbcFont, string> = {
  a: 'TrafSignA',
  b: 'TrafSignB',
  c: 'TrafSignC',
}

/** 中文兜底字体族（模组里三个交通字体的第二个 provider，都是 MiSans） */
const TRAFFIC_CJK_FAMILY = 'TrafSignCJK'

/** 归一化字体标识：非 a/b/c 一律回退 A 型（模组只认这三种） */
export function normalizeAbcFont(value: unknown): AbcFont {
  const source = typeof value === 'string' ? value : ''
  return (VALID_ABC_FONTS as readonly string[]).includes(source)
    ? source as AbcFont
    : DEFAULT_ABC_FONT
}

/**
 * 某一行字体对应的 CSS 字体栈：交通 TTF → MiSans（中文）→ 系统兜底。
 *
 * 模组里交通 TTF 用 `skip` 排除 CJK 与全角标点，这里用 `@font-face` 的
 * `unicode-range` 复刻同一套排除范围，所以中文会自然落到 `TrafSignCJK`。
 */
export function trafficFontStack(abcFont: unknown): string {
  const family = TRAFFIC_FONT_FAMILY[normalizeAbcFont(abcFont)]
  return `"${family}", "${TRAFFIC_CJK_FAMILY}", ${FONT_FALLBACK_STACK}`
}

type FontState = 'idle' | 'loading' | 'ready' | 'failed'

let fontState: FontState = 'idle'
let fontWaiters: (() => void)[] = []

const TRAFFIC_FONT_FAMILIES = [...Object.values(TRAFFIC_FONT_FAMILY), TRAFFIC_CJK_FAMILY]

/**
 * 预加载交通字体（TTF 由 `@font-face` 声明，这里提前触发下载并等就绪），
 * 避免首帧先用兜底字体画完再跳字。
 *
 * 只在「就绪 / 失败」时回调一次，避免「失败 → 回调 → 重绘 → 再回调」的无限循环。
 */
export function ensureTrafficFonts(onReady?: () => void): void {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.fonts) {
    onReady?.()
    return
  }
  if (fontState === 'ready' || fontState === 'failed') {
    onReady?.()
    return
  }
  if (onReady) fontWaiters.push(onReady)
  if (fontState === 'loading') return
  fontState = 'loading'
  Promise
    .all(TRAFFIC_FONT_FAMILIES.map(family => document.fonts.load(`16px "${family}"`)))
    .then(() => {
      fontState = 'ready'
    })
    .catch(() => {
      fontState = 'failed'
    })
    .finally(() => {
      const waiters = fontWaiters.splice(0)
      for (const waiter of waiters) waiter()
    })
}

/** 交通字体是否已就绪 */
export function trafficFontsReady(): boolean {
  return fontState === 'ready'
}
