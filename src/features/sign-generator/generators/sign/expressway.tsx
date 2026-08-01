import type { Font } from '@pdf-lib/fontkit'
import { use } from 'react'
import type { ReactNode } from 'react'
import type { ExpresswayKind } from '../../types'
import {
  BLACK,
  GREEN,
  RED,
  WHITE,
  YELLOW,
  YELLOW_GREEN,
  loadFont,
  OutlinedText,
  Layout,
  textGap,
  textLayout,
} from '../svg-text'

interface ExpresswayBackgroundProps {
  width: number
  withName: boolean
  bannerColor: string
}
function ExpresswayBackground({ width, withName, bannerColor }: ExpresswayBackgroundProps) {
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
  return Array.from(String(value || '').trim())
    .slice(0, 1)
    .join('')
}

function parseCode(value: string): {
  code: string
  digits: string
  kind: ExpresswayKind
  provinceLabel: string
} {
  const code = String(value || '')
    .trim()
    .toUpperCase()
  const national = /^G(\d{1,4})$/.exec(code)
  if (national) return { code, digits: national[1], kind: 'national', provinceLabel: '' }

  const provincial = /^S(\d{1,4})$/.exec(code)
  if (provincial) return { code, digits: provincial[1], kind: 'provincial', provinceLabel: '粤' }

  const legacyProvincial = /^(.)(S(\d{1,4}))$/u.exec(code)
  if (legacyProvincial)
    return {
      code: legacyProvincial[2],
      digits: legacyProvincial[3],
      kind: 'provincial',
      provinceLabel: legacyProvincial[1],
    }

  throw new Error('请输入 1-4 位数字编号')
}

export function expresswaySignNaturalSize(
  code: string,
  name = '',
): { width: number; height: number } {
  const sign = parseCode(code)
  return {
    width:
      sign.digits.length === 1
        ? 1000
        : sign.digits.length === 2
          ? 1250
          : sign.digits.length === 3
            ? 1500
            : 1700,
    height: name.trim() ? 1200 : 1000,
  }
}

interface ExpresswaySignNodeOptions {
  code: string
  name?: string
  provinceLabel?: string
  kind?: ExpresswayKind
  fontChinese: Font
  fontLatin: Font
  x?: number
  y?: number
  width?: number
  height?: number
  ariaLabel?: string
  threeDigitDescend?: boolean
}

