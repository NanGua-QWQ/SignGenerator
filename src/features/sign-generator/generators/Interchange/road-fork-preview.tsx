import type { ReactNode } from 'react'
import { use } from 'react'
import type { Font } from '@pdf-lib/fontkit'
import type { Sign } from '../../types'
import { routeSignWidth, cleanExitText, cleanExitDistance, cleanExitRoute, cleanDirection } from '../generator'
import { ExpresswaySignNode } from '../sign/expressway'
import { GREEN, WHITE, escapeXml, loadFont, OutlinedText } from '../svg-text'
import { RawSvg } from '../raw-svg'
import roadForkPreviewTemplate from '/template/道路分岔预告.svg?raw'
import { NUMBERED_EXIT_RIGHT_MARGIN, NUMBERED_EXIT_WIDTH, NUMBERED_EXIT_Y, expandCanvasForNumberedExit, NumberedExitSignNode } from '../numbered-exit'

const TEMPLATE_WIDTH = 1011.98513
const TEMPLATE_HEIGHT = 371.83044
const NUMBERED_EXIT_X = TEMPLATE_WIDTH - NUMBERED_EXIT_WIDTH - NUMBERED_EXIT_RIGHT_MARGIN
const ROUTE_SIGN_HEIGHT = 104
const LEFT_ROUTE_SIGN_X = 226
const RIGHT_ROUTE_SIGN_RIGHT = 786
const ROUTE_SIGN_Y = 38
const DIRECTION_SIGN_SIZE = 62

function cleanExitNumber(value: string): string {
  return String(value || '').replace(/\D/g, '').slice(0, 4) || '360'
}

interface DirectionPlateProps {
  fontChinese: Font
  text: string
  x: number
  y: number
}
function DirectionPlate({ fontChinese, text, x, y }: DirectionPlateProps) {
  return (
    <>
      <rect x={x} y={y} width={DIRECTION_SIGN_SIZE} height={DIRECTION_SIGN_SIZE} fill={WHITE} />
      <OutlinedText font={fontChinese} text={text} startX={x + 7} startY={y + 8} width={DIRECTION_SIGN_SIZE - 14} height={46} fill={GREEN} />
    </>
  )
}

export function RoadForkPreviewSign({ sign }: { sign: Sign }): ReactNode {
  const fontChinese = use(loadFont('a'))
  const fontLatin = use(loadFont('b'))
  const exitNumber = cleanExitNumber(sign.exitNumber)
  const exitDistance = cleanExitDistance(sign.exitDistance)
  const exitName = cleanExitText(sign.exitName, '', 6)
  const destination = cleanExitText(sign.exitDestination, '', 6)
  const leftRoute = cleanExitRoute(sign.leftRoute, 'G72')
  const rightRoute = cleanExitRoute(sign.rightRoute, 'G80')
  const leftDirection = cleanDirection(sign.leftDirection, '北')
  const rightDirection = cleanDirection(sign.rightDirection, '东')
  const leftRouteWidth = routeSignWidth(leftRoute, ROUTE_SIGN_HEIGHT)
  const rightRouteWidth = routeSignWidth(rightRoute, ROUTE_SIGN_HEIGHT)
  const rightRouteX = RIGHT_ROUTE_SIGN_RIGHT - rightRouteWidth
  const rightDirectionX = RIGHT_ROUTE_SIGN_RIGHT + 14
  const label = escapeXml(`${exitName} ${exitNumber} ${destination} ${exitDistance}km`)
  const template = expandCanvasForNumberedExit(
    roadForkPreviewTemplate.replace(/<!--rotationCenter:[\s\S]*?-->/, ''),
    TEMPLATE_WIDTH,
    TEMPLATE_HEIGHT,
  )
  return (
    <RawSvg template={template} label={`${label} 道路分岔预告牌`} width={TEMPLATE_WIDTH} height={TEMPLATE_HEIGHT}>
      <g data-generated="road-fork-preview">
        <NumberedExitSignNode exitNumber={exitNumber} fontChinese={fontChinese} fontLatin={fontLatin} x={NUMBERED_EXIT_X} y={NUMBERED_EXIT_Y} />
        <DirectionPlate fontChinese={fontChinese} text={leftDirection} x={150} y={58} />
        <ExpresswaySignNode code={leftRoute} kind={sign.leftRouteKind} provinceLabel={sign.leftRouteProvinceLabel} threeDigitDescend={sign.leftRouteThreeDigitDescend} fontChinese={fontChinese} fontLatin={fontLatin} x={LEFT_ROUTE_SIGN_X} y={ROUTE_SIGN_Y} width={leftRouteWidth} height={ROUTE_SIGN_HEIGHT} />
        <ExpresswaySignNode code={rightRoute} kind={sign.rightRouteKind} provinceLabel={sign.rightRouteProvinceLabel} threeDigitDescend={sign.rightRouteThreeDigitDescend} fontChinese={fontChinese} fontLatin={fontLatin} x={rightRouteX} y={ROUTE_SIGN_Y} width={rightRouteWidth} height={ROUTE_SIGN_HEIGHT} />
        <DirectionPlate fontChinese={fontChinese} text={rightDirection} x={rightDirectionX} y={58} />
        <OutlinedText font={fontChinese} text={exitName} startX={169.3} startY={168} width={170} height={58} fill={WHITE} options={{ maxGap: 18 }} />
        <OutlinedText font={fontChinese} text={destination} startX={670} startY={168} width={175} height={58} fill={WHITE} options={{ maxGap: 18 }} />
        <OutlinedText font={fontChinese} text={exitDistance} startX={645} startY={266} width={85} height={68} fill={WHITE} options={{ maxGap: 4, minGap: 0 }} />
      </g>
    </RawSvg>
  )
}
