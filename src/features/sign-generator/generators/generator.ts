import type { Sign } from '../types'
import { generateExpresswaySignSvg, expresswaySignNaturalSize } from './expressway'
import { generateRoadForkPreviewSvg } from './road-fork-preview'
import { generateTwoLaneInterchangeExitSvg } from './two-lane-interchange-exit'

export async function generateSignSvg(sign: Sign): Promise<string> {
  if (sign.template === 'two-lane-interchange-exit') return generateTwoLaneInterchangeExitSvg(sign)
  if (sign.template === 'road-fork-preview') return generateRoadForkPreviewSvg(sign)
  return generateExpresswaySignSvg(sign.code, sign.name, sign.provinceLabel, sign.kind)
}

export function signFilename(sign: Sign): string {
  const code = sign.template === 'road-fork-preview'
    ? `道路分岔预告_${sign.exitNumber}`
    : sign.template === 'two-lane-interchange-exit'
      ? `2车道立交枢纽出口_${sign.rightRoute}`
      : sign.code
  const name = sign.template === 'expressway' ? sign.name : sign.exitName || sign.name
  const safeCode = String(code || 'road-sign').trim().replace(/[<>:"/\\|?*]/g, '_')
  const safeName = String(name || '').trim().replace(/[<>:"/\\|?*]/g, '_')
  const base = `${safeCode}${safeName ? `_${safeName}` : ''}`
  return `${base || 'road-sign'}.svg`
}

export function routeSignWidth(code: string, ROUTE_SIGN_HEIGHT: number): number {
  const naturalSize = expresswaySignNaturalSize(code)
  return ROUTE_SIGN_HEIGHT * naturalSize.width / naturalSize.height
}

export function cleanExitText(value: string, fallback: string, limit: number): string {
  const text = Array.from(String(value || '').trim()).slice(0, limit).join('')
  return text || fallback
}

export function cleanExitDistance(value: string): string {
  return String(value || '').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 1) || ' '
}

export function cleanExitRoute(value: string, fallback: string): string {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || fallback
}

export function cleanDirection(value: string, fallback: string): string {
  const direction = Array.from(String(value || '').trim()).slice(0, 1).join('')
  return ['东', '南', '西', '北'].includes(direction) ? direction : fallback
}

