import type { Font, Glyph } from '@pdf-lib/fontkit'
import type { ReactNode } from 'react'

const FONT_URLS = {
  han: '/fonts/SourceHanSansSC-Bold.otf',
  a: '/fonts/jtbz_A.ttf',
  b: '/fonts/jtbz_B.ttf',
  c: '/fonts/jtbz_C.ttf',
} as const

export type FontKey = keyof typeof FONT_URLS

const fontCache = new Map<FontKey, Promise<Font>>()
let fontkitPromise: Promise<{
  default: typeof import('@pdf-lib/fontkit')
}> | undefined

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

export async function loadFont(kind: FontKey): Promise<Font> {
  const cached = fontCache.get(kind)
  if (cached) return cached
  if (!fontkitPromise) fontkitPromise = import('@pdf-lib/fontkit')
  const fontPromise = Promise.all([
    fetch(FONT_URLS[kind]).then(response => {
      if (!response.ok) throw new Error(`无法加载 ${kind.toUpperCase()} 型交通标志字体`)
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
  width: number
  path: string
  isWhitespace?: boolean
}

export interface TextLayout {
  glyphs: GlyphItem[]
  usedWidth: number
}

export function textLayout(font: Font, text: string, height: number): TextLayout {
  const unitsPerEm = font.unitsPerEm || 1000
  const glyphs = Array.from(text).map(char => {
    const codePoint = char.codePointAt(0)
    if (codePoint === undefined) throw new Error(`无效字符`)
    const glyph = font.glyphForCodePoint(codePoint)
    if (glyph.id === 0 && char !== ' ') throw new Error(`字体不包含字符“${char}”`)
    if (char === ' ') {
      const width = (glyph.advanceWidth || 0) / unitsPerEm * height
      return {
        glyph,
        box: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        scale: 0,
        width,
        path: '',
        isWhitespace: true,
      }
    }
    const box = glyph.bbox
    const glyphHeight = box.maxY - box.minY
    if (glyphHeight <= 0) throw new Error(`字符“${char}”无法生成轮廓`)
    const scale = height / glyphHeight
    return { glyph, box, scale, width: (box.maxX - box.minX) * scale, path: glyph.path.toSVG() }
  })

  const usedWidth = glyphs.reduce((total, item) => total + item.width, 0)
  return { glyphs, usedWidth }
}

export interface LayoutOptions {
  align?: 'start' | 'center'
  minGap?: number
  maxGap?: number
}

export function textGap(usedWidth: number, glyphCount: number, width: number, options: LayoutOptions = {}): number {
  const rawGap = glyphCount > 1 ? (width - usedWidth) / (glyphCount - 1) : 0
  const minGap = typeof options.minGap === 'number' ? options.minGap : 0
  const cappedGap = typeof options.maxGap === 'number' ? Math.min(rawGap, options.maxGap) : rawGap
  return Math.max(minGap, cappedGap)
}

export function renderLayout(layout: TextLayout, startX: number, startY: number, fill: string, gap: number): ReactNode[] {
  let x = startX
  return layout.glyphs.map(({ box, scale, width: glyphWidth, path, isWhitespace }, index) => {
    if (isWhitespace || !path) {
      x += glyphWidth + gap
      return null
    }
    const transform = `translate(${x} ${startY + box.maxY * scale}) scale(${scale} ${-scale}) translate(${-box.minX} 0)`
    x += glyphWidth + gap
    return <path key={index} d={path} transform={transform} fill={fill} fillRule="evenodd" />
  })
}

export function outlinedText(font: Font, text: string, startX: number, startY: number, width: number, height: number, fill: string, options: LayoutOptions = {}): ReactNode[] {
  const layout = textLayout(font, text, height)
  const gap = textGap(layout.usedWidth, layout.glyphs.length, width, options)
  const contentWidth = layout.usedWidth + gap * Math.max(0, layout.glyphs.length - 1)
  const x = options.align === 'start' ? startX : startX + (width - contentWidth) / 2
  return renderLayout(layout, x, startY, fill, gap)
}