export function ExpresswaySignNode(
  options: ExpresswaySignNodeOptions & { inlineFourDigit?: boolean },
): ReactNode {
  const inlineFourDigit = options.inlineFourDigit ?? false
  const parsedCode = parseCode(options.code)
  const sign = options.kind ? { ...parsedCode, kind: options.kind } : parsedCode
  const nameLimit = sign.digits.length === 4 ? 6 : 4
  const name = Array.from((options.name ?? '').trim())
    .slice(0, nameLimit)
    .join('')

  const named = Boolean(name)
  const naturalSize = expresswaySignNaturalSize(options.code, name)
  const naturalWidth = naturalSize.width
  const isProvincial = sign.kind === 'provincial'
  const isBeijingTianjinHebei = sign.kind === 'beijing-tianjin-hebei'
  const provinceLabel =
    cleanProvinceLabel(options.provinceLabel ?? '') || sign.provinceLabel || '粤'
  const bannerText = isProvincial
    ? `${provinceLabel}高速`
    : isBeijingTianjinHebei
      ? '京津冀高速'
      : '国家高速'
  const bannerColor = isProvincial ? YELLOW : isBeijingTianjinHebei ? YELLOW_GREEN : RED
  const bannerTextColor = isProvincial || isBeijingTianjinHebei ? BLACK : WHITE
  const usesThreeDigitLayout = sign.digits.length === 3
  const usesFourDigitLayout = sign.digits.length === 4
  const bannerX = usesThreeDigitLayout
    ? 305
    : usesFourDigitLayout
      ? 355
      : isProvincial
        ? sign.digits.length === 1
          ? 250
          : 359.1
        : sign.digits.length === 1
          ? 150
          : 275
  const bannerWidth = usesThreeDigitLayout
    ? 890
    : usesFourDigitLayout
      ? 990
      : isProvincial
        ? 500
        : 700
  const usesInlineFourDigit = sign.digits.length === 4 && inlineFourDigit
  const usesCompactFourDigitSuffix =
    sign.digits.length === 4 && !isBeijingTianjinHebei && !usesInlineFourDigit
  const usesCompactThreeDigitSuffix = usesThreeDigitLayout && options.threeDigitDescend
  const usesCompactSuffix = usesCompactFourDigitSuffix || usesCompactThreeDigitSuffix
  const mainCode = usesCompactSuffix ? sign.code.slice(0, 3) : sign.code
  const usesWideFourDigitLayout =
    usesFourDigitLayout && (isBeijingTianjinHebei || usesInlineFourDigit)
  const mainX =
    usesThreeDigitLayout || usesWideFourDigitLayout ? 100 : sign.digits.length === 1 ? 150 : 90
  const mainWidth = usesThreeDigitLayout
    ? 1300
    : usesWideFourDigitLayout
      ? 1500
      : sign.digits.length === 1
        ? 700
        : 1070
  const mainMaxGap = usesThreeDigitLayout
    ? 45
    : usesWideFourDigitLayout
      ? 50
      : sign.digits.length === 1
        ? 85
        : sign.digits.length === 2
          ? 95
          : 90
  const mainMinGap = named
    ? 0
    : usesCompactSuffix
      ? 25
      : usesInlineFourDigit
        ? 0
        : usesThreeDigitLayout
          ? 35
          : 50
  const mainY = named ? 340 : 370
  const mainFont = options.fontLatin
  const bannerY = named ? 110 : 80
  const content: ReactNode[] = [
    <OutlinedText
      key="banner"
      font={options.fontChinese}
      text={bannerText}
      startX={bannerX}
      startY={bannerY}
      width={bannerWidth}
      height={100}
      fill={bannerTextColor}
    />,
  ]
  if (usesCompactSuffix) {
    const suffixText = sign.code.slice(3)
    const mainLayout = textLayout(mainFont, mainCode, 450)
    const suffixLayout = textLayout(options.fontLatin, suffixText, 300)
    const mainGap = textGap(
      mainLayout.usedWidth,
      mainLayout.glyphs.length,
      usesCompactThreeDigitSuffix ? 920 : 1180,
      { maxGap: mainMaxGap, minGap: mainMinGap },
    )
    const suffixTargetWidth = sign.digits.endsWith('1') ? 400 : 420
    const suffixGap = textGap(
      suffixLayout.usedWidth,
      suffixLayout.glyphs.length,
      suffixTargetWidth,
      { minGap: 50, maxGap: 50 },
    )
    const mainContentWidth =
      mainLayout.usedWidth + mainGap * Math.max(0, mainLayout.glyphs.length - 1)
    const suffixContentWidth =
      suffixLayout.usedWidth + suffixGap * Math.max(0, suffixLayout.glyphs.length - 1)
    const groupGap = usesCompactThreeDigitSuffix ? 55 : named ? 55 : 45
    const groupWidth = mainContentWidth + groupGap + suffixContentWidth
    const groupX = (naturalWidth - groupWidth) / 2 + (named ? 0 : 24)
    content.push(
      <Layout key="main" layout={mainLayout} startX={groupX} startY={mainY} gap={mainGap}>
        {WHITE}
      </Layout>,
    )
    content.push(
      <Layout
        key="suffix"
        layout={suffixLayout}
        startX={groupX + mainContentWidth + groupGap}
        startY={named ? 490 : 520}
        gap={suffixGap}
      >
        {WHITE}
      </Layout>,
    )
  } else {
    content.push(
      <OutlinedText
        key="main"
        font={mainFont}
        text={mainCode}
        startX={mainX}
        startY={mainY}
        width={mainWidth}
        height={450}
        fill={WHITE}
        options={{ maxGap: mainMaxGap, minGap: mainMinGap }}
      />,
    )
  }
  if (named) {
    const nameWidth =
      sign.digits.length === 1
        ? 800
        : sign.digits.length === 2
          ? 950
          : sign.digits.length === 3
            ? 1200
            : 1400
    const nameX = sign.digits.length === 1 ? 100 : 150
    content.push(
      <OutlinedText
        key="name"
        font={options.fontChinese}
        text={name}
        startX={nameX}
        startY={860}
        width={nameWidth}
        height={200}
        fill={WHITE}
      />,
    )
  }
  const naturalHeight = naturalSize.height
  const renderedWidth = options.width ?? naturalWidth
  const renderedHeight = options.height ?? naturalHeight

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x={options.x}
      y={options.y}
      width={renderedWidth}
      height={renderedHeight}
      viewBox={`0 0 ${naturalWidth} ${naturalHeight}`}
      preserveAspectRatio="xMidYMid meet"
      role={options.ariaLabel ? 'img' : undefined}
      aria-label={options.ariaLabel}
      aria-hidden={options.ariaLabel ? undefined : true}
    >
      <ExpresswayBackground width={naturalWidth} withName={named} bannerColor={bannerColor} />
      {content}
    </svg>
  )
}

interface ExpresswaySignSvgProps {
  code: string
  name?: string
  provinceLabel?: string
  kind?: ExpresswayKind
  threeDigitDescend?: boolean
  x?: number
  y?: number
  width?: number
  height?: number
  ariaLabel?: string
}

export function ExpresswaySignSvg({
  code,
  name = '',
  provinceLabel = '',
  kind,
  threeDigitDescend = false,
  x,
  y,
  width,
  height,
  ariaLabel,
}: ExpresswaySignSvgProps): ReactNode {
  const fontChinese = use(loadFont('a'))
  const fontLatin = use(loadFont('b'))
  return (
    <ExpresswaySignNode
      code={code}
      name={name}
      provinceLabel={provinceLabel}
      kind={kind}
      threeDigitDescend={threeDigitDescend}
      x={x}
      y={y}
      width={width}
      height={height}
      fontChinese={fontChinese}
      fontLatin={fontLatin}
      ariaLabel={ariaLabel ?? `${`${code} ${name.trim()}`.trim()} 道路编号牌`}
    />
  )
}
