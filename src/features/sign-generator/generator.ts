import type { Font, Glyph } from '@pdf-lib/fontkit'
import type { Sign, SignKind } from './types'

const FONT_URLS = {
  han: '/fonts/SourceHanSansSC-Bold.otf',
  a: '/fonts/jtbz_A.ttf',
  b: '/fonts/jtbz_B.ttf',
  c: '/fonts/jtbz_C.ttf',
} as const

type FontKey = keyof typeof FONT_URLS

const fontCache = new Map<FontKey, Promise<Font>>()
let exitLocationTemplatePromise: Promise<string> | undefined
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

async function loadExitLocationTemplate(): Promise<string> {
  if (!exitLocationTemplatePromise) {
    exitLocationTemplatePromise = fetch('/出口定位.svg').then(response => {
      if (!response.ok) throw new Error('无法加载出口定位 SVG 模板')
      return response.text()
    })
  }
  return exitLocationTemplatePromise
}

interface GlyphItem {
  glyph: Glyph
  box: { minX: number; minY: number; maxX: number; maxY: number }
  scale: number
  width: number
  path: string
  isWhitespace?: boolean
}

interface TextLayout {
  glyphs: GlyphItem[]
  usedWidth: number
}

function textLayout(font: Font, text: string, height: number): TextLayout {
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
  return layout.glyphs.map(({ glyph, box, scale, width: glyphWidth, path, isWhitespace }) => {
    if (isWhitespace || !path) {
      x += glyphWidth + gap
      return ''
    }
    const transform = `translate(${x} ${startY + box.maxY * scale}) scale(${scale} ${-scale}) translate(${-box.minX} 0)`
    x += glyphWidth + gap
    return `<path d="${path}" transform="${transform}" fill="${fill}" fill-rule="evenodd"/>`
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

function cleanExitText(value: string, fallback: string, limit: number): string {
  const text = Array.from(String(value || '').trim()).slice(0, limit).join('')
  return text || fallback
}

function cleanExitNumber(value: string): string {
  return String(value || '').replace(/\D/g, '').slice(0, 4) || '360'
}

function cleanExitDistance(value: string): string {
  return String(value || '').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 5) || '2'
}

function cleanExitRoute(value: string, fallback: string): string {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || fallback
}

function cleanDirection(value: string, fallback: string): string {
  return Array.from(String(value || '').trim()).slice(0, 1).join('') || fallback
}

function routeShield(fontHan: Font, fontA: Font, code: string, x: number, y: number, width: number, height: number): string {
  const inset = 4
  const bannerHeight = 24
  return [
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="${WHITE}"/>`,
    `<rect x="${x + inset}" y="${y + inset}" width="${width - inset * 2}" height="${height - inset * 2}" rx="5" fill="${GREEN}"/>`,
    `<path d="M ${x + inset + 5} ${y + inset} H ${x + width - inset - 5} Q ${x + width - inset} ${y + inset} ${x + width - inset} ${y + inset + 5} V ${y + inset + bannerHeight} H ${x + inset} V ${y + inset + 5} Q ${x + inset} ${y + inset} ${x + inset + 5} ${y + inset} Z" fill="${RED}"/>`,
    outlinedText(fontHan, '国家高速', x + 29, y + 10, width - 58, 8, WHITE, { maxGap: 1 }),
    outlinedText(fontA, code, x + 14, y + 42, width - 28, 44, WHITE, { maxGap: 4, minGap: 0 }),
  ].join('')
}

function directionPlate(fontHan: Font, text: string, x: number, y: number): string {
  return [
    `<rect x="${x}" y="${y}" width="64" height="64" fill="${WHITE}"/>`,
    outlinedText(fontHan, text, x + 8, y + 9, 48, 45, GREEN),
  ].join('')
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

async function generateExpresswaySignSvg(inputCode: string, inputName = '', inputProvinceLabel = ''): Promise<string> {
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

async function generateExitLocationSvg(sign: Sign): Promise<string> {
  const [template, fontHan, fontA] = await Promise.all([loadExitLocationTemplate(), loadFont('han'), loadFont('a')])
  const exitNumber = cleanExitNumber(sign.exitNumber)
  const exitDistance = cleanExitDistance(sign.exitDistance)
  const exitName = cleanExitText(sign.exitName, '柳州', 6)
  const destination = cleanExitText(sign.exitDestination, '玉林', 8)
  const leftRoute = cleanExitRoute(sign.leftRoute, 'G72')
  const rightRoute = cleanExitRoute(sign.rightRoute, 'G80')
  const leftDirection = cleanDirection(sign.leftDirection, '北')
  const rightDirection = cleanDirection(sign.rightDirection, '东')
  const label = escapeXml(`${exitName} ${exitNumber} ${destination} ${exitDistance}km`)
  const overlay = [
    `<g data-generated="exit-location">`,
    outlinedText(fontA, exitNumber, 884, 20, 100, 42, GREEN, { maxGap: 4, minGap: 0 }),
    directionPlate(fontHan, leftDirection, 149, 149),
    routeShield(fontHan, fontA, leftRoute, 226, 132, 132, 104),
    routeShield(fontHan, fontA, rightRoute, 656, 132, 132, 104),
    directionPlate(fontHan, rightDirection, 802, 153),
    `<rect x="123" y="240" width="240" height="92" fill="${GREEN}"/>`,
    outlinedText(fontHan, exitName, 123, 258, 240, 56, WHITE, { maxGap: 16 }),
    `<rect x="625" y="240" width="240" height="92" fill="${GREEN}"/>`,
    outlinedText(fontHan, destination, 625, 258, 240, 56, WHITE, { maxGap: 16 }),
    `<rect x="666" y="345" width="190" height="96" fill="${GREEN}"/>`,
    outlinedText(fontA, exitDistance, 668, 348, 76, 68, WHITE, { maxGap: 4, minGap: 0 }),
    outlinedText(fontHan, 'km', 746, 389, 70, 30, WHITE, { align: 'start', maxGap: 2, minGap: 0 }),
    `</g>`,
  ].join('')
  const svg = template
    .replace(/<!--rotationCenter:[\s\S]*?-->/, '')
    .replace('<svg ', `<svg role="img" aria-label="${label} 出口定位牌" `)
  return svg.replace('</svg>', `${overlay}</svg>`)
}

export async function generateSignSvg(sign: Sign): Promise<string> {
  if (sign.template === 'exit-location') return generateExitLocationSvg(sign)
  return generateExpresswaySignSvg(sign.code, sign.name, sign.provinceLabel)
}

export function signFilename(sign: Sign): string {
  const code = sign.template === 'exit-location' ? `出口定位_${sign.exitNumber}` : sign.code
  const name = sign.template === 'exit-location' ? sign.exitName || sign.name : sign.name
  const safeCode = String(code || 'road-sign').trim().replace(/[<>:"/\\|?*]/g, '_')
  const safeName = String(name || '').trim().replace(/[<>:"/\\|?*]/g, '_')
  const base = `${safeCode}${safeName ? `_${safeName}` : ''}`
  return `${base || 'road-sign'}.svg`
}
