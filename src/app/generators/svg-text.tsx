import type {
  Font, Glyph,
} from '@pdf-lib/fontkit'

const FONT_URLS = {
  han: '/fonts/SourceHanSansSC-Bold.otf',
  a: '/fonts/jtbz_A.ttf',
  b: '/fonts/jtbz_B.ttf',
  c: '/fonts/jtbz_C.ttf',
} as const

export type FontKey = keyof typeof FONT_URLS

const fontCache = new Map<FontKey, Promise<Font>>()
interface FontkitModule {
  create(buffer: Uint8Array): Font
}
let fontkitPromise: Promise<{ default: FontkitModule }> | undefined

export const GREEN = '#359b47'
export const RED = '#ee2d2d'
export const WHITE = '#FFFFFF'
export const YELLOW = '#f4eb35'
export const YELLOW_GREEN = '#ccff33'
export const BLACK = '#000000'

const XML_ESCAPES: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&apos;',
}

export function escapeXml(value: string): string {
  return String(value).replace(/[<>&"']/g, char => XML_ESCAPES[char])
}

export function loadFont(kind: FontKey): Promise<Font> {
  const cached = fontCache.get(kind)
  if (cached) { return cached }
  if (!fontkitPromise) { fontkitPromise = import('@pdf-lib/fontkit') }
  const fontPromise = Promise.all([
    fetch(FONT_URLS[kind]).then((response) => {
      if (!response.ok) { throw new Error(`无法加载 ${kind.toUpperCase()} 型交通标志字体`) }
      return response.arrayBuffer()
    }),
    fontkitPromise,
  ]).then(([buffer, fontkit]) => fontkit.default.create(new Uint8Array(buffer)))
  fontCache.set(kind, fontPromise)
  return fontPromise
}

interface GlyphItem {
  glyph: Glyph
  box: { minX: number; minY: number; maxX: number; maxY: number }
  scale: number
  originMaxY: number
  width: number
  path: string
  isWhitespace?: boolean
}

export interface TextLayout {
  glyphs: GlyphItem[]
  usedWidth: number
}

interface ReferenceScale {
  scale: number
  maxY: number
}

function referenceScale(font: Font, text: string, height: number): ReferenceScale | null {
  const boxes = Array.from(text)
    .filter(char => char !== ' ')
    .map(char => font.glyphForCodePoint(char.codePointAt(0) ?? 0).bbox)
  const validBoxes = boxes.filter(box => box.maxY > box.minY)
  if (validBoxes.length === 0) { return null }

  const minY = Math.min(...validBoxes.map(box => box.minY))
  const maxY = Math.max(...validBoxes.map(box => box.maxY))
  const referenceHeight = maxY - minY
  if (referenceHeight <= 0) { return null }

  return {
    scale: height / referenceHeight,
    maxY,
  }
}

export interface TextLayoutOptions {
  scaleMode?: 'glyph' | 'reference'
  referenceText?: string
}

export function textLayout(
  font: Font,
  text: string,
  height: number,
  options: TextLayoutOptions = {
  },
): TextLayout {
  const unitsPerEm = font.unitsPerEm || 1000
  const reference
    = options.scaleMode === 'reference' ? referenceScale(font, options.referenceText || text, height) : null
  const glyphs = Array.from(text).map((char) => {
    const codePoint = char.codePointAt(0)
    if (codePoint === undefined) { throw new Error('无效字符') }
    const glyph = font.glyphForCodePoint(codePoint)
    if (glyph.id === 0 && char !== ' ') { throw new Error(`字体不包含字符“${char}”`) }
    if (char === ' ') {
      const width = reference
        ? (glyph.advanceWidth || unitsPerEm / 2) * reference.scale
        : (glyph.advanceWidth || 0) / unitsPerEm * height
      return {
        glyph,
        box: {
          minX: 0,
          minY: 0,
          maxX: 0,
          maxY: 0,
        },
        scale: 0,
        originMaxY: 0,
        width,
        path: '',
        isWhitespace: true,
      }
    }
    const box = glyph.bbox
    const glyphHeight = box.maxY - box.minY
    if (glyphHeight <= 0) { throw new Error(`字符“${char}”无法生成轮廓`) }
    const scale = reference?.scale ?? height / glyphHeight
    const originMaxY = reference?.maxY ?? box.maxY
    return {
      glyph,
      box,
      scale,
      originMaxY,
      width: (box.maxX - box.minX) * scale,
      path: glyph.path.toSVG(),
    }
  })

  const usedWidth = glyphs.reduce((total, item) => total + item.width, 0)
  return {
    glyphs,
    usedWidth,
  }
}

export interface LayoutOptions {
  align?: 'start' | 'center'
  minGap?: number
  maxGap?: number
  scaleMode?: TextLayoutOptions['scaleMode']
  referenceText?: string
}

export function textGap(
  usedWidth: number,
  glyphCount: number,
  width: number,
  options: LayoutOptions = {
  },
): number {
  const rawGap = glyphCount > 1 ? (width - usedWidth) / (glyphCount - 1) : 0
  const minGap = typeof options.minGap === 'number' ? options.minGap : 0
  const cappedGap = typeof options.maxGap === 'number' ? Math.min(rawGap, options.maxGap) : rawGap
  return Math.max(minGap, cappedGap)
}

interface LayoutProps {
  layout: TextLayout
  startX: number
  startY: number
  children: string
  gap: number
  keyPrefix?: string
}
export function Layout({
  layout,
  startX,
  startY,
  children: fill,
  gap,
  keyPrefix = 'glyph',
}: LayoutProps) {
  return <>
    {layout.glyphs.map(
      ({
        box, scale, originMaxY, path, isWhitespace,
      }, index) => {
        const x = startX + layout.glyphs
          .slice(0, index)
          .reduce((total, item) => total + item.width + gap, 0)
        if (isWhitespace || !path) {
          return null
        }
        const transform = `translate(${x} ${startY + originMaxY * scale}) scale(${scale} ${-scale}) translate(${-box.minX} 0)`
        return (
          <path
            key={`${keyPrefix}-${index}`}
            d={path}
            transform={transform}
            fill={fill}
            fillRule="evenodd"
          />
        )
      },
    ).filter(element => element !== null)}
  </>
}

interface OutlinedTextProps {
  font: Font
  text: string
  startX: number
  startY: number
  width: number
  height: number
  fill: string
  options?: LayoutOptions
}
export function OutlinedText({
  font,
  text,
  startX,
  startY,
  width,
  height,
  fill,
  options = {
  },
}: OutlinedTextProps) {
  const layout = textLayout(font, text, height, options)
  const gap = textGap(layout.usedWidth, layout.glyphs.length, width, options)
  const contentWidth = layout.usedWidth + gap * Math.max(0, layout.glyphs.length - 1)
  const x = options.align === 'start' ? startX : startX + (width - contentWidth) / 2
  const keyPrefix = `${text}-${startX}-${startY}`
  return (
    <Layout layout={layout} startX={x} startY={startY} gap={gap} keyPrefix={keyPrefix}>
      {fill}
    </Layout>
  )
}
