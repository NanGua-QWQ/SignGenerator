import type {
  RoundaboutDirection, RoundaboutRoadClass, Sign,
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
  UrbanRoadNameSign,
} from '../sign/urban-road-name'
import {
  OutlinedText,
} from '../svg-text'

import type {
  Font,
} from '@pdf-lib/fontkit'

const BLUE = '#2C64AD'
const WHITE = '#FFFFFF'

const ROAD_WIDTHS: Record<RoundaboutRoadClass, number> = {
  major: 54,
  numbered: 40,
  local: 26,
}

const EXIT_ANGLES: Record<RoundaboutDirection, number> = {
  right: 0,
  'right-forward': -45,
  straight: -90,
  'left-forward': -135,
  left: 180,
}

interface CanvasLayout {
  width: number
  height: number
  centerX: number
  centerY: number
  branchLength: number
  ringRadius: number
  arrowLength: number
  standardWide: boolean
  labelAreas: Record<RoundaboutDirection, LabelArea>
}

interface LabelArea {
  x: number
  y: number
  width: number
  height: number
}

const SQUARE_LAYOUT: CanvasLayout = {
  width: 820,
  height: 760,
  centerX: 410,
  centerY: 445,
  branchLength: 205,
  ringRadius: 60,
  arrowLength: 38,
  standardWide: false,
  labelAreas: {
    left: {
      x: 35, y: 325, width: 230, height: 220,
    },
    'left-forward': {
      x: 42, y: 78, width: 220, height: 180,
    },
    straight: {
      x: 300, y: 38, width: 220, height: 175,
    },
    'right-forward': {
      x: 558, y: 78, width: 220, height: 180,
    },
    right: {
      x: 555, y: 325, width: 230, height: 220,
    },
  },
}

const WIDE_LAYOUT: CanvasLayout = {
  width: 900,
  height: 770,
  centerX: 450,
  centerY: 425,
  branchLength: 300,
  ringRadius: 48,
  arrowLength: 32,
  standardWide: true,
  labelAreas: {
    left: {
      x: 45, y: 470, width: 270, height: 220,
    },
    'left-forward': {
      x: 70, y: 80, width: 230, height: 165,
    },
    straight: {
      x: 330, y: 35, width: 240, height: 165,
    },
    'right-forward': {
      x: 600, y: 45, width: 260, height: 220,
    },
    right: {
      x: 590, y: 470, width: 265, height: 200,
    },
  },
}

const STANDARD_ROAD_WIDTHS: Record<RoundaboutRoadClass, number> = {
  major: 40,
  numbered: 30,
  local: 20,
}

function roadWidth(roadClass: RoundaboutRoadClass, layout: CanvasLayout) {
  return (layout.standardWide ? STANDARD_ROAD_WIDTHS : ROAD_WIDTHS)[roadClass]
}

function branchLength(direction: RoundaboutDirection, layout: CanvasLayout) {
  return layout.standardWide && direction === 'straight' ? 210 : layout.branchLength
}

function exitAngle(direction: RoundaboutDirection, layout: CanvasLayout) {
  if (!layout.standardWide) { return EXIT_ANGLES[direction] }
  if (direction === 'left-forward') { return -120 }
  if (direction === 'right-forward') { return -60 }
  return EXIT_ANGLES[direction]
}

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

