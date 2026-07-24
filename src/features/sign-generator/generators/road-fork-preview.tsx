import type { Font } from '@pdf-lib/fontkit'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Sign } from '../types'
import { expresswaySignNode } from './expressway'
import { GREEN, WHITE, escapeXml, loadFont, outlinedText } from './svg-text'
import roadForkPreviewTemplate from '../../../../public/template/道路分岔预告.svg?raw'

function cleanExitText(value: string, fallback: string, limit: number): string {
  const text = Array.from(String(value || '').trim()).slice(0, limit).join('')
  return text || fallback
}

function cleanExitNumber(value: string): string {
  return String(value || '').replace(/\D/g, '').slice(0, 4) || '360'
}

function cleanExitDistance(value: string): string {
  return String(value || '').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 5) || '2'
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
      <rect x={x} y={y} width="64" height="64" fill={WHITE} />
      {outlinedText(fontChinese, text, x + 8, y + 9, 48, 45, GREEN)}
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
  const rightDirection = cleanDirection(sign.rightDirection, '东')
  const label = escapeXml(`${exitName} ${exitNumber} ${destination} ${exitDistance}km`)
  const overlay = renderToStaticMarkup(
    <g data-generated="road-fork-preview">
{/*       {outlinedText(fontChinese, '出口', 790, 25, 74, 29, WHITE, { maxGap: 3 })}
      {outlinedText(fontLatin, exitNumber, 884, 20, 100, 42, GREEN, { maxGap: 4, minGap: 0 })}
      {directionPlateNode(fontChinese, leftDirection, 149, 61)}
 */}      {expresswaySignNode({ code: leftRoute, fontChinese, fontLatin, x: 226, y: 38, width: 132, height: 104 })}
      {expresswaySignNode({ code: rightRoute, fontChinese, fontLatin, x: 656, y: 38, width: 132, height: 104 })}
      {directionPlateNode(fontChinese, rightDirection, 802, 61)}
      <rect x="123" y="146" width="240" height="92" fill={GREEN} />
      {outlinedText(fontChinese, exitName, 123, 164, 240, 56, WHITE, { maxGap: 16 })}
      <rect x="625" y="146" width="240" height="92" fill={GREEN} />
      {outlinedText(fontChinese, destination, 625, 164, 240, 56, WHITE, { maxGap: 16 })}
      <rect x="666" y="251" width="190" height="96" fill={GREEN} />
      {outlinedText(fontLatin, exitDistance, 668, 254, 76, 68, WHITE, { maxGap: 4, minGap: 0 })}
      {outlinedText(fontLatin, 'km', 746, 295, 70, 30, WHITE, { align: 'start', maxGap: 2, minGap: 0 })}
    </g>,
  )
  const svg = roadForkPreviewTemplate
    .replace(/<!--rotationCenter:[\s\S]*?-->/, '')
    .replace('<svg ', `<svg role="img" aria-label="${label} 道路分岔预告牌" `)
  return svg.replace('</svg>', `${overlay}</svg>`)
}
