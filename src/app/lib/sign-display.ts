import type {
  Sign,
  SignTemplate,
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

const FORK_TEMPLATES = [
  'direction-guidance',
  'road-fork-preview',
  'two-lane-interchange-exit',
  'dual-exit-interchange-preview',
  'entrance-preview-two-directions',
] as const
export function isForkSign(sign: Sign) {
  return (FORK_TEMPLATES as readonly SignTemplate[]).includes(sign.template)
}

const ORDINARY_ROAD_BADGE: Partial<Record<Sign['kind'], string>> = {
  'ordinary-provincial': '省道',
  'ordinary-county': '县道',
  'ordinary-township': '乡道',
}
const SIGN_BADGE_BY_TEMPLATE: Partial<Record<SignTemplate, string>> = {
  'direction-guidance': '分向',
  'road-fork-preview': '分岔',
  'two-lane-interchange-exit': '出口',
  'dual-exit-interchange-preview': '双出',
  'entrance-preview-two-directions': '入口',
}
export function signBadge(sign: Sign) {
  if (sign.template === 'ordinary-road') {
    return ORDINARY_ROAD_BADGE[sign.kind] ?? '国道'
  }
  return SIGN_BADGE_BY_TEMPLATE[sign.template] ?? sign.code ?? 'G15'
}

const ORDINARY_ROAD_VARIANT: Partial<Record<Sign['kind'], SignBadgeVariant>> = {
  'ordinary-provincial': 'provincial',
  'ordinary-county': 'county',
  'ordinary-township': 'township',
}
const SIGN_BADGE_VARIANT_BY_TEMPLATE: Partial<Record<SignTemplate, SignBadgeVariant>> = {
  'direction-guidance': 'fork',
  'road-fork-preview': 'fork',
  'two-lane-interchange-exit': 'fork',
  'dual-exit-interchange-preview': 'fork',
  'entrance-preview-two-directions': 'fork',
  'expressway': 'expressway',
}
export function defaultSignBadgeVariant(sign: Sign) {
  if (sign.template === 'ordinary-road') {
    return ORDINARY_ROAD_VARIANT[sign.kind] ?? 'national'
  }
  return SIGN_BADGE_VARIANT_BY_TEMPLATE[sign.template] ?? 'default'
}

export const signBadgeVariant = (sign: Sign) =>
  sign.popoverColor && sign.popoverColor !== 'slate' ? sign.popoverColor : defaultSignBadgeVariant(sign)

const TEMPLATE_DEFAULT_NAME: Partial<Record<SignTemplate, string>> = {
  'direction-guidance': '分向指路标志',
  'road-fork-preview': '道路分岔预告',
  'two-lane-interchange-exit': '2车道立交枢纽出口',
  'dual-exit-interchange-preview': '双出口枢纽式互通立体交叉出口预告',
  'entrance-preview-two-directions': '入口预告-2方向',
  'ordinary-road': '普通道路名称标识',
}
export function signTitle(sign: Sign) {
  return sign.name || TEMPLATE_DEFAULT_NAME[sign.template] || '高速道路名称标识'
}

const SIGN_INFO_BY_TEMPLATE: Partial<Record<SignTemplate, (sign: Sign) => string[]>> = {
  'entrance-preview-two-directions': sign => [
    `高速：${sign.rightRoute}`,
    `方向：${sign.exitName} / ${sign.exitDestination}`,
    `距离：${sign.exitDistance || '500'}m`,
  ],
  'dual-exit-interchange-preview': sign => [
    `上方：${sign.leftRoute} ${sign.exitName}`.trim(),
    `下方：${sign.rightRoute} ${sign.exitDestination}`.trim(),
    `距离：${sign.exitDistance || '3'}km`,
  ],
  'direction-guidance': sign => {
    const left = `左区：${sign.leftDirection} ${sign.leftRoute} ${sign.exitName}`.trim()
    const right = `右区：${sign.rightDirection} ${sign.rightRoute} ${sign.exitDestination}`.trim()
    return [left, right].filter(Boolean)
  },
  'road-fork-preview': sign => {
    const left = `左区：${sign.leftDirection} ${sign.leftRoute} ${sign.exitName}`.trim()
    const right = `右区：${sign.rightDirection} ${sign.rightRoute} ${sign.exitDestination}`.trim()
    const distance = `距离：${sign.exitDistance || '0'}km`
    return [left, right, distance].filter(Boolean)
  },
  'two-lane-interchange-exit': sign => {
    const left = `左区：${sign.leftDirection} ${sign.leftRoute} ${sign.exitName}`.trim()
    const right = `右区：${sign.rightDirection} ${sign.rightRoute} ${sign.exitDestination}`.trim()
    return [left, right].filter(Boolean)
  },
}
export function signInfo(sign: Sign) {
  const build = SIGN_INFO_BY_TEMPLATE[sign.template]
  if (build) {
    return build(sign)
  }
  const left = `左区：${sign.leftDirection} ${sign.leftRoute} ${sign.exitName}`.trim()
  const right = `右区：${sign.rightDirection} ${sign.rightRoute} ${sign.exitDestination}`.trim()
  return [left, right].filter(Boolean)
}

export function deleteDialogTitle(sign: Sign) {
  return `删除${signTitle(sign)}？`
}
