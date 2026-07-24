import type { Font } from '@pdf-lib/fontkit'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { SignKind } from '../types'
import { BLACK, GREEN, RED, WHITE, YELLOW, YELLOW_GREEN, loadFont, outlinedText, renderLayout, textGap, textLayout } from './svg-text'

function expresswayBackgroundNode(width: number, withName: boolean, bannerColor: string): ReactNode {
  const height = withName ? 1200 : 1000
  const x = withName ? 60 : 30
  const top = withName ? 60 : 30
  const bannerHeight = 200
  const bottom = withName ? height - 60 : height - 30
  const radius = withName ? 50 : 80
  const bannerPath = `M ${x + radius} ${top} H ${width - x - radius} Q ${width - x} ${top} ${width - x} ${top + radius} V ${top + bannerHeight} H ${x} V ${top + radius} Q ${x} ${top} ${x + radius} ${top} Z`
  const bodyPath = `M ${x} ${top + bannerHeight} H ${width - x} V ${bottom - radius} Q ${width - x} ${bottom} ${width - x - radius} ${bottom} H ${x + radius} Q ${x} ${bottom} ${x} ${bottom - radius} Z`

  return (
    <>
      {withName ? (
        <>
          <rect width={width} height={height} rx="110" fill={GREEN} />
          <rect x="30" y="30" width={width - 60} height={height - 60} rx="80" fill={WHITE} />
        </>
      ) : (
        <rect width={width} height={height} rx="110" fill={WHITE} />
      )}
      <path d={bannerPath} fill={bannerColor} />
      <path d={bodyPath} fill={GREEN} />
    </>
  )
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

interface ExpresswaySignNodeOptions {
  code: string
  name?: string
  provinceLabel?: string
  kind?: SignKind
  fontChinese: Font
  fontLatin: Font
  x?: number
  y?: number
  width?: number
  height?: number
  ariaLabel?: string
}

export function expresswaySignNode(options: ExpresswaySignNodeOptions): ReactNode {
  const parsedCode = parseCode(options.code)
  const sign = options.kind ? { ...parsedCode, kind: options.kind } : parsedCode
  const nameLimit = sign.digits.length === 4 ? 6 : 4
  const name = Array.from((options.name ?? '').trim()).slice(0, nameLimit).join('')

  const named = Boolean(name)
  const naturalWidth = sign.digits.length === 1 ? 1000 : sign.digits.length === 2 ? 1250 : 1700
  const isProvincial = sign.kind === 'provincial'
  const isBeijingTianjinHebei = sign.kind === 'beijing-tianjin-hebei'
  const provinceLabel = cleanProvinceLabel(options.provinceLabel ?? '') || sign.provinceLabel || '粤'
  const bannerText = isProvincial ? `${provinceLabel}高速` : isBeijingTianjinHebei ? '京津冀高速' : '国家高速'
  const bannerColor = isProvincial ? YELLOW : isBeijingTianjinHebei ? YELLOW_GREEN : RED
  const bannerTextColor = isProvincial || isBeijingTianjinHebei ? BLACK : WHITE
  const bannerX = sign.digits.length === 4 ? 355 : isProvincial ? (sign.digits.length === 1 ? 250 : 359.1) : (sign.digits.length === 1 ? 150 : 275)
  const bannerWidth = sign.digits.length === 4 ? 990 : isProvincial ? 500 : 700
  const usesCompactFourDigitSuffix = sign.digits.length === 4 && !isBeijingTianjinHebei
  const mainCode = usesCompactFourDigitSuffix ? sign.code.slice(0, 3) : sign.code
  const mainX = isBeijingTianjinHebei && sign.digits.length === 4 ? 100 : sign.digits.length === 1 ? 150 : 90
  const mainWidth = isBeijingTianjinHebei && sign.digits.length === 4 ? 1500 : sign.digits.length === 1 ? 700 : 1070
  const mainMaxGap = isBeijingTianjinHebei && sign.digits.length === 4 ? 50 : sign.digits.length === 1 ? 85 : sign.digits.length === 2 ? 95 : 90
  const mainMinGap = named ? 0 : usesCompactFourDigitSuffix ? 25 : 50
  const mainFont = options.fontLatin
  const bannerY = named ? 110 : 80
  const content: ReactNode[] = [outlinedText(options.fontChinese, bannerText, bannerX, bannerY, bannerWidth, 100, bannerTextColor)]
  if (usesCompactFourDigitSuffix) {
    const mainLayout = textLayout(mainFont, mainCode, 450)
    const suffixLayout = textLayout(options.fontLatin, sign.code.slice(3), 300)
    const mainGap = textGap(mainLayout.usedWidth, mainLayout.glyphs.length, 1180, { maxGap: mainMaxGap, minGap: mainMinGap })
    const suffixGap = textGap(suffixLayout.usedWidth, suffixLayout.glyphs.length, sign.digits.endsWith('1') ? 280 : 340, { maxGap: sign.digits.endsWith('1') ? 35 : 55 })
    const mainContentWidth = mainLayout.usedWidth + mainGap * Math.max(0, mainLayout.glyphs.length - 1)
    const suffixContentWidth = suffixLayout.usedWidth + suffixGap * Math.max(0, suffixLayout.glyphs.length - 1)
    const groupGap = named ? 55 : 45
    const groupWidth = mainContentWidth + groupGap + suffixContentWidth
    const groupX = (naturalWidth - groupWidth) / 2 + (named ? 0 : 24)
    content.push(renderLayout(mainLayout, groupX, named ? 340 : 370, WHITE, mainGap))
    content.push(renderLayout(suffixLayout, groupX + mainContentWidth + groupGap, named ? 490 : 520, WHITE, suffixGap))
  } else {
    content.push(outlinedText(mainFont, mainCode, mainX, named ? 340 : 370, mainWidth, 450, WHITE, { maxGap: mainMaxGap, minGap: mainMinGap }))
  }
  if (named) {
    const nameWidth = sign.digits.length === 1 ? 800 : sign.digits.length === 2 ? 950 : 1400
    const nameX = sign.digits.length === 1 ? 100 : 150
    content.push(outlinedText(options.fontChinese, name, nameX, 860, nameWidth, 200, WHITE))
  }
  const naturalHeight = named ? 1200 : 1000
  const renderedWidth = options.width ?? naturalWidth
  const renderedHeight = options.height ?? naturalHeight

  return (
    <svg xmlns="http://www.w3.org/2000/svg" x={options.x} y={options.y} width={renderedWidth} height={renderedHeight} viewBox={`0 0 ${naturalWidth} ${naturalHeight}`} preserveAspectRatio="none" role={options.ariaLabel ? 'img' : undefined} aria-label={options.ariaLabel} aria-hidden={options.ariaLabel ? undefined : true}>
      {expresswayBackgroundNode(naturalWidth, named, bannerColor)}
      {content}
    </svg>
  )
}

export async function generateExpresswaySignSvg(inputCode: string, inputName = '', inputProvinceLabel = '', inputKind?: SignKind): Promise<string> {
  const [fontChinese, fontLatin] = await Promise.all([loadFont('a'), loadFont('b')])
  return renderToStaticMarkup(
    expresswaySignNode({
      code: inputCode,
      name: inputName,
      provinceLabel: inputProvinceLabel,
      kind: inputKind,
      fontChinese,
      fontLatin,
      ariaLabel: `${inputCode} ${inputName.trim()}`.trim() + ' 道路编号牌',
    }),
  )
}
