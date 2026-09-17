import type {
  IntersectionDirection, IntersectionItem, Sign,
} from '@/lib/types'

import {
  useFont,
} from '../../fonts/FontContext'
import {
  expresswaySignNaturalSize,
} from '../sign/expressway'
import {
  RouteSignNode,
} from '../sign/route-sign'
import {
  urbanExpresswayRoadNameNaturalSize,
} from '../sign/urban-expressway-road-name'
import {
  OutlinedText,
} from '../svg-text'

import type {
  Font,
} from '@pdf-lib/fontkit'

const WIDTH = 1000
const HEIGHT = 620
const BLUE = '#2C64AD'
const WHITE = '#FFFFFF'
const RED = '#EE2525'

interface DirectionArea {
  x: number
  y: number
  width: number
  height: number
}

type ContentRow =
  | { key: string; type: 'text'; text: string }
  | { key: string; type: 'road-sign'; sign: Sign }

const DIRECTION_AREAS: Record<IntersectionDirection, DirectionArea> = {
  left: {
    x: 40, y: 290, width: 180, height: 220,
  },
  straight: {
    x: 350, y: 38, width: 300, height: 118,
  },
  right: {
    x: 780, y: 290, width: 180, height: 220,
  },
}

function activeItems(items: IntersectionItem[], roadSignList: Sign[]) {
  return items.filter(item => item.type === 'text'
    ? Boolean(item.text.trim())
    : roadSignList.some(sign => sign.id === item.roadSignId))
}

function splitLongLine(text: string) {
  const characters = Array.from(text.trim())
  if (characters.length <= 10) { return [text.trim()] }
  const splitAt = Math.ceil(characters.length / 2)
  return [characters.slice(0, splitAt).join(''), characters.slice(splitAt).join('')]
}

function routeWidth(sign: Sign, height: number, fontChinese: Font) {
  if (sign.template === 'ordinary-road') { return height * 213.51 / 102.59 }
  if (sign.template === 'urban-expressway-road-name') {
    const size = urbanExpresswayRoadNameNaturalSize(fontChinese, sign.urbanRoadName)
    return height * size.width / size.height
  }
  const size = expresswaySignNaturalSize(sign.code)
  return height * size.width / size.height
}

function DirectionContents({
  items,
  area,
  roadSignList,
  fontChinese,
  fontLatin,
}: {
  items: IntersectionItem[]
  area: DirectionArea
  roadSignList: Sign[]
  fontChinese: Font
  fontLatin: Font
}) {
  const rows: ContentRow[] = items.flatMap<ContentRow>((item) => {
    if (item.type === 'text') {
      return splitLongLine(item.text).map((text, index) => ({
        key: `${item.id}-text-${index}`,
        type: 'text' as const,
        text,
      }))
    }
    const sign = roadSignList.find(candidate => candidate.id === item.roadSignId)
    return sign ? [{
      key: `${item.id}-sign`, type: 'road-sign' as const, sign,
    }] : []
  })
  const rowHeight = Math.min(92, area.height / Math.max(1, rows.length))
  const totalHeight = rows.length * rowHeight
  const startY = area.y + (area.height - totalHeight) / 2

  return <>
    {rows.map((row, index) => {
      const y = startY + index * rowHeight
      if (row.type === 'text') {
        return <OutlinedText
          key={row.key}
          font={fontChinese}
          text={row.text}
          startX={area.x}
          startY={y + (rowHeight - Math.min(56, rowHeight * 0.72)) / 2}
          width={area.width}
          height={Math.min(56, rowHeight * 0.72)}
          fill={WHITE}
          options={{
            minGap: 4,
            maxGap: 18,
            scaleMode: 'reference',
            referenceText: '北京路',
          }}
        />
      }
      const height = Math.max(18, rowHeight * 0.9)
      const naturalWidth = routeWidth(row.sign, height, fontChinese)
      const width = Math.min(area.width, naturalWidth)
      const isUrbanExpressway = row.sign.template === 'urban-expressway-road-name'
      return <RouteSignNode
        key={row.key}
        code={isUrbanExpressway ? row.sign.urbanRoadName : row.sign.code}
        kind={isUrbanExpressway ? 'urban-expressway' : row.sign.kind}
        provinceLabel={row.sign.provinceLabel}
        threeDigitDescend={row.sign.threeDigitDescend}
        fontChinese={fontChinese}
        fontLatin={fontLatin}
        x={area.x + (area.width - width) / 2}
        y={y + (rowHeight - height) / 2}
        width={width}
        height={height}
      />
    })}
  </>
}

