import type { Font } from '@pdf-lib/fontkit'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Sign } from '../types'
import { expresswaySignNaturalSize, expresswaySignNode } from './expressway'
import { GREEN, WHITE, escapeXml, loadFont, outlinedText } from './svg-text'
import roadForkPreviewTemplate from '/public/template/道路分岔预告.svg?raw'

const ROUTE_SIGN_HEIGHT = 104
const LEFT_ROUTE_SIGN_X = 226
const RIGHT_ROUTE_SIGN_RIGHT = 786
const ROUTE_SIGN_Y = 38
const DIRECTION_SIGN_SIZE = 62

function routeSignWidth(code: string): number {
  const naturalSize = expresswaySignNaturalSize(code)
  return ROUTE_SIGN_HEIGHT * naturalSize.width / naturalSize.height
}

function cleanExitText(value: string, fallback: string, limit: number): string {
  const text = Array.from(String(value || '').trim()).slice(0, limit).join('')
  return text || fallback
}

function cleanExitNumber(value: string): string {
  return String(value || '').replace(/\D/g, '').slice(0, 4) || '360'
}

function cleanExitDistance(value: string): string {
  return String(value || '').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 1) || '2'
}

function cleanExitRoute(value: string, fallback: string): string {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || fallback
}

function cleanDirection(value: string, fallback: string): string {
  const direction = Array.from(String(value || '').trim()).slice(0, 1).join('')
  return ['东', '南', '西', '北'].includes(direction) ? direction : fallback
}

function directionPlateNode(fontChinese: Font, text: string, x: number, y: number) {
  return (
    <>
      <rect x={x} y={y} width={DIRECTION_SIGN_SIZE} height={DIRECTION_SIGN_SIZE} fill={WHITE} />
      {outlinedText(fontChinese, text, x + 7, y + 8, DIRECTION_SIGN_SIZE - 14, 46, GREEN)}
    </>
  )
}

export async function generateRoadForkPreviewSvg(sign: Sign): Promise<string> {
  const [fontChinese, fontLatin] = await Promise.all([loadFont('a'), loadFont('b')])
  const exitNumber = cleanExitNumber(sign.exitNumber)
  const exitDistance = cleanExitDistance(sign.exitDistance)
  const exitName = cleanExitText(sign.exitName, '', 6)
  const destination = cleanExitText(sign.exitDestination, '', 8)
  const leftRoute = cleanExitRoute(sign.leftRoute, 'G72')
  const rightRoute = cleanExitRoute(sign.rightRoute, 'G80')
  const leftDirection = cleanDirection(sign.leftDirection, '北')
  const rightDirection = cleanDirection(sign.rightDirection, '东')
  const leftRouteWidth = routeSignWidth(leftRoute)
  const rightRouteWidth = routeSignWidth(rightRoute)
  const rightRouteX = RIGHT_ROUTE_SIGN_RIGHT - rightRouteWidth
  const rightDirectionX = RIGHT_ROUTE_SIGN_RIGHT + 14
  const label = escapeXml(`${exitName} ${exitNumber} ${destination} ${exitDistance}km`)
  const overlay = renderToStaticMarkup(
    <g data-generated="road-fork-preview">
      {directionPlateNode(fontChinese, leftDirection, 150, 58)}
      {expresswaySignNode({ code: leftRoute, fontChinese, fontLatin, x: LEFT_ROUTE_SIGN_X, y: ROUTE_SIGN_Y, width: leftRouteWidth, height: ROUTE_SIGN_HEIGHT })}
      {expresswaySignNode({ code: rightRoute, fontChinese, fontLatin, x: rightRouteX, y: ROUTE_SIGN_Y, width: rightRouteWidth, height: ROUTE_SIGN_HEIGHT })}
      {directionPlateNode(fontChinese, rightDirection, rightDirectionX, 58)}
      {outlinedText(fontChinese, exitName, 169.3, 168, 170, 58, WHITE, { maxGap: 18 })}
      {outlinedText(fontChinese, destination, 670, 168, 175, 58, WHITE, { maxGap: 18 })}
      {outlinedText(fontChinese, exitDistance, 645, 266, 85, 68, WHITE, { maxGap: 4, minGap: 0 })}    </g>,
  )
  const svg = roadForkPreviewTemplate
    .replace(/<!--rotationCenter:[\s\S]*?-->/, '')
    .replace('<svg ', `<svg role="img" aria-label="${label} 道路分岔预告牌" `)
  return svg.replace('</svg>', `${overlay}</svg>`)
}
