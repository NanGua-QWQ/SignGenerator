import type { ExpresswayKind, OrdinaryRoadKind, Sign } from '../types'
import { generateExpresswaySignSvg, expresswaySignNaturalSize } from './expressway'
import { generateOrdinaryRoadSignSvg, ordinaryRoadFilename } from './ordinary_road'
import { generateRoadForkPreviewSvg } from './Interchange/road-fork-preview'
import { generateTwoLaneInterchangeExitSvg } from './Interchange/two-lane-interchange-exit'

export async function generateSignSvg(sign: Sign): Promise<string> {
  if (sign.template === 'two-lane-interchange-exit') return generateTwoLaneInterchangeExitSvg(sign)
  if (sign.template === 'road-fork-preview') return generateRoadForkPreviewSvg(sign)
  if (sign.template === 'ordinary-road') return generateOrdinaryRoadSignSvg(sign.kind as OrdinaryRoadKind, sign.digits)
  return generateExpresswaySignSvg(sign.code, sign.name, sign.provinceLabel, sign.kind as ExpresswayKind, sign.threeDigitDescend)
}

export function signFilename(sign: Sign): string {
  const code = sign.template === 'road-fork-preview'
    ? `道路分岔预告_${sign.exitNumber}`
    : sign.template === 'two-lane-interchange-exit'
      ? `2车道立交枢纽出口_${sign.rightRoute}`
      : sign.template === 'ordinary-road'
        ? ordinaryRoadFilename(sign.kind as OrdinaryRoadKind, sign.digits).replace(/\.svg$/, '')
      : sign.code
  const name = sign.template === 'expressway' || sign.template === 'ordinary-road' ? sign.name : sign.exitName || sign.name
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

export function cleanDigits(value: string): string {
  return String(value || '').replace(/\D/g, '').slice(0, 4)
}

export function cleanProvinceLabel(value: string): string {
  return Array.from(String(value || '').trim()).slice(0, 1).join('')
}

export function nameLimitForDigits(digits: string): number {
  return digits.length === 4 ? 6 : 4
}

export function cleanName(value: string, digits: string): string {
  return Array.from(String(value || '')).slice(0, nameLimitForDigits(digits)).join('')
}

export function cleanExitNumber(value: string): string {
  return String(value || '').replace(/\D/g, '').slice(0, 4)
}

export function cleanRoute(value: string, fallback: string): string {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || fallback
}