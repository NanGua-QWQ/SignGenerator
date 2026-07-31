import type { ExpresswayKind, OrdinaryRoadKind, Sign } from '../types'
import { generateExpresswaySignSvg, expresswaySignNaturalSize } from './sign/expressway'
import { generateOrdinaryRoadSignSvg, ordinaryRoadFilename } from './sign/ordinary_road'
import { generateDirectionGuidanceSvg } from './Interchange/direction-guidance'
import { generateEntrancePreviewTwoDirectionsSvg } from './Interchange/entrance-preview-two-directions'
import { generateRoadForkPreviewSvg } from './Interchange/road-fork-preview'
import { generateTwoLaneInterchangeExitSvg } from './Interchange/two-lane-interchange-exit'

export async function generateSignSvg(sign: Sign): Promise<string> {
  if (sign.template === 'direction-guidance') return generateDirectionGuidanceSvg(sign)
  if (sign.template === 'two-lane-interchange-exit') return generateTwoLaneInterchangeExitSvg(sign)
  if (sign.template === 'entrance-preview-two-directions') return generateEntrancePreviewTwoDirectionsSvg(sign)
  if (sign.template === 'road-fork-preview') return generateRoadForkPreviewSvg(sign)
  if (sign.template === 'ordinary-road') return generateOrdinaryRoadSignSvg(sign.kind as OrdinaryRoadKind, sign.digits)
  return generateExpresswaySignSvg(sign.code, sign.name, sign.provinceLabel, sign.kind as ExpresswayKind, sign.threeDigitDescend)
}

export function signFilename(sign: Sign): string {
  let code: string
  switch (sign.template) {
    case 'road-fork-preview':
      code = `道路分岔预告_${sign.exitNumber}`
      break
    case 'direction-guidance':
      code = `分向指路标志_${sign.leftRoute}_${sign.rightRoute}`
      break
    case 'two-lane-interchange-exit':
      code = `2车道立交枢纽出口_${sign.rightRoute}`
      break
    case 'entrance-preview-two-directions':
      code = `入口预告-2方向_${sign.rightRoute}`
      break
    case 'ordinary-road':
      code = ordinaryRoadFilename(sign.kind as OrdinaryRoadKind, sign.digits).replace(/\.svg$/, '')
      break
    default:
      code = sign.code
      break
  }
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

export function cleanEntranceDistance(value: string): string {
  return String(value || '').replace(/\D/g, '').slice(0, 4) || '500'
}

export function cleanExitRoute(value: string, fallback: string): string {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || fallback
}

export function cleanDirection(value: string, fallback: string): string {
  const direction = Array.from(String(value || '').trim()).slice(0, 1).join('')
  return ['东', '南', '西', '北'].includes(direction) ? direction : fallback
}

export function cleanEntranceArrowDirection(value: string | undefined): 'front' | 'left' | 'right' {
  return value === 'left' || value === 'right' || value === 'front' ? value : 'front'
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
