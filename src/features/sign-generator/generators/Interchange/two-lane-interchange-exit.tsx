import type { ReactNode } from 'react'
import { use } from 'react'
import type { Sign } from '../../types'
import type { Font } from '@pdf-lib/fontkit'
import { routeSignWidth, cleanExitText, cleanExitRoute, cleanDirection } from '../generator'
import { ExpresswaySignNode } from '../sign/expressway'
import { GREEN, WHITE, escapeXml, loadFont, OutlinedText } from '../svg-text'
import { RawSvg } from '../raw-svg'
import twoLaneInterchangeTemplate from '/template/2车道立交枢纽出口.svg?raw'
import { NUMBERED_EXIT_RIGHT_MARGIN, NUMBERED_EXIT_WIDTH, NUMBERED_EXIT_Y, expandCanvasForNumberedExit, NumberedExitSignNode } from '../numbered-exit'

const TEMPLATE_WIDTH = 934.65054
const TEMPLATE_HEIGHT = 349.84285
const NUMBERED_EXIT_X = TEMPLATE_WIDTH - NUMBERED_EXIT_WIDTH - NUMBERED_EXIT_RIGHT_MARGIN
const ROUTE_SIGN_HEIGHT = 100
const LEFT_DIRECTION_X = 128
const LEFT_ROUTE_SIGN_X = 204.5
const RIGHT_ROUTE_SIGN_RIGHT = 736.5
const ROUTE_SIGN_Y = 38
const DIRECTION_SIGN_SIZE = 60

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

export function TwoLaneInterchangeExitSign({ sign }: { sign: Sign }): ReactNode {
  const fontChinese = use(loadFont('a'))
  const fontLatin = use(loadFont('b'))
  const exitNumber = cleanExitNumber(sign.exitNumber)
  const exitName = cleanExitText(sign.exitName, '', 6)
  const destination = cleanExitText(sign.exitDestination, '', 6)
  const leftRoute = cleanExitRoute(sign.leftRoute, 'G0421')
  const rightRoute = cleanExitRoute(sign.rightRoute, 'G15')
  const leftDirection = cleanDirection(sign.leftDirection, '北')
  const rightDirection = cleanDirection(sign.rightDirection, '东')
  const leftRouteWidth = routeSignWidth(leftRoute, ROUTE_SIGN_HEIGHT)
  const rightRouteWidth = routeSignWidth(rightRoute, ROUTE_SIGN_HEIGHT)
  const rightRouteX = RIGHT_ROUTE_SIGN_RIGHT - rightRouteWidth
  const rightDirectionX = RIGHT_ROUTE_SIGN_RIGHT + 16
  const label = escapeXml(`${leftDirection} ${leftRoute} ${exitName} ${rightDirection} ${rightRoute} ${destination}`)
  const template = expandCanvasForNumberedExit(
    twoLaneInterchangeTemplate.replace(/<!--rotationCenter:[\s\S]*?-->/, ''),
    TEMPLATE_WIDTH,
    TEMPLATE_HEIGHT,
  )
  return (
    <RawSvg template={template} label={`${label} 2车道立交枢纽出口标志`} width={TEMPLATE_WIDTH} height={TEMPLATE_HEIGHT}>
      <g data-generated="two-lane-interchange-exit">
        <NumberedExitSignNode exitNumber={exitNumber} fontChinese={fontChinese} fontLatin={fontLatin} x={NUMBERED_EXIT_X} y={NUMBERED_EXIT_Y} />
        <DirectionPlate fontChinese={fontChinese} text={leftDirection} x={LEFT_DIRECTION_X} y={55} />
        <ExpresswaySignNode code={leftRoute} kind={sign.leftRouteKind} provinceLabel={sign.leftRouteProvinceLabel} threeDigitDescend={sign.leftRouteThreeDigitDescend} fontChinese={fontChinese} fontLatin={fontLatin} x={LEFT_ROUTE_SIGN_X} y={ROUTE_SIGN_Y} width={leftRouteWidth} height={ROUTE_SIGN_HEIGHT} />
        <ExpresswaySignNode code={rightRoute} kind={sign.rightRouteKind} provinceLabel={sign.rightRouteProvinceLabel} threeDigitDescend={sign.rightRouteThreeDigitDescend} fontChinese={fontChinese} fontLatin={fontLatin} x={rightRouteX} y={ROUTE_SIGN_Y} width={rightRouteWidth} height={ROUTE_SIGN_HEIGHT} />
        <DirectionPlate fontChinese={fontChinese} text={rightDirection} x={rightDirectionX} y={58} />
        <OutlinedText font={fontChinese} text={exitName} startX={130} startY={166} width={190} height={56} fill={WHITE} options={{ maxGap: 18 }} />
        <OutlinedText font={fontChinese} text={destination} startX={588} startY={166} width={190} height={56} fill={WHITE} options={{ maxGap: 18 }} />
      </g>
    </RawSvg>
  )
}
