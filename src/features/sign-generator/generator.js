const FONT_URLS = {
  han: '/fonts/SourceHanSansSC-Bold.otf',
  a: '/fonts/jtbz_A.ttf',
  b: '/fonts/jtbz_B.ttf',
  c: '/fonts/jtbz_C.ttf',
}

const fontCache = new Map()
let fontkitPromise
const GREEN = '#359b47'
const RED = '#ee2d2d'
const WHITE = '#FFFFFF'
const YELLOW = '#f4eb35'
const BLACK = '#000000'

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char])
}

async function loadFont(kind) {
  if (!fontCache.has(kind)) {
    if (!fontkitPromise) fontkitPromise = import('@pdf-lib/fontkit').then(module => module.default)
    fontCache.set(kind, Promise.all([
      fetch(FONT_URLS[kind]).then(response => {
        if (!response.ok) throw new Error(`无法加载 ${kind.toUpperCase()} 型交通标志字体`)
        return response.arrayBuffer()
      }),
      fontkitPromise,
    ]).then(([buffer, fontkit]) => fontkit.create(new Uint8Array(buffer))))
  }
  return fontCache.get(kind)
}

function outlinedText(font, text, startX, startY, width, height, fill, options = {}) {
  const glyphs = Array.from(text).map(char => {
    const glyph = font.glyphForCodePoint(char.codePointAt(0))
    if (glyph.id === 0 && char !== ' ') throw new Error(`字体不包含字符“${char}”`)
    const box = glyph.bbox
    const glyphHeight = box.maxY - box.minY
    if (glyphHeight <= 0) throw new Error(`字符“${char}”无法生成轮廓`)
    const scale = height / glyphHeight
    return { glyph, box, scale, width: (box.maxX - box.minX) * scale }
  })

  const usedWidth = glyphs.reduce((total, item) => total + item.width, 0)
  const rawGap = glyphs.length > 1 ? (width - usedWidth) / (glyphs.length - 1) : 0
  const gap = Number.isFinite(options.maxGap) ? Math.min(rawGap, options.maxGap) : rawGap
  const contentWidth = usedWidth + gap * Math.max(0, glyphs.length - 1)
  let x = startX + (width - contentWidth) / 2
  return glyphs.map(({ glyph, box, scale, width: glyphWidth }) => {
    const transform = `translate(${x} ${startY + box.maxY * scale}) scale(${scale} ${-scale}) translate(${-box.minX} 0)`
    x += glyphWidth + gap
    return `<path d="${glyph.path.toSVG()}" transform="${transform}" fill="${fill}" fill-rule="evenodd"/>`
  }).join('')
}

function expresswayBackground(width, withName, bannerColor) {
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

function cleanProvinceLabel(value) {
  return Array.from(String(value || '').trim()).slice(0, 4).join('')
}

function parseCode(value) {
  const code = String(value || '').trim().toUpperCase()
  const national = /^G(\d{1,2}|\d{4})$/.exec(code)
  if (national) return { code, digits: national[1], kind: 'national', provinceLabel: '' }

  const provincial = /^S(\d{1,2}|\d{4})$/.exec(code)
  if (provincial) return { code, digits: provincial[1], kind: 'provincial', provinceLabel: '粤高速' }

  const legacyProvincial = /^(.)(S(\d{1,2}|\d{4}))$/u.exec(code)
  if (legacyProvincial) return { code: legacyProvincial[2], digits: legacyProvincial[3], kind: 'provincial', provinceLabel: `${legacyProvincial[1]}高速` }

  throw new Error('请输入 1 位、2 位或 4 位数字编号')
}

export async function generateSignSvg(inputCode, inputName = '', inputProvinceLabel = '') {
  const sign = parseCode(inputCode)
  const nameLimit = sign.digits.length === 4 ? 6 : 4
  const name = Array.from(inputName.trim()).slice(0, nameLimit).join('')
  const [fontHan, fontA, fontB, fontC] = await Promise.all([loadFont('han'), loadFont('a'), loadFont('b'), loadFont('c')])

  const named = Boolean(name)
  const width = sign.digits.length === 1 ? 1000 : sign.digits.length === 2 ? 1250 : 1700
  const provinceLabel = cleanProvinceLabel(inputProvinceLabel) || sign.provinceLabel
  const bannerText = sign.kind === 'provincial' ? provinceLabel : '国家高速'
  const bannerColor = sign.kind === 'provincial' ? YELLOW : RED
  const bannerTextColor = sign.kind === 'provincial' ? BLACK : WHITE
  const bannerX = sign.digits.length === 4 ? 355 : sign.kind === 'provincial' ? (sign.digits.length === 1 ? 250 : 359.1) : (sign.digits.length === 1 ? 150 : 275)
  const bannerWidth = sign.digits.length === 4 ? 990 : sign.kind === 'provincial' ? 500 : 700
  const mainCode = sign.digits.length === 4 ? sign.code.slice(0, 3) : sign.code
  const mainX = sign.digits.length === 1 ? 150 : 90
  const mainWidth = sign.digits.length === 1 ? 700 : 1070
  const mainMaxGap = sign.digits.length === 1 ? 85 : sign.digits.length === 2 ? 95 : 90
  const mainFont = named ? fontB : fontA
  const bannerY = named ? 110 : 80
  const bannerPaths = outlinedText(fontHan, bannerText, bannerX, bannerY, bannerWidth, 100, bannerTextColor)
  const content = [bannerPaths, outlinedText(mainFont, mainCode, mainX, named ? 340 : 370, mainWidth, 450, WHITE, { maxGap: mainMaxGap })]
  if (sign.digits.length === 4) {
    const suffixWidth = sign.digits.endsWith('1') ? 315 : 390
    const suffixMaxGap = sign.digits.endsWith('1') ? 35 : 55
    content.push(outlinedText(fontC, sign.code.slice(3), 1220, named ? 490 : 520, suffixWidth, 300, WHITE, { maxGap: suffixMaxGap }))
  }
  if (named) {
    const nameWidth = sign.digits.length === 1 ? 800 : sign.digits.length === 2 ? 950 : 1400
    const nameX = sign.digits.length === 1 ? 100 : 150
    content.push(outlinedText(fontHan, name, nameX, 860, nameWidth, 200, WHITE))
  }
  const height = named ? 1200 : 1000
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(`${inputCode} ${name}`.trim())} 道路编号牌">${expresswayBackground(width, named, bannerColor)}${content.join('')}</svg>`
}

export function signFilename(code, name = '') {
  const safeCode = String(code || 'road-sign').trim().replace(/[<>:"/\\|?*]/g, '_')
  const safeName = String(name || '').trim().replace(/[<>:"/\\|?*]/g, '_')
  const base = `${safeCode}${safeName ? `_${safeName}` : ''}`
  return `${base || 'road-sign'}.svg`
}
