import type { Sign } from '../types'

export type SignBadgeVariant = 'fork' | 'expressway' | 'national' | 'provincial' | 'county' | 'township' | 'default' | 'slate' | 'amber' | 'emerald' | 'sky' | 'rose' | 'violet'

export function isForkSign(sign: Sign): boolean {
  return sign.template === 'direction-guidance' || sign.template === 'road-fork-preview' || sign.template === 'two-lane-interchange-exit'
}

export function signBadge(sign: Sign): string {
  if (sign.template === 'direction-guidance') return '分向'
  if (sign.template === 'road-fork-preview') return '分岔'
  if (sign.template === 'two-lane-interchange-exit') return '出口'
  if (sign.template === 'ordinary-road') {
    if (sign.kind === 'ordinary-provincial') return '省道'
    if (sign.kind === 'ordinary-county') return '县道'
    if (sign.kind === 'ordinary-township') return '乡道'
    return '国道'
  }
  return sign.code || 'G15'
}

export function defaultSignBadgeVariant(sign: Sign): SignBadgeVariant {
  if (sign.template === 'direction-guidance' || sign.template === 'road-fork-preview' || sign.template === 'two-lane-interchange-exit') return 'fork'
  if (sign.template === 'expressway') return 'expressway'
  if (sign.template === 'ordinary-road') {
    if (sign.kind === 'ordinary-provincial') return 'provincial'
    if (sign.kind === 'ordinary-county') return 'county'
    if (sign.kind === 'ordinary-township') return 'township'
    return 'national'
  }
  return 'default'
}

export function signBadgeVariant(sign: Sign): SignBadgeVariant {
  return sign.popoverColor && sign.popoverColor !== 'slate' ? sign.popoverColor : defaultSignBadgeVariant(sign)
}

export function signTitle(sign: Sign): string {
  if (sign.template === 'direction-guidance') return sign.name || '分向指路标志'
  if (sign.template === 'road-fork-preview') return sign.name || '道路分岔预告'
  if (sign.template === 'two-lane-interchange-exit') return sign.name || '2车道立交枢纽出口'
  if (sign.template === 'ordinary-road') return '普通道路标识牌'
  return sign.name || '高速编号牌'
}

export function signInfo(sign: Sign): string[] {
  const left = `左区：${sign.leftDirection} ${sign.leftRoute} ${sign.exitName}`.trim()
  const right = `右区：${sign.rightDirection} ${sign.rightRoute} ${sign.exitDestination}`.trim()
  const distance = sign.template === 'road-fork-preview' ? `距离：${sign.exitDistance || '0'}km` : ''
  return [left, right, distance].filter(Boolean)
}

export function deleteDialogTitle(sign: Sign): string {
  return isForkSign(sign) ? '删除分叉指引？' : '删除标识牌？'
}
