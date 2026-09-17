import type {
  ExpresswayKind, OrdinaryRoadKind, Sign, UrbanRoadStyle,
} from '@/lib/types'

import {
  useFont,
} from '../../fonts/FontContext'
import {
  OutlinedText,
} from '../svg-text'
import {
  ExpresswaySignNode, expresswaySignNaturalSize,
} from './expressway'
import {
  OrdinaryRoadSignSvg,
} from './ordinary_road'

const WIDTH = 760
const HEIGHT = 300
const BLUE = '#2C64AD'
const WHITE = '#FFFFFF'

function wrapRoadName(text: string, maxLines = 2) {
  const characters = Array.from(text)
  if (characters.length <= 8 || maxLines === 1) { return [text] }
  const splitAt = Math.ceil(characters.length / 2)
  return [
    characters.slice(0, splitAt).join(''),
    characters.slice(splitAt).join(''),
  ]
}

function StraightArrow() {
  return <path
    d="M72 238V108H35L104 35l69 73h-37v130z"
    fill={WHITE}
  />
}

function RoadNameText({
  text,
  startX,
  width,
}: {
  text: string
  startX: number
  width: number
}) {
  const font = useFont('a')
  const lines = wrapRoadName(text)
  const lineHeight = lines.length === 1 ? 128 : 82
  const gap = lines.length === 1 ? 0 : 20
  const totalHeight = lineHeight * lines.length + gap * (lines.length - 1)
  const startY = (HEIGHT - totalHeight) / 2
  return <>
    {lines.map((line, index) => <OutlinedText
      key={`${line}-${index}`}
      font={font}
      text={line}
      startX={startX}
      startY={startY + index * (lineHeight + gap)}
      width={width}
      height={lineHeight}
      fill={WHITE}
      options={{
        minGap: 8,
        maxGap: 26,
        scaleMode: 'reference',
        referenceText: '南京路',
      }}
    />)}
  </>
}

function NumberedRouteSign({
  sign,
}: { sign?: Sign }) {
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  if (!sign) {
    return <OrdinaryRoadSignSvg
      kind="ordinary-provincial"
      digits="206"
      x={282}
      y={70}
      width={360}
      height={173}
    />
  }
  if (sign.template === 'ordinary-road') {
    return <OrdinaryRoadSignSvg
      kind={sign.kind as OrdinaryRoadKind}
      digits={sign.digits}
      x={282}
      y={70}
      width={360}
      height={173}
    />
  }
  const naturalSize = expresswaySignNaturalSize(sign.code)
  const height = 174
  const width = Math.min(400, naturalSize.width / naturalSize.height * height)
  return <ExpresswaySignNode
    code={sign.code}
    kind={sign.kind as ExpresswayKind}
    provinceLabel={sign.provinceLabel}
    threeDigitDescend={sign.threeDigitDescend}
    fontChinese={fontChinese}
    fontLatin={fontLatin}
    x={282 + (360 - width) / 2}
    y={70}
    width={width}
    height={height}
  />
}

export function UrbanRoadNameSign({
  name,
  style = 'bidirectional',
  routeSign,
  x,
  y,
  width: renderedWidth,
  height: renderedHeight,
}: {
  name: string
  style?: UrbanRoadStyle
  routeSign?: Sign
  x?: number
  y?: number
  width?: number
  height?: number
}) {
  const text = Array.from(String(name || '').trim()).slice(0, 24).join('') || '南京路'
  const label = style === 'straight-route'
    ? `${routeSign?.code || 'S206'} 城市道路编号指引标识`
    : `${text} 城市道路名称标识`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      x={x}
      y={y}
      width={renderedWidth ?? WIDTH}
      height={renderedHeight ?? HEIGHT}
      role="img"
      aria-label={label}
    >
      {style === 'right-chevron' ? <>
        <path
          d="M50 9H640c18 0 29 8 39 23l72 118-72 118c-10 15-21 23-39 23H50C27 291 9 273 9 250V50C9 27 27 9 50 9z"
          fill={BLUE}
        />
        <path
          d="M52 27h575c15 0 23 5 31 18l64 105-64 105c-8 13-16 18-31 18H52c-14 0-25-11-25-25V52c0-14 11-25 25-25z"
          fill="none"
          stroke={WHITE}
          strokeWidth="10"
        />
        <path d="m641 50 60 100-60 100h-31l60-100-60-100z" fill={WHITE} />
        <RoadNameText text={text} startX={50} width={540} />
      </> : <>
        <rect width={WIDTH} height={HEIGHT} rx="48" fill={BLUE} />
        <rect
          x="16"
          y="16"
          width={WIDTH - 32}
          height={HEIGHT - 32}
          rx="35"
          fill="none"
          stroke={WHITE}
          strokeWidth="10"
        />
        {style === 'bidirectional' && <>
          <path d="m52 150 42-58v116z" fill={WHITE} />
          <path d="m708 150-42-58v116z" fill={WHITE} />
          <RoadNameText text={text} startX={112} width={536} />
        </>}
        {style === 'plain' && <RoadNameText text={text} startX={64} width={632} />}
        {style === 'straight-text' && <>
          <StraightArrow />
          <RoadNameText text={text} startX={190} width={510} />
        </>}
        {style === 'straight-route' && <>
          <StraightArrow />
          <NumberedRouteSign sign={routeSign} />
        </>}
      </>}
    </svg>
  )
}
