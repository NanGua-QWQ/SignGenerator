import type {
  Sign,
} from './types'

export type SignBadgeVariant =
  | 'fork'
  | 'expressway'
  | 'national'
  | 'provincial'
  | 'county'
  | 'township'
  | 'default'
  | 'slate'
  | 'amber'
  | 'emerald'
  | 'sky'
  | 'rose'
  | 'violet'

export function isForkSign(sign: Sign): boolean {
  return (
    sign.template === 'direction-guidance'
    || sign.template === 'road-fork-preview'
    || sign.template === 'two-lane-interchange-exit'
    || sign.template === 'dual-exit-interchange-preview'
    || sign.template === 'entrance-preview-two-directions'
  )
}

export function signBadge(sign: Sign): string {
  if (sign.template === 'direction-guidance') {return '分向'}
  if (sign.template === 'road-fork-preview') {return '分岔'}
  if (sign.template === 'two-lane-interchange-exit') {return '出口'}
  if (sign.template === 'dual-exit-interchange-preview') {return '双出'}
  if (sign.template === 'entrance-preview-two-directions') {return '入口'}
  if (sign.template === 'ordinary-road') {
    if (sign.kind === 'ordinary-provincial') {return '省道'}
    if (sign.kind === 'ordinary-county') {return '县道'}
    if (sign.kind === 'ordinary-township') {return '乡道'}
    return '国道'
  }
  return sign.code || 'G15'
}

export function defaultSignBadgeVariant(sign: Sign): SignBadgeVariant {
  if (
    sign.template === 'direction-guidance'
    || sign.template === 'road-fork-preview'
    || sign.template === 'two-lane-interchange-exit'
    || sign.template === 'dual-exit-interchange-preview'
    || sign.template === 'entrance-preview-two-directions'
  ) {return 'fork'}
  if (sign.template === 'expressway') {return 'expressway'}
  if (sign.template === 'ordinary-road') {
    if (sign.kind === 'ordinary-provincial') {return 'provincial'}
    if (sign.kind === 'ordinary-county') {return 'county'}
    if (sign.kind === 'ordinary-township') {return 'township'}
    return 'national'
  }
  return 'default'
}

export function signBadgeVariant(sign: Sign): SignBadgeVariant {
  return sign.popoverColor && sign.popoverColor !== 'slate' ? sign.popoverColor : defaultSignBadgeVariant(sign)
}

export function signTitle(sign: Sign): string {
  if (sign.template === 'direction-guidance') {return sign.name || '分向指路标志'}
  if (sign.template === 'road-fork-preview') {return sign.name || '道路分岔预告'}
  if (sign.template === 'two-lane-interchange-exit') {return sign.name || '2车道立交枢纽出口'}
  if (sign.template === 'dual-exit-interchange-preview') {return sign.name || '双出口枢纽式互通立体交叉出口预告'}
  if (sign.template === 'entrance-preview-two-directions') {return sign.name || '入口预告-2方向'}
  if (sign.template === 'ordinary-road') {return sign.name || '普通道路名称标识'}
  return sign.name || '高速道路名称标识'
}

export function signInfo(sign: Sign): string[] {
  if (sign.template === 'entrance-preview-two-directions') {
    return [
      `高速：${sign.rightRoute}`,
      `方向：${sign.exitName} / ${sign.exitDestination}`,
      `距离：${sign.exitDistance || '500'}m`,
    ]
  }
  if (sign.template === 'dual-exit-interchange-preview') {
    return [
      `上方：${sign.leftRoute} ${sign.exitName}`.trim(),
      `下方：${sign.rightRoute} ${sign.exitDestination}`.trim(),
      `距离：${sign.exitDistance || '3'}km`,
    ]
  }
  const left = `左区：${sign.leftDirection} ${sign.leftRoute} ${sign.exitName}`.trim()
  const right = `右区：${sign.rightDirection} ${sign.rightRoute} ${sign.exitDestination}`.trim()
  const distance
    = sign.template === 'road-fork-preview' ? `距离：${sign.exitDistance || '0'}km` : ''
  return [left, right, distance].filter(Boolean)
}

export function deleteDialogTitle(sign: Sign): string {
  if (sign.template === 'entrance-preview-two-directions') {return '删除出入口指引？'}
  return isForkSign(sign) ? '删除立交枢纽指引？' : '删除道路名称标识？'
}
