import type {
  Sign,
} from '@/lib/types'

import {
  useFont,
} from '../../fonts/FontContext'
import {
  NUMBERED_EXIT_WIDTH,
  NumberedExitSignNode,
} from '../exit/numbered-exit'
import {
  RightExitArrow,
} from '../exit/right-exit-arrow'
import {
  cleanDirection,
  cleanExitRoute,
  cleanExitText,
  routeSignWidth,
  fitRoutePairWidths,
} from '../generator'
import {
  RawSvg,
} from '../raw-svg'
import {
  RouteSignNode,
} from '../sign/route-sign'
import {
  GREEN,
  WHITE,
  escapeXml,
  OutlinedText,
  textLayout,
} from '../svg-text'

import type {
  Font,
} from '@pdf-lib/fontkit'

const TEMPLATE_WIDTH = 760
const TEMPLATE_HEIGHT = 690
const BOARD_X = 10
const BOARD_Y = 205
const BOARD_WIDTH = 608
const BOARD_HEIGHT = 390
const ROUTE_SIGN_HEIGHT = 105
const DIRECTION_PLATE_SIZE = 66
const DIVIDER_X = BOARD_X + BOARD_WIDTH / 2 - 4
const DESTINATION_OPTIONS = {
  scaleMode: 'reference' as const,
  referenceText: '汕头贺州',
  maxGap: 18,
  minGap: 10,
}
const DESTINATION_WIDTH = BOARD_WIDTH / 2 - 40
const DESTINATION_X = [BOARD_X + 28, BOARD_X + BOARD_WIDTH / 2 + 12]
const DESTINATION_SINGLE_LINE_Y = BOARD_Y + 168
const DESTINATION_TWO_LINE_Y = BOARD_Y + 160
const DESTINATION_TWO_LINE_GAP = 12

interface DirectionPlateProps {
  fontChinese: Font
  text: string
  x: number
  y: number
}

function DirectionPlate({
  fontChinese,
  text,
  x,
  y,
}: DirectionPlateProps) {
  return (
    <>
      <rect x={x} y={y} width={DIRECTION_PLATE_SIZE} height={DIRECTION_PLATE_SIZE} fill={WHITE} />
      <OutlinedText
        font={fontChinese}
        text={text}
        startX={x + 8}
        startY={y + 8}
        width={DIRECTION_PLATE_SIZE - 16}
        height={DIRECTION_PLATE_SIZE - 16}
        fill={GREEN}
      />
    </>
  )
}

function splitDestination(text: string) {
  const characters = Array.from(text)
  if (characters.length <= 4) {return [text]}
  const splitAt = Math.ceil(characters.length / 2)
  return [
    characters.slice(0, splitAt).join(''),
    characters.slice(splitAt).join(''),
  ]
}

function DestinationLabel({
  fontChinese,
  text,
  side,
}: {
  fontChinese: Font
  text: string
  side: 'left' | 'right'
}) {
  const lines = splitDestination(text)
  const maxLineHeight = lines.length === 1 ? 70 : 52
  const lineHeight = Math.min(
    maxLineHeight,
    ...lines.map((line) => {
      const layout = textLayout(fontChinese, line, 1, DESTINATION_OPTIONS)
      const availableWidth = DESTINATION_WIDTH - Math.max(0, Array.from(line).length - 1) * 10
      return Math.floor(availableWidth / layout.usedWidth)
    }),
  )
  const startYs = lines.length === 1
    ? [DESTINATION_SINGLE_LINE_Y + (70 - lineHeight) / 2]
    : [DESTINATION_TWO_LINE_Y, DESTINATION_TWO_LINE_Y + lineHeight + DESTINATION_TWO_LINE_GAP]
  const startX = side === 'left' ? DESTINATION_X[0] : DESTINATION_X[1]

  return <>
    {lines.map((line, index) => <OutlinedText
      key={`${side}-${line}`}
      font={fontChinese}
      text={line}
      startX={startX}
      startY={startYs[index]}
      width={DESTINATION_WIDTH}
      height={lineHeight}
      fill={WHITE}
      options={DESTINATION_OPTIONS}
    />,
    )}
  </>
}

