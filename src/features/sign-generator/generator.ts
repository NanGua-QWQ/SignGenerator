import type { Font, Glyph } from '@pdf-lib/fontkit'
import type { SignKind } from './types'

const FONT_URLS = {
  han: '/fonts/SourceHanSansSC-Bold.otf',
  a: '/fonts/jtbz_A.ttf',
  b: '/fonts/jtbz_B.ttf',
  c: '/fonts/jtbz_C.ttf',
} as const

type FontKey = keyof typeof FONT_URLS

const fontCache = new Map<FontKey, Promise<Font>>()
let fontkitPromise: Promise<{
  default: typeof import('@pdf-lib/fontkit')
}> | undefined
const GREEN = '#359b47'
const RED = '#ee2d2d'
const WHITE = '#FFFFFF'
const YELLOW = '#f4eb35'
const BLACK = '#000000'

const XML_ESCAPES: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&apos;',
}

function escapeXml(value: string): string {
  return String(value).replace(/[<>&"']/g, char => XML_ESCAPES[char])
}

async function loadFont(kind: FontKey): Promise<Font> {
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
}

interface TextLayout {
  glyphs: GlyphItem[]
  usedWidth: number
}

function textLayout(font: Font, text: string, height: number): TextLayout {
  const glyphs = Array.from(text).map(char => {
    const codePoint = char.codePointAt(0)
    if (codePoint === undefined) throw new Error(`无效字符`)
    const glyph = font.glyphForCodePoint(codePoint)
    if (glyph.id === 0 && char !== ' ') throw new Error(`字体不包含字符“${char}”`)
    const box = glyph.bbox
    const glyphHeight = box.maxY - box.minY
    if (glyphHeight <= 0) throw new Error(`字符“${char}”无法生成轮廓`)
    const scale = height / glyphHeight
    return { glyph, box, scale, width: (box.maxX - box.minX) * scale }
  })

  const usedWidth = glyphs.reduce((total, item) => total + item.width, 0)
  return { glyphs, usedWidth }
}

interface LayoutOptions {
  align?: 'start' | 'center'
  minGap?: number
  maxGap?: number
}

function textGap(usedWidth: number, glyphCount: number, width: number, options: LayoutOptions = {}): number {
  const rawGap = glyphCount > 1 ? (width - usedWidth) / (glyphCount - 1) : 0
  const minGap = typeof options.minGap === 'number' ? options.minGap : 0
  const cappedGap = typeof options.maxGap === 'number' ? Math.min(rawGap, options.maxGap) : rawGap
  return Math.max(minGap, cappedGap)
}

function renderLayout(layout: TextLayout, startX: number, startY: number, fill: string, gap: number): string {
  let x = startX
  return layout.glyphs.map(({ glyph, box, scale, width: glyphWidth }) => {
    const transform = `translate(${x} ${startY + box.maxY * scale}) scale(${scale} ${-scale}) translate(${-box.minX} 0)`
    x += glyphWidth + gap
    return `<path d="${glyph.path.toSVG()}" transform="${transform}" fill="${fill}" fill-rule="evenodd"/>`
  }).join('')
}

function outlinedText(font: Font, text: string, startX: number, startY: number, width: number, height: number, fill: string, options: LayoutOptions = {}): string {
  const layout = textLayout(font, text, height)
  const gap = textGap(layout.usedWidth, layout.glyphs.length, width, options)
  const contentWidth = layout.usedWidth + gap * Math.max(0, layout.glyphs.length - 1)
  const x = options.align === 'start' ? startX : startX + (width - contentWidth) / 2
  return renderLayout(layout, x, startY, fill, gap)
}

function expresswayBackground(width: number, withName: boolean, bannerColor: string): string {
  const height = withName ? 1200 : 1000
  const outer = withName
    ? `<rect width="${width}" height="${height}" rx="110" fill="${GREEN}"/><rect x="30" y="30" width="${width - 60}" height="${height - 60}" rx="80" fill="${WHITE}"/>`
    : `<rect width="${width}" height="${height}" rx="110" fill="${WHITE}"/>`
  const x = withName ? 60 : 30
  const top = withName ? 60 : 30
  const bannerHeight = 200
  const bottom = withName ? height - 60 : height - 30
  const radius = withName ? 50 : 80
  const banner = `<path d="M ${x + radius} ${top} H ${width - x - radius} Q ${width - x} ${top} ${width - x} ${top + radius} V ${top + bannerHeight} H ${x} V ${top + radius} Q ${x} ${top} ${x + radius} ${top} Z" fill="${bannerColor}"/>`
  const body = `<path d="M ${x} ${top + bannerHeight} H ${width - x} V ${bottom - radius} Q ${width - x} ${bottom} ${width - x - radius} ${bottom} H ${x + radius} Q ${x} ${bottom} ${x} ${bottom - radius} Z" fill="${GREEN}"/>`
  return outer + banner + body
}

function cleanProvinceLabel(value: string): string {
  return Array.from(String(value || '').trim()).slice(0, 1).join('')
}

function parseCode(value: string): { code: string; digits: string; kind: SignKind; provinceLabel: string } {
  const code = String(value || '').trim().toUpperCase()
  const national = /^G(\d{1,2}|\d{4})$/.exec(code)
  if (national) return { code, digits: national[1], kind: 'national', provinceLabel: '' }

  const provincial = /^S(\d{1,2}|\d{4})$/.exec(code)
  if (provincial) return { code, digits: provincial[1], kind: 'provincial', provinceLabel: '粤' }

  const legacyProvincial = /^(.)(S(\d{1,2}|\d{4}))$/u.exec(code)
  if (legacyProvincial) return { code: legacyProvincial[2], digits: legacyProvincial[3], kind: 'provincial', provinceLabel: legacyProvincial[1] }

  throw new Error('请输入 1 位、2 位或 4 位数字编号')
}

export async function generateSignSvg(inputCode: string, inputName = '', inputProvinceLabel = ''): Promise<string> {
  const sign = parseCode(inputCode)
  const nameLimit = sign.digits.length === 4 ? 6 : 4
  const name = Array.from(inputName.trim()).slice(0, nameLimit).join('')
  const [fontHan, fontA, fontB, fontC] = await Promise.all([loadFont('han'), loadFont('a'), loadFont('b'), loadFont('c')])

  const named = Boolean(name)
  const width = sign.digits.length === 1 ? 1000 : sign.digits.length === 2 ? 1250 : 1700
  const provinceLabel = cleanProvinceLabel(inputProvinceLabel) || sign.provinceLabel || '粤'
  const bannerText = sign.kind === 'provincial' ? `${provinceLabel}高速` : '国家高速'
  const bannerColor = sign.kind === 'provincial' ? YELLOW : RED
  const bannerTextColor = sign.kind === 'provincial' ? BLACK : WHITE
  const bannerX = sign.digits.length === 4 ? 355 : sign.kind === 'provincial' ? (sign.digits.length === 1 ? 250 : 359.1) : (sign.digits.length === 1 ? 150 : 275)
  const bannerWidth = sign.digits.length === 4 ? 990 : sign.kind === 'provincial' ? 500 : 700
  const mainCode = sign.digits.length === 4 ? sign.code.slice(0, 3) : sign.code
  const mainX = sign.digits.length === 1 ? 150 : 90
  const mainWidth = sign.digits.length === 1 ? 700 : 1070
  const mainMaxGap = sign.digits.length === 1 ? 85 : sign.digits.length === 2 ? 95 : 90
  const mainMinGap = named ? 0 : sign.digits.length === 4 ? 25 : 50
  const mainFont = named ? fontB : fontA
  const bannerY = named ? 110 : 80
  const bannerPaths = outlinedText(fontHan, bannerText, bannerX, bannerY, bannerWidth, 100, bannerTextColor)
  const content = [bannerPaths]
  if (sign.digits.length === 4) {
    const mainLayout = textLayout(mainFont, mainCode, 450)
    const suffixLayout = textLayout(fontC, sign.code.slice(3), 300)
    const mainGap = textGap(mainLayout.usedWidth, mainLayout.glyphs.length, 1180, { maxGap: mainMaxGap, minGap: mainMinGap })
    const suffixGap = textGap(suffixLayout.usedWidth, suffixLayout.glyphs.length, sign.digits.endsWith('1') ? 280 : 340, { maxGap: sign.digits.endsWith('1') ? 35 : 55 })
    const mainContentWidth = mainLayout.usedWidth + mainGap * Math.max(0, mainLayout.glyphs.length - 1)
    const suffixContentWidth = suffixLayout.usedWidth + suffixGap * Math.max(0, suffixLayout.glyphs.length - 1)
    const groupGap = named ? 55 : 45
    const groupWidth = mainContentWidth + groupGap + suffixContentWidth
    const groupX = (width - groupWidth) / 2 + (named ? 0 : 24)
    content.push(renderLayout(mainLayout, groupX, named ? 340 : 370, WHITE, mainGap))
    content.push(renderLayout(suffixLayout, groupX + mainContentWidth + groupGap, named ? 490 : 520, WHITE, suffixGap))
  } else {
    content.push(outlinedText(mainFont, mainCode, mainX, named ? 340 : 370, mainWidth, 450, WHITE, { maxGap: mainMaxGap, minGap: mainMinGap }))
  }
  if (named) {
    const nameWidth = sign.digits.length === 1 ? 800 : sign.digits.length === 2 ? 950 : 1400
    const nameX = sign.digits.length === 1 ? 100 : 150
    content.push(outlinedText(fontHan, name, nameX, 860, nameWidth, 200, WHITE))
  }
  const height = named ? 1200 : 1000
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(`${inputCode} ${name}`.trim())} 道路编号牌">${expresswayBackground(width, named, bannerColor)}${content.join('')}</svg>`
}

export function signFilename(code: string, name = ''): string {
  const safeCode = String(code || 'road-sign').trim().replace(/[<>:"/\\|?*]/g, '_')
  const safeName = String(name || '').trim().replace(/[<>:"/\\|?*]/g, '_')
  const base = `${safeCode}${safeName ? `_${safeName}` : ''}`
  return `${base || 'road-sign'}.svg`
}
