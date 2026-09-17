import type {
  DestinationDistanceItem, Sign,
} from '@/lib/types'

import {
  useFont,
} from '../fonts/FontContext'
import {
  expresswaySignNaturalSize,
} from './sign/expressway'
import {
  RouteSignNode,
} from './sign/route-sign'
import {
  urbanExpresswayRoadNameNaturalSize,
} from './sign/urban-expressway-road-name'
import {
  UrbanRoadNameSign,
} from './sign/urban-road-name'
import {
  OutlinedText,
} from './svg-text'

import type {
  Font,
} from '@pdf-lib/fontkit'

const WIDTH = 1000
const HORIZONTAL_PADDING = 54
const VERTICAL_PADDING = 42
const TEXT_AREA_WIDTH = 590
const DISTANCE_X = 672
const WHITE = '#FFFFFF'
const BACKGROUND_COLORS = {
  green: '#299B48',
  blue: '#2C64AD',
  brown: '#8A5A32',
} as const

function roadSignWidth(sign: Sign, height: number, fontChinese: Font) {
  if (sign.template === 'ordinary-road') { return height * 213.51 / 102.59 }
  if (sign.template === 'urban-expressway-road-name') {
    const size = urbanExpresswayRoadNameNaturalSize(fontChinese, sign.urbanRoadName)
    return height * size.width / size.height
  }
  if (sign.template === 'urban-road-name') { return height * 760 / 300 }
  const size = expresswaySignNaturalSize(sign.code)
  return height * size.width / size.height
}

function RoadSignContent({
  selected,
  roadSignList,
  fontChinese,
  fontLatin,
  y,
  height,
}: {
  selected: Sign
  roadSignList: Sign[]
  fontChinese: Font
  fontLatin: Font
  y: number
  height: number
}) {
  const signHeight = Math.min(112, height - 14)
  const naturalWidth = roadSignWidth(selected, signHeight, fontChinese)
  const width = Math.min(TEXT_AREA_WIDTH - 40, naturalWidth)
  const renderedHeight = naturalWidth > TEXT_AREA_WIDTH - 40
    ? signHeight * (TEXT_AREA_WIDTH - 40) / naturalWidth
    : signHeight
  const x = HORIZONTAL_PADDING + 8
  const signY = y + (height - renderedHeight) / 2
  if (selected.template === 'urban-road-name') {
    return <UrbanRoadNameSign
      name={selected.urbanRoadName}
      style={selected.urbanRoadStyle}
      routeSign={roadSignList.find(sign => sign.id === selected.urbanRoadRouteSignId)}
      x={x}
      y={signY}
      width={width}
      height={renderedHeight}
    />
  }
  return <RouteSignNode
    code={selected.template === 'urban-expressway-road-name'
      ? selected.urbanRoadName
      : selected.code}
    kind={selected.template === 'urban-expressway-road-name'
      ? 'urban-expressway'
      : selected.kind}
    provinceLabel={selected.provinceLabel}
    threeDigitDescend={selected.threeDigitDescend}
    fontChinese={fontChinese}
    fontLatin={fontLatin}
    x={x}
    y={signY}
    width={width}
    height={renderedHeight}
  />
}

function DestinationContent({
  item,
  roadSignList,
  fontChinese,
  fontLatin,
  y,
  rowHeight,
}: {
  item: DestinationDistanceItem
  roadSignList: Sign[]
  fontChinese: Font
  fontLatin: Font
  y: number
  rowHeight: number
}) {
  const englishVisible = item.englishEnabled && Boolean(item.english.trim())
  const mainHeight = englishVisible ? rowHeight * 0.6 : rowHeight
  const selected = item.type === 'road-sign'
    ? roadSignList.find(sign => sign.id === item.roadSignId)
    : undefined
  return <g>
    {selected ? <RoadSignContent
      selected={selected}
      roadSignList={roadSignList}
      fontChinese={fontChinese}
      fontLatin={fontLatin}
      y={y}
      height={mainHeight}
    /> : <OutlinedText
      font={fontChinese}
      text={item.type === 'text' ? item.text.trim() : '请选择标牌'}
      startX={HORIZONTAL_PADDING + 8}
      startY={y + 12}
      width={TEXT_AREA_WIDTH - 16}
      height={mainHeight - 24}
      fill={WHITE}
      options={{
        align: 'start',
        minGap: 6,
        maxGap: 22,
        scaleMode: 'reference',
        referenceText: '廊坊天津',
      }}
    />}
    {englishVisible && <OutlinedText
      font={fontLatin}
      text={item.english.trim()}
      startX={HORIZONTAL_PADDING + 8}
      startY={y + mainHeight + 3}
      width={TEXT_AREA_WIDTH - 16}
      height={rowHeight - mainHeight - 12}
      fill={WHITE}
      options={{
        align: 'start', minGap: 2, maxGap: 10,
      }}
    />}
  </g>
}

function DistanceContent({
  item,
  fontLatin,
  y,
  rowHeight,
}: {
  item: DestinationDistanceItem
  fontLatin: Font
  y: number
  rowHeight: number
}) {
  const numberHeight = Math.min(104, rowHeight * 0.72)
  const unitHeight = numberHeight * 0.48
  const numberWidth = 174
  const unitWidth = 84
  const contentY = y + (rowHeight - numberHeight) / 2
  return <g>
    <OutlinedText
      font={fontLatin}
      text={item.distance || '0'}
      startX={DISTANCE_X}
      startY={contentY}
      width={numberWidth}
      height={numberHeight}
      fill={WHITE}
      options={{
        minGap: 2, maxGap: 10,
        scaleMode: 'reference',
        referenceText: '0123456789',
      }}
    />
    <OutlinedText
      font={fontLatin}
      text={item.unit}
      startX={DISTANCE_X + numberWidth + 8}
      startY={contentY + numberHeight - unitHeight - 5}
      width={unitWidth}
      height={unitHeight}
      fill={WHITE}
      options={{
        minGap: 2, maxGap: 6,
        scaleMode: 'reference',
        referenceText: 'km',
      }}
    />
  </g>
}

export function DestinationDistanceSign({
  sign,
  roadSignList,
}: {
  sign: Sign
  roadSignList: Sign[]
}) {
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  const config = sign.destinationDistanceConfig
  const rowHeights = config.items.map(
    item => item.englishEnabled && item.english.trim() ? 178 : 142,
  )
  const height = VERTICAL_PADDING * 2 + rowHeights.reduce((sum, rowHeight) => sum + rowHeight, 0)
  const background = BACKGROUND_COLORS[config.background]

  return <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={`0 0 ${WIDTH} ${height}`}
    role="img"
    aria-label="地点距离标识"
  >
    <rect width={WIDTH} height={height} rx="42" fill={background} />
    <rect
      x="17"
      y="17"
      width={WIDTH - 34}
      height={height - 34}
      rx="29"
      fill="none"
      stroke={WHITE}
      strokeWidth="10"
    />
    {config.items.map((item, index) => {
      const rowHeight = rowHeights[index]
      const y = VERTICAL_PADDING + rowHeights
        .slice(0, index)
        .reduce((sum, previousHeight) => sum + previousHeight, 0)
      return <g key={item.id} aria-label={`${item.text || '道路标牌'} ${item.distance}${item.unit}`}>
        <DestinationContent
          item={item}
          roadSignList={roadSignList}
          fontChinese={fontChinese}
          fontLatin={fontLatin}
          y={y}
          rowHeight={rowHeight}
        />
        <DistanceContent item={item} fontLatin={fontLatin} y={y} rowHeight={rowHeight} />
      </g>
    })}
  </svg>
}
