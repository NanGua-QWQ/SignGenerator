import type {
  CrossroadsItem, IntersectionItem, Sign,
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

const BLUE = '#2864B7'
const WHITE = '#FFFFFF'

function HorizontalText({
  text, x, y, width, height, font,
}: { text: string; x: number; y: number; width: number; height: number; font: Font }) {
  if (!text) { return null }
  return <OutlinedText
    font={font}
    text={text}
    startX={x}
    startY={y}
    width={width}
    height={height}
    fill={WHITE}
    options={{
      align: 'center', minGap: 2, maxGap: 12, scaleMode: 'reference', referenceText: '湖山路',
    }}
  />
}

function VerticalText({
  text, x, y, maxHeight, font, size = 53,
}: { text: string; x: number; y: number; maxHeight: number; font: Font; size?: number }) {
  const chars = Array.from(text)
  if (!chars.length) { return null }
  const step = Math.min(size + 4, maxHeight / chars.length)
  const glyphSize = Math.min(size, step - 2)
  const top = y + (maxHeight - step * chars.length) / 2
  return <g aria-label={text}>
    {chars.map((char, index) => <OutlinedText
      key={`${index}-${char}`}
      font={font}
      text={char}
      startX={x}
      startY={top + index * step}
      width={glyphSize}
      height={glyphSize}
      fill={WHITE}
    />)}
  </g>
}

function SideRoads({
  roads, x, roadSignList, fontChinese, fontLatin,
}: {
  roads: IntersectionItem[]; x: number; roadSignList: Sign[]
  fontChinese: Font; fontLatin: Font
}) {
  const active = roads.flatMap((road) => {
    const sign = road.type === 'road-sign'
      ? roadSignList.find(candidate => candidate.id === road.roadSignId) : undefined
    return road.type === 'text' && road.text.trim() || sign ? [{
      road, sign,
    }] : []
  }).slice(0, 3)
  if (!active.length) { return null }
  const slotWidth = 160 / active.length
  const size = Math.min(51, slotWidth - 6)
  return <g aria-label={active.map(({
    road, sign,
  }) => sign?.code || road.text).join('、')}>
    {active.map(({
      road, sign,
    }, index) => {
      const slotX = x + index * slotWidth
      if (!sign) { return <VerticalText key={road.id}
        text={road.text} x={slotX + (slotWidth - size) / 2}
        y={139} maxHeight={328} font={fontChinese} size={size}
      /> }
      // Keep the shield upright and fit its full width inside this edge lane.
      const signHeight = Math.min(86, (slotWidth - 12) / roadSignWidth(sign, 1, fontChinese))
      const signWidth = roadSignWidth(sign, signHeight, fontChinese)
      const centerX = slotX + slotWidth / 2
      const centerY = 303
      const isUrbanExpressway = sign.template === 'urban-expressway-road-name'
      return <g key={road.id}>
        <RouteSignNode
          code={isUrbanExpressway ? sign.urbanRoadName : sign.code}
          kind={isUrbanExpressway ? 'urban-expressway' : sign.kind}
          provinceLabel={sign.provinceLabel}
          threeDigitDescend={sign.threeDigitDescend}
          fontChinese={fontChinese} fontLatin={fontLatin}
          x={centerX - signWidth / 2} y={centerY - signHeight / 2}
          width={signWidth} height={signHeight}
        />
      </g>
    })}
  </g>
}

interface ItemArea {
  x: number
  y: number
  width: number
  height: number
  layout: 'row' | 'column'
}

function roadSignWidth(sign: Sign, height: number, fontChinese: Font) {
  if (sign.template === 'ordinary-road') { return height * 213.51 / 102.59 }
  if (sign.template === 'urban-expressway-road-name') {
    const size = urbanExpresswayRoadNameNaturalSize(fontChinese, sign.urbanRoadName)
    return height * size.width / size.height
  }
  const size = expresswaySignNaturalSize(sign.code)
  return height * size.width / size.height
}

function DirectionItems({
  items, area, roadSignList, fontChinese, fontLatin,
}: {
  items: CrossroadsItem[]
  area: ItemArea
  roadSignList: Sign[]
  fontChinese: Font
  fontLatin: Font
}) {
  const active = items.flatMap((item) => {
    const roadSign = item.type === 'road-sign'
      ? roadSignList.find(sign => sign.id === item.roadSignId)
      : undefined
    return item.type === 'text' && item.text.trim() || roadSign
      ? [{
        item, roadSign,
      }] : []
  })
  if (!active.length) { return null }

  const columns = area.layout === 'column' ? 1 : active.length <= 3
    ? active.length : Math.ceil(active.length / 2)
  const rows = Math.ceil(active.length / columns)
  const cellWidth = area.width / columns
  const cellHeight = area.height / rows

  return <g aria-label={`${active.length} 个目标道路`}>
    {active.map(({
      item, roadSign,
    }, index) => {
      const row = Math.floor(index / columns)
      const itemsInRow = Math.min(columns, active.length - row * columns)
      const column = index % columns
      const x = area.x + (area.width - cellWidth * itemsInRow) / 2 + column * cellWidth + 5
      const y = area.y + row * cellHeight + 3
      const width = cellWidth - 10
      const height = cellHeight - 6
      const rowHasDistance = active.slice(row * columns, (row + 1) * columns)
        .some(({
          item: rowItem,
        }) => Boolean(rowItem.distance))
      const distanceHeight = rowHasDistance ? Math.min(28, height * 0.34) : 0
      const labelHeight = Math.min(height - distanceHeight - 2, area.layout === 'row' ? 54 : 50)
      const labelY = y + (height - distanceHeight - labelHeight) / 2

      return <g key={item.id} aria-label={roadSign?.code || item.text}>
        {roadSign ? (() => {
          // Match the lettering inside the route shield to the adjacent road-name glyphs.
          // The ordinary-road code occupies 57 of its 102.59 viewBox units.
          const codeHeightShare = roadSign.template === 'ordinary-road'
            ? 57 / 102.59
            : roadSign.template === 'urban-expressway-road-name' ? 150 / 360 : 450 / 1000
          const availableSignHeight = height - (item.distance ? distanceHeight : 0) - 2
          const signHeight = Math.min(availableSignHeight, labelHeight / codeHeightShare)
          const renderedWidth = Math.min(width, roadSignWidth(roadSign, signHeight, fontChinese))
          const isUrbanExpressway = roadSign.template === 'urban-expressway-road-name'
          return <RouteSignNode
            code={isUrbanExpressway ? roadSign.urbanRoadName : roadSign.code}
            kind={isUrbanExpressway ? 'urban-expressway' : roadSign.kind}
            provinceLabel={roadSign.provinceLabel}
            threeDigitDescend={roadSign.threeDigitDescend}
            fontChinese={fontChinese}
            fontLatin={fontLatin}
            x={x + (width - renderedWidth) / 2}
            y={labelY + (labelHeight - signHeight) / 2}
            width={renderedWidth}
            height={signHeight}
          />
        })() : <>
          {item.highlighted && <rect
            x={x + 2} y={labelY - 2} width={width - 4} height={labelHeight + 4}
            fill="#148050" stroke={WHITE} strokeWidth="2"
          />}
          <HorizontalText
            text={item.text} x={x + 8} y={labelY} width={width - 16}
            height={labelHeight} font={fontChinese}
          />
        </>}
        {item.distance && <HorizontalText
          text={item.distance} x={x} y={y + height - distanceHeight}
          width={width} height={distanceHeight} font={fontChinese}
        />}
      </g>
    })}
  </g>
}

export function CrossroadsGuidanceSign({
  sign, roadSignList,
}: { sign: Sign; roadSignList: Sign[] }) {
  const fontChinese = useFont('han')
  const fontLatin = useFont('b')
  const config = sign.crossroadsConfig

  return <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1000 560"
    role="img"
    aria-label={`${config.centerRoad || '未命名'}十字路口图形式指路标志`}
  >
    <rect width="1000" height="560" rx="18" fill={BLUE} />
    <rect x="12" y="12" width="976" height="536" rx="9" fill="none" stroke={WHITE} strokeWidth="8" />

    {config.cardinalDirection && <g aria-label={`${config.cardinalDirection}方位`}>
      <rect x="26" y="26" width="70" height="70" fill={WHITE} />
      <OutlinedText
        font={fontChinese}
        text={config.cardinalDirection}
        startX={37}
        startY={37}
        width={48}
        height={48}
        fill={BLUE}
      />
    </g>}

    <DirectionItems
      items={config.directions.straight}
      area={{
        x: 180, y: 30, width: 640, height: 120, layout: 'row',
      }}
      roadSignList={roadSignList} fontChinese={fontChinese} fontLatin={fontLatin}
    />

    <path d="M234 232 H365 Q425 232 425 177 V159 M234 379 H365 Q425 379 425 434 V460 M766 232 H635 Q575 232 575 177 V159 M766 379 H635 Q575 379 575 434 V460"
      fill="none" stroke={WHITE} strokeWidth="9" strokeLinejoin="round" strokeLinecap="square" />

    <DirectionItems
      items={config.directions.left.slice(0, 1).map(item => ({
        ...item, distance: '',
      }))}
      area={{
        x: 238, y: 250, width: 180, height: 112, layout: 'column',
      }}
      roadSignList={roadSignList} fontChinese={fontChinese} fontLatin={fontLatin}
    />
    <DirectionItems
      items={config.directions.right.slice(0, 1).map(item => ({
        ...item, distance: '',
      }))}
      area={{
        x: 582, y: 250, width: 180, height: 112, layout: 'column',
      }}
      roadSignList={roadSignList} fontChinese={fontChinese} fontLatin={fontLatin}
    />
    <VerticalText
      text={config.centerRoad} x={475} y={160} maxHeight={300} font={fontChinese} size={48}
    />
    <SideRoads roads={config.leftSideRoads} x={45} roadSignList={roadSignList}
      fontChinese={fontChinese} fontLatin={fontLatin} />
    <HorizontalText
      text={config.leftSideDistance} x={48} y={476} width={195} height={43} font={fontChinese}
    />
    <SideRoads roads={config.rightSideRoads} x={795} roadSignList={roadSignList}
      fontChinese={fontChinese} fontLatin={fontLatin} />
    <HorizontalText
      text={config.rightSideDistance} x={782} y={476} width={185} height={43} font={fontChinese}
    />
  </svg>
}
