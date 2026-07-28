import { renderToStaticMarkup } from 'react-dom/server'
import type { Sign } from '../../types'
import type { Font } from '@pdf-lib/fontkit'
import { routeSignWidth, cleanExitText, cleanExitRoute, cleanDirection } from '../generator'
import { expresswaySignNode } from '../expressway'
import { GREEN, WHITE, escapeXml, loadFont, outlinedText } from '../svg-text'
import twoLaneInterchangeTemplate from '/template/2车道立交枢纽出口.svg?raw'
import { NUMBERED_EXIT_RIGHT_MARGIN, NUMBERED_EXIT_WIDTH, NUMBERED_EXIT_Y, expandCanvasForNumberedExit, numberedExitSignNode } from './numbered-exit'

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

function directionPlateNode(fontChinese: Font, text: string, x: number, y: number) {
  return (
    <>
      <rect x={x} y={y} width={DIRECTION_SIGN_SIZE} height={DIRECTION_SIGN_SIZE} fill={WHITE} />
      {outlinedText(fontChinese, text, x + 7, y + 8, DIRECTION_SIGN_SIZE - 14, 46, GREEN)}
    </>
  )
}

export async function generateTwoLaneInterchangeExitSvg(sign: Sign): Promise<string> {
  const [fontChinese, fontLatin] = await Promise.all([loadFont('a'), loadFont('b')])
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
  const overlay = renderToStaticMarkup(
    <g data-generated="two-lane-interchange-exit">
      {numberedExitSignNode({ exitNumber, fontChinese, fontLatin, x: NUMBERED_EXIT_X, y: NUMBERED_EXIT_Y })}
      {directionPlateNode(fontChinese, leftDirection, LEFT_DIRECTION_X, 55)}
      {expresswaySignNode({ code: leftRoute, kind: sign.leftRouteKind, provinceLabel: sign.leftRouteProvinceLabel, threeDigitDescend: sign.leftRouteThreeDigitDescend, fontChinese, fontLatin, x: LEFT_ROUTE_SIGN_X, y: ROUTE_SIGN_Y, width: leftRouteWidth, height: ROUTE_SIGN_HEIGHT })}
      {expresswaySignNode({ code: rightRoute, kind: sign.rightRouteKind, provinceLabel: sign.rightRouteProvinceLabel, threeDigitDescend: sign.rightRouteThreeDigitDescend, fontChinese, fontLatin, x: rightRouteX, y: ROUTE_SIGN_Y, width: rightRouteWidth, height: ROUTE_SIGN_HEIGHT })}
      {directionPlateNode(fontChinese, rightDirection, rightDirectionX, 58)}
      {outlinedText(fontChinese, exitName, 130, 166, 190, 56, WHITE, { maxGap: 18 })}
      {outlinedText(fontChinese, destination, 588, 166, 190, 56, WHITE, { maxGap: 18 })}
    </g>,
  )
  const svg = twoLaneInterchangeTemplate
    .replace(/<!--rotationCenter:[\s\S]*?-->/, '')
    .replace('<svg ', `<svg role="img" aria-label="${label} 2车道立交枢纽出口标志" `)
  return expandCanvasForNumberedExit(svg, TEMPLATE_WIDTH, TEMPLATE_HEIGHT).replace('</svg>', `${overlay}</svg>`)
}