export function DualDirectionExitPreviewSign({
  sign,
}: { sign: Sign }) {
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  const leftDirection = cleanDirection(sign.leftDirection, '东')
  const rightDirection = cleanDirection(sign.rightDirection, '西')
  const leftRoute = cleanExitRoute(sign.leftRoute, 'G78', sign.leftRouteKind)
  const rightRoute = cleanExitRoute(sign.rightRoute, 'G78', sign.rightRouteKind)
  const leftDestination = cleanExitText(sign.exitName, '汕头', 12)
  const rightDestination = cleanExitText(sign.exitDestination, '贺州', 12)
  const leftRouteWidth = routeSignWidth(leftRoute, ROUTE_SIGN_HEIGHT, sign.leftRouteKind)
  const rightRouteWidth = routeSignWidth(rightRoute, ROUTE_SIGN_HEIGHT, sign.rightRouteKind)
  const leftRouteX = BOARD_X + 135
  const leftRouteMaxWidth = DIVIDER_X - 20 - leftRouteX
  const rightRouteX = DIVIDER_X + 20
  const rightRouteMaxWidth = BOARD_X + BOARD_WIDTH - 135 - rightRouteX
  const leftRouteWidthLimited = Math.min(leftRouteWidth, leftRouteMaxWidth)
  const rightRouteWidthLimited = Math.min(rightRouteWidth, rightRouteMaxWidth)
  const fittedRouteWidths = fitRoutePairWidths(
    leftRouteWidthLimited,
    rightRouteWidthLimited,
    leftRouteMaxWidth + rightRouteMaxWidth,
    40,
  )
  const fittedLeftRouteWidth = fittedRouteWidths.leftWidth
  const fittedRightRouteWidth = fittedRouteWidths.rightWidth
  const hasTwoLineDestination = Array.from(leftDestination).length > 4
    || Array.from(rightDestination).length > 4
  const arrowCenterX = DIVIDER_X + 3
  const arrowCenterOffset = 144
  const arrowY = BOARD_Y + (hasTwoLineDestination ? 335 : 293)
  const arrowScale = hasTwoLineDestination ? 1.2 : 1.45
  const topExitWidth = 265
  const label = escapeXml(
    `${sign.exitNumber} ${leftDirection} ${leftRoute} ${leftDestination} ${rightDirection} ${rightRoute} ${rightDestination}`,
  )

  return (
    <RawSvg
      label={`${label} 双向出口预告标志`}
      width={TEMPLATE_WIDTH}
      height={TEMPLATE_HEIGHT}
      template={`<svg viewBox="0 0 ${TEMPLATE_WIDTH} ${TEMPLATE_HEIGHT}" />`}
    >
      <g data-generated="dual-direction-exit-preview">
        <rect
          x={BOARD_X}
          y={BOARD_Y}
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
          rx="40"
          fill={GREEN}
        />
        <rect
          x={BOARD_X + 12}
          y={BOARD_Y + 12}
          width={BOARD_WIDTH - 24}
          height={BOARD_HEIGHT - 24}
          rx="30"
          fill={WHITE}
        />
        <rect
          x={BOARD_X + 22}
          y={BOARD_Y + 22}
          width={BOARD_WIDTH - 44}
          height={BOARD_HEIGHT - 44}
          rx="22"
          fill={GREEN}
        />
        <rect x={DIVIDER_X} y={BOARD_Y + 50} width="6" height="205" fill={WHITE} />

        <DirectionPlate
          fontChinese={fontChinese}
          text={leftDirection}
          x={BOARD_X + 42}
          y={BOARD_Y + 55}
        />
        <RouteSignNode
          code={leftRoute}
          kind={sign.leftRouteKind}
          provinceLabel={sign.leftRouteProvinceLabel}
          threeDigitDescend={sign.leftRouteThreeDigitDescend}
          fontChinese={fontChinese}
          fontLatin={fontLatin}
          x={leftRouteX}
          y={BOARD_Y + 38}
          width={fittedLeftRouteWidth}
          height={ROUTE_SIGN_HEIGHT}
        />

        <RouteSignNode
          code={rightRoute}
          kind={sign.rightRouteKind}
          provinceLabel={sign.rightRouteProvinceLabel}
          threeDigitDescend={sign.rightRouteThreeDigitDescend}
          fontChinese={fontChinese}
          fontLatin={fontLatin}
          x={rightRouteX + rightRouteMaxWidth - fittedRightRouteWidth}
          y={BOARD_Y + 38}
          width={fittedRightRouteWidth}
          height={ROUTE_SIGN_HEIGHT}
        />
        <DirectionPlate
          fontChinese={fontChinese}
          text={rightDirection}
          x={BOARD_X + BOARD_WIDTH - 108}
          y={BOARD_Y + 55}
        />

        <DestinationLabel
          fontChinese={fontChinese}
          text={leftDestination}
          side="left"
        />
        <DestinationLabel
          fontChinese={fontChinese}
          text={rightDestination}
          side="right"
        />

        <RightExitArrow x={arrowCenterX - arrowCenterOffset} y={arrowY} scale={arrowScale} />
        <RightExitArrow x={arrowCenterX + arrowCenterOffset} y={arrowY} scale={arrowScale} />

        <NumberedExitSignNode
          exitNumber={sign.exitNumber}
          fontChinese={fontChinese}
          fontLatin={fontLatin}
          x={BOARD_X + BOARD_WIDTH - topExitWidth}
          y={82}
          width={topExitWidth}
        />
      </g>
    </RawSvg>
  )
}

// Keep this export close to the renderer so the intended plaque scale remains discoverable.
export const dualDirectionExitPreviewNaturalSize = {
  width: TEMPLATE_WIDTH,
  height: TEMPLATE_HEIGHT,
  numberedExitWidth: NUMBERED_EXIT_WIDTH,
}