function CenterRoadLabel({
  text, font,
}: { text: string; font: Font }) {
  const lines = splitLongLine(text)
  const lineHeight = lines.length === 1 ? 62 : 38
  const gap = lines.length === 1 ? 0 : 8
  const totalHeight = lines.length * lineHeight + (lines.length - 1) * gap
  const startY = 400 - totalHeight / 2

  return <g>
    <path
      d="M350 400l30-45h240l30 45-30 45H380z"
      fill={BLUE}
      stroke={WHITE}
      strokeWidth="8"
      strokeLinejoin="round"
    />
    {lines.map((line, index) => <OutlinedText
      key={`${line}-${index}`}
      font={font}
      text={line}
      startX={405}
      startY={startY + index * (lineHeight + gap)}
      width={190}
      height={lineHeight}
      fill={WHITE}
      options={{
        minGap: 3,
        maxGap: 12,
        scaleMode: 'reference',
        referenceText: '南京路',
      }}
    />)}
  </g>
}

function Branch({
  direction, open,
}: { direction: IntersectionDirection; open: boolean }) {
  if (direction === 'straight') {
    return open
      ? <path d="M482 365V220h-37l55-65 55 65h-37v145z" fill={WHITE} />
      : <>
        <rect x="482" y="205" width="36" height="160" fill={WHITE} />
        <rect x="440" y="185" width="120" height="34" rx="4" fill={RED} />
      </>
  }
  if (direction === 'left') {
    return open
      ? <path d="M390 382H300v-34l-62 52 62 52v-34h90z" fill={WHITE} />
      : <>
        <rect x="300" y="382" width="90" height="36" fill={WHITE} />
        <rect x="284" y="350" width="32" height="100" rx="4" fill={RED} />
      </>
  }
  return open
    ? <path d="M610 382h90v-34l62 52-62 52v-34h-90z" fill={WHITE} />
    : <>
      <rect x="610" y="382" width="90" height="36" fill={WHITE} />
      <rect x="684" y="350" width="32" height="100" rx="4" fill={RED} />
    </>
}

export function IntersectionGuidanceSign({
  sign,
  roadSignList,
}: {
  sign: Sign
  roadSignList: Sign[]
}) {
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  const directions = sign.intersectionConfig.directions
  const active = {
    left: activeItems(directions.left, roadSignList),
    straight: activeItems(directions.straight, roadSignList),
    right: activeItems(directions.right, roadSignList),
  }
  const centerRoadName = sign.intersectionConfig.centerRoadName.trim()

  return <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
    role="img"
    aria-label={`${centerRoadName || '未命名'}交叉路口指路标志`}
  >
    <rect width={WIDTH} height={HEIGHT} rx="34" fill={BLUE} />
    <rect
      x="18"
      y="18"
      width={WIDTH - 36}
      height={HEIGHT - 36}
      rx="22"
      fill="none"
      stroke={WHITE}
      strokeWidth="10"
    />
    <rect x="482" y="435" width="36" height="110" fill={WHITE} />
    <Branch direction="left" open={active.left.length > 0} />
    <Branch direction="straight" open={active.straight.length > 0} />
    <Branch direction="right" open={active.right.length > 0} />
    {(Object.keys(active) as IntersectionDirection[]).map(direction => <DirectionContents
      key={direction}
      items={active[direction]}
      area={DIRECTION_AREAS[direction]}
      roadSignList={roadSignList}
      fontChinese={fontChinese}
      fontLatin={fontLatin}
    />)}
    <CenterRoadLabel text={centerRoadName} font={fontChinese} />
    <g aria-label={`${sign.intersectionConfig.cardinalDirection}方位`}>
      <rect x="38" y="38" width="62" height="62" rx="4" fill={WHITE} />
      <OutlinedText
        font={fontChinese}
        text={sign.intersectionConfig.cardinalDirection}
        startX={48}
        startY={48}
        width={42}
        height={42}
        fill={BLUE}
      />
    </g>
  </svg>
}
