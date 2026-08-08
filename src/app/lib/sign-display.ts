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

export function isForkSign(sign: Sign) {
  switch (sign.template) {
    case 'direction-guidance':
    case 'road-fork-preview':
    case 'two-lane-interchange-exit':
    case 'dual-exit-interchange-preview':
    case 'entrance-preview-two-directions':
      return true
    default:
      return false
  }
}

export function signBadge(sign: Sign) {
  switch (sign.template) {
    case 'direction-guidance':
      return '分向'
    case 'road-fork-preview':
      return '分岔'
    case 'two-lane-interchange-exit':
      return '出口'
    case 'dual-exit-interchange-preview':
      return '双出'
    case 'entrance-preview-two-directions':
      return '入口'
    case 'ordinary-road':
      switch (sign.kind) {
        case 'ordinary-provincial':
          return '省道'
        case 'ordinary-county':
          return '县道'
        case 'ordinary-township':
          return '乡道'
        default:
          return '国道'
      }
    default:
      return sign.code || 'G15'
  }
}

export function defaultSignBadgeVariant(sign: Sign) {
  switch (sign.template) {
    case 'direction-guidance':
    case 'road-fork-preview':
    case 'two-lane-interchange-exit':
    case 'dual-exit-interchange-preview':
    case 'entrance-preview-two-directions':
      return 'fork'
    case 'expressway':
      return 'expressway'
    case 'ordinary-road':
      switch (sign.kind) {
        case 'ordinary-provincial':
          return 'provincial'
        case 'ordinary-county':
          return 'county'
        case 'ordinary-township':
          return 'township'
        default:
          return 'national'
      }
    default:
      return 'default'
  }
}

export const signBadgeVariant = (sign: Sign) =>
  sign.popoverColor && sign.popoverColor !== 'slate' ? sign.popoverColor : defaultSignBadgeVariant(sign)

export function signTitle(sign: Sign) {
  let defaultName: string
  switch (sign.template) {
    case 'direction-guidance':
      defaultName = '分向指路标志'
      break
    case 'road-fork-preview':
      defaultName = '道路分岔预告'
      break
    case 'two-lane-interchange-exit':
      defaultName = '2车道立交枢纽出口'
      break
    case 'dual-exit-interchange-preview':
      defaultName = '双出口枢纽式互通立体交叉出口预告'
      break
    case 'entrance-preview-two-directions':
      defaultName = '入口预告-2方向'
      break
    case 'ordinary-road':
      defaultName = '普通道路名称标识'
      break
    default:
      defaultName = '高速道路名称标识'
      break
  }
  return sign.name || defaultName
}

export function signInfo(sign: Sign) {
  switch (sign.template) {
    case 'entrance-preview-two-directions':
      return [
        `高速：${sign.rightRoute}`,
        `方向：${sign.exitName} / ${sign.exitDestination}`,
        `距离：${sign.exitDistance || '500'}m`,
      ]
    case 'dual-exit-interchange-preview':
      return [
        `上方：${sign.leftRoute} ${sign.exitName}`.trim(),
        `下方：${sign.rightRoute} ${sign.exitDestination}`.trim(),
        `距离：${sign.exitDistance || '3'}km`,
      ]
    default: {
      const left = `左区：${sign.leftDirection} ${sign.leftRoute} ${sign.exitName}`.trim()
      const right = `右区：${sign.rightDirection} ${sign.rightRoute} ${sign.exitDestination}`.trim()
      const distance
        = sign.template === 'road-fork-preview' ? `距离：${sign.exitDistance || '0'}km` : ''
      return [left, right, distance].filter(Boolean)
    }
  }
}

export function deleteDialogTitle(sign: Sign) {
  if (sign.template === 'entrance-preview-two-directions') {return '删除出入口指引？'}
  return isForkSign(sign) ? '删除立交枢纽指引？' : '删除道路名称标识？'
}