function RoadSignLabel({
  selected,
  roadSignList,
  fontChinese,
  fontLatin,
  area,
}: {
  selected: Sign
  roadSignList: Sign[]
  fontChinese: Font
  fontLatin: Font
  area: LabelArea
}) {
  const targetHeight = Math.min(86, area.height)
  const naturalWidth = roadSignWidth(selected, targetHeight, fontChinese)
  const width = Math.min(area.width * 0.82, naturalWidth)
  const height = naturalWidth > area.width * 0.82
    ? targetHeight * area.width * 0.82 / naturalWidth
    : targetHeight
  const x = area.x + (area.width - width) / 2
  const y = area.y + Math.max(0, (area.height - height) / 2)
  if (selected.template === 'urban-road-name') {
    return <UrbanRoadNameSign
      name={selected.urbanRoadName}
      style={selected.urbanRoadStyle}
      routeSign={roadSignList.find(sign => sign.id === selected.urbanRoadRouteSignId)}
      x={x}
      y={y}
      width={width}
      height={height}
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
    y={y}
    width={width}
    height={height}
  />
}

function ExitLabel({
  direction,
  sign,
  roadSignList,
  fontChinese,
  fontLatin,
  area,
  layout,
}: {
  direction: RoundaboutDirection
  sign: Sign
  roadSignList: Sign[]
  fontChinese: Font
  fontLatin: Font
  area: LabelArea
  layout: CanvasLayout
}) {
  const exit = sign.roundaboutConfig.exits[direction]
  const selected = roadSignList.find(candidate => candidate.id === exit.roadSignId)
  const hasRoadSign = Boolean(selected)
  if (layout.standardWide) {
    const signSlotHeight = selected ? Math.min(90, area.height * 0.46) : 0
    const labelGap = selected && exit.destination ? 10 : 0
    const textHeight = exit.destination
      ? Math.min(100, area.height - signSlotHeight - labelGap)
      : 0
    const blockHeight = signSlotHeight + labelGap + textHeight
    const blockY = area.y + Math.max(0, (area.height - blockHeight) / 2)
    const signArea: LabelArea = {
      x: area.x,
      y: blockY,
      width: area.width,
      height: signSlotHeight,
    }

    return <g aria-label={`${exit.destination || '未命名'} ${direction}`}>
      {selected && <RoadSignLabel
        selected={selected}
        roadSignList={roadSignList}
        fontChinese={fontChinese}
        fontLatin={fontLatin}
        area={signArea}
      />}
      {exit.destination && <OutlinedText
        font={fontChinese}
        text={exit.destination}
        startX={area.x + 5}
        startY={blockY + signSlotHeight + labelGap}
        width={area.width - 10}
        height={textHeight}
        fill={WHITE}
        options={{
          minGap: 8,
          maxGap: 20,
          scaleMode: 'reference',
          referenceText: '科技公园',
        }}
      />}
    </g>
  }

  const horizontalArrowClearance = Math.max(24, roadWidth(exit.roadClass, layout) * 0.68)
  const isHorizontal = direction === 'left' || direction === 'right'
  const radians = exitAngle(direction, layout) * Math.PI / 180
  const endpointY = layout.centerY + Math.sin(radians) * branchLength(direction, layout)
  const topMargin = 42
  const arrowGap = 24
  const availableAbove = Math.max(80, endpointY - arrowGap - topMargin)
  const textHeight = hasRoadSign
    ? Math.min(56, availableAbove * 0.38)
    : 68
  const signSlotHeight = hasRoadSign
    ? Math.min(82, availableAbove - textHeight - 8)
    : 0
  const blockHeight = signSlotHeight + (hasRoadSign ? 8 : 0) + textHeight
  const blockY = Math.max(topMargin, endpointY - arrowGap - blockHeight)
  const isWideHorizontal = isHorizontal && layout.width > 1000

  if (isWideHorizontal) {
    const inlineSignHeight = 76
    const inlineTextHeight = 62
    const selectedSignWidth = selected
      ? roadSignWidth(selected, inlineSignHeight, fontChinese)
      : 0
    const signAreaWidth = selected
      ? Math.min(170, Math.max(82, selectedSignWidth / 0.82))
      : 0
    const inlineGap = selected && exit.destination ? 12 : 0
    const desiredTextWidth = exit.destination
      ? Math.min(200, Math.max(72, Array.from(exit.destination).length * 65))
      : 0
    const textWidth = Math.min(
      desiredTextWidth,
      Math.max(0, area.width - signAreaWidth - inlineGap),
    )
    const totalWidth = signAreaWidth + inlineGap + textWidth
    const startX = direction === 'right'
      ? area.x
      : area.x + area.width - totalWidth
    const signFirst = direction === 'right'
    const signArea: LabelArea = {
      x: signFirst ? startX : startX + textWidth + inlineGap,
      y: layout.centerY - inlineSignHeight / 2,
      width: signAreaWidth,
      height: inlineSignHeight,
    }
    const textX = signFirst ? startX + signAreaWidth + inlineGap : startX

    return <g aria-label={`${exit.destination || '未命名'} ${direction}`}>
      {selected && <RoadSignLabel
        selected={selected}
        roadSignList={roadSignList}
        fontChinese={fontChinese}
        fontLatin={fontLatin}
        area={signArea}
      />}
      {exit.destination && <OutlinedText
        font={fontChinese}
        text={exit.destination}
        startX={textX}
        startY={layout.centerY - inlineTextHeight / 2}
        width={textWidth}
        height={inlineTextHeight}
        fill={WHITE}
        options={{
          minGap: 5,
          maxGap: 18,
          scaleMode: 'reference',
          referenceText: '科技公园',
        }}
      />}
    </g>
  }

  const signArea: LabelArea = {
    ...area,
    y: isHorizontal
      ? layout.centerY - horizontalArrowClearance - signSlotHeight - 18
      : blockY,
    height: signSlotHeight,
  }
  const textY = isHorizontal
    ? layout.centerY + horizontalArrowClearance + 18
    : blockY + signSlotHeight + (hasRoadSign ? 8 : 0)

  return <g aria-label={`${exit.destination || '未命名'} ${direction}`}>
    {selected && <RoadSignLabel
      selected={selected}
      roadSignList={roadSignList}
      fontChinese={fontChinese}
      fontLatin={fontLatin}
      area={signArea}
    />}
    {exit.destination && <OutlinedText
      font={fontChinese}
      text={exit.destination}
      startX={area.x + 8}
      startY={textY}
      width={area.width - 16}
      height={textHeight}
      fill={WHITE}
      options={{
        minGap: 5,
        maxGap: 18,
        scaleMode: 'reference',
        referenceText: '科技公园',
      }}
    />}
  </g>
}

function Branch({
  direction,
  roadClass,
  layout,
}: {
  direction: RoundaboutDirection
  roadClass: RoundaboutRoadClass
  layout: CanvasLayout
}) {
  const radians = exitAngle(direction, layout) * Math.PI / 180
  const dx = Math.cos(radians)
  const dy = Math.sin(radians)
  const width = roadWidth(roadClass, layout)
  const length = branchLength(direction, layout)
  const arrowHalfWidth = Math.max(layout.standardWide ? 18 : 24, width * 0.68)
  const endX = layout.centerX + dx * length
  const endY = layout.centerY + dy * length
  const baseX = endX - dx * layout.arrowLength
  const baseY = endY - dy * layout.arrowLength
  const perpendicularX = -dy * arrowHalfWidth
  const perpendicularY = dx * arrowHalfWidth
  return <g>
    <line
      x1={layout.centerX + dx * layout.ringRadius}
      y1={layout.centerY + dy * layout.ringRadius}
      x2={baseX + dx * 5}
      y2={baseY + dy * 5}
      stroke={WHITE}
      strokeWidth={width}
      strokeLinecap="butt"
    />
    <polygon
      points={`${endX},${endY} ${baseX + perpendicularX},${baseY + perpendicularY} ${baseX - perpendicularX},${baseY - perpendicularY}`}
      fill={WHITE}
    />
  </g>
}

export function RoundaboutGuidanceSign({
  sign,
  roadSignList,
}: {
  sign: Sign
  roadSignList: Sign[]
}) {
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  const config = sign.roundaboutConfig
  const layout = config.layout === 'wide' ? WIDE_LAYOUT : SQUARE_LAYOUT
  const activeDirections = (Object.keys(config.exits) as RoundaboutDirection[])
    .filter(direction => config.exits[direction].enabled)
  const approachWidth = roadWidth(config.approachRoadClass, layout)
  const approachBottom = layout.height - (layout.standardWide ? 60 : 45)
  const borderInset = layout.standardWide ? 15 : 16
  const borderStrokeWidth = layout.standardWide ? 8 : 9
  const ringStrokeWidth = layout.standardWide ? 30 : 43
  const ringInnerRadius = layout.standardWide ? 25 : 34

  return <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={`0 0 ${layout.width} ${layout.height}`}
    role="img"
    aria-label="环岛图形式交叉路口预告标志"
  >
    <rect
      width={layout.width}
      height={layout.height}
      rx={layout.standardWide ? 32 : 34}
      fill={BLUE}
    />
    <rect
      x={borderInset}
      y={borderInset}
      width={layout.width - borderInset * 2}
      height={layout.height - borderInset * 2}
      rx={layout.standardWide ? 22 : 23}
      fill="none"
      stroke={WHITE}
      strokeWidth={borderStrokeWidth}
    />

    <line
      x1={layout.centerX}
      y1={layout.centerY + layout.ringRadius}
      x2={layout.centerX}
      y2={approachBottom}
      stroke={WHITE}
      strokeWidth={approachWidth}
      strokeLinecap="butt"
    />
    {activeDirections.map(direction => <Branch
      key={direction}
      direction={direction}
      roadClass={config.exits[direction].roadClass}
      layout={layout}
    />)}
    <circle
      cx={layout.centerX}
      cy={layout.centerY}
      r={layout.ringRadius}
      fill="none"
      stroke={WHITE}
      strokeWidth={ringStrokeWidth}
    />
    <circle cx={layout.centerX} cy={layout.centerY} r={ringInnerRadius} fill={BLUE} />

    {activeDirections.map(direction => <ExitLabel
      key={direction}
      direction={direction}
      sign={sign}
      roadSignList={roadSignList}
      fontChinese={fontChinese}
      fontLatin={fontLatin}
      area={layout.labelAreas[direction]}
      layout={layout}
    />)}

    {config.cardinalDirectionVisible && <g aria-label={`${config.cardinalDirection}方位`}>
      <rect
        x="24"
        y="24"
        width={layout.standardWide ? 44 : 64}
        height={layout.standardWide ? 44 : 64}
        rx="4"
        fill={WHITE}
      />
      <OutlinedText
        font={fontChinese}
        text={config.cardinalDirection}
        startX={layout.standardWide ? 31 : 34}
        startY={layout.standardWide ? 31 : 34}
        width={layout.standardWide ? 30 : 44}
        height={layout.standardWide ? 30 : 44}
        fill={BLUE}
      />
    </g>}
  </svg>
}
