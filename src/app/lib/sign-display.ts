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
    case 'dual-direction-exit-preview':
    case 'urban-expressway-exit-preview':
    case 'urban-expressway-entrance-preview':
    case 'entrance-preview-two-directions':
    case 'standard-exit-sign':
    case 'intersection-guidance':
    case 'crossroads-guidance':
    case 'roundabout-guidance':
    case 'destination-distance':
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
    case 'standard-exit-sign':
      return '国标出'
    case 'ordinary-road-exit':
      return '普通出'
    case 'dual-exit-interchange-preview':
      return '双出'
    case 'dual-direction-exit-preview':
      return '双向出'
    case 'urban-expressway-exit-preview':
      return '快速路出'
    case 'urban-expressway-entrance-preview':
      return '快速路入'
    case 'urban-expressway-road-name':
      return '快速路名'
    case 'urban-road-name':
      return '城市路名'
    case 'intersection-guidance':
      return '路口'
    case 'crossroads-guidance':
      return '十字路口'
    case 'roundabout-guidance':
      return '环岛'
    case 'destination-distance':
      return '距离'
    case 'entrance-preview-two-directions':
      return '入口'
    case 'free-mode':
      return '自由'
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
    case 'standard-exit-sign':
    case 'ordinary-road-exit':
    case 'dual-exit-interchange-preview':
    case 'dual-direction-exit-preview':
    case 'urban-expressway-exit-preview':
    case 'urban-expressway-entrance-preview':
    case 'entrance-preview-two-directions':
    case 'intersection-guidance':
    case 'crossroads-guidance':
    case 'roundabout-guidance':
    case 'destination-distance':
      return 'fork'
    case 'free-mode':
      return 'emerald'
    case 'expressway':
      return 'expressway'
    case 'urban-expressway-road-name':
      return 'expressway'
    case 'urban-road-name':
      return 'default'
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
    case 'standard-exit-sign':
      defaultName = '国标出口标识'
      break
    case 'ordinary-road-exit':
      defaultName = '普通道路出口'
      break
    case 'dual-exit-interchange-preview':
      defaultName = '双出口枢纽式互通立体交叉出口预告'
      break
    case 'dual-direction-exit-preview':
      defaultName = '双向出口预告'
      break
    case 'urban-expressway-exit-preview':
      defaultName = '无编号城市快速路出口预告'
      break
    case 'urban-expressway-entrance-preview':
      defaultName = '无编号城市快速路入口预告'
      break
    case 'urban-expressway-road-name':
      defaultName = '无编号快速路道路标识'
      break
    case 'urban-road-name':
      defaultName = '城市道路名称标识'
      break
    case 'entrance-preview-two-directions':
      defaultName = '入口预告-2方向'
      break
    case 'intersection-guidance':
      defaultName = '交叉路口指路标志'
      break
    case 'crossroads-guidance':
      defaultName = '十字路口图形式'
      break
    case 'roundabout-guidance':
      defaultName = '环岛图形式'
      break
    case 'destination-distance':
      defaultName = '地点距离标识'
      break
    case 'ordinary-road':
      defaultName = '普通道路名称标识'
      break
    case 'free-mode':
      defaultName = '自由标志'
      break
    default:
      defaultName = '高速道路名称标识'
      break
  }
  return sign.name || defaultName
}

export function signInfo(sign: Sign) {
  switch (sign.template) {
    case 'intersection-guidance':
      return [
        `交叉道路：${sign.intersectionConfig.centerRoadName || '未填写'}`,
        `方向内容：${Object.values(sign.intersectionConfig.directions).reduce((sum, items) => sum + items.length, 0)} 行`,
      ]
    case 'crossroads-guidance':
      return [
        `中央道路：${sign.crossroadsConfig.centerRoad || '未填写'}`,
        `方向内容：${Object.values(sign.crossroadsConfig.directions).reduce((sum, items) => sum + items.length, 0)} 行`,
        `方位：${sign.crossroadsConfig.cardinalDirection || '不显示'}`,
      ]
    case 'roundabout-guidance':
      return [
        `版式：${sign.roundaboutConfig.layout === 'square' ? '方形' : '横向'}`,
        `出口：${Object.values(sign.roundaboutConfig.exits).filter(exit => exit.enabled).length} 个`,
        `方位：${sign.roundaboutConfig.cardinalDirectionVisible ? sign.roundaboutConfig.cardinalDirection : '不显示'}`,
      ]
    case 'destination-distance':
      return [
        `底色：${sign.destinationDistanceConfig.background === 'green' ? '绿色' : sign.destinationDistanceConfig.background === 'blue' ? '蓝色' : '棕色'}`,
        `目的地：${sign.destinationDistanceConfig.items.length} 行`,
        `英文：${sign.destinationDistanceConfig.items.filter(item => item.englishEnabled).length} 行`,
      ]
    case 'free-mode':
      return [
        `类型：${sign.freeConfig.variant}`,
        `正文：${sign.freeConfig.rows.length} 行`,
      ]
    case 'entrance-preview-two-directions':
      return [
        `高速：${sign.rightRoute}`,
        `方向：${sign.exitName} / ${sign.exitDestination}`,
        `距离：${sign.entranceDistanceVisible ? `${sign.exitDistance || '500'}${sign.entranceDistanceUnit}` : '不显示'}`,
      ]
    case 'standard-exit-sign':
      return [
        `道路：${sign.rightRoute}`,
        `出口：${sign.exitNumber}`,
        `目的地：${sign.exitName} ${sign.exitDestination}`.trim(),
      ]
    case 'ordinary-road-exit':
      return [
        `内容：${sign.ordinaryExitContentMode === 'text' ? sign.exitName : sign.code}`,
        `底色：${sign.ordinaryExitBackground === 'blue' ? '蓝色' : '绿色'}`,
      ]
    case 'dual-exit-interchange-preview':
      return [
        `上方：${sign.leftRoute} ${sign.exitName}`.trim(),
        `下方：${sign.rightRoute} ${sign.exitDestination}`.trim(),
        `距离：${sign.exitDistance || '3'}km`,
      ]
    case 'dual-direction-exit-preview':
      return [
        `左区：${sign.leftDirection} ${sign.leftRoute} ${sign.exitName}`.trim(),
        `右区：${sign.rightDirection} ${sign.rightRoute} ${sign.exitDestination}`.trim(),
        `出口：${sign.exitNumber}`,
      ]
    case 'urban-expressway-exit-preview': {
      const arrowLabel = sign.entranceArrowDirection === 'front'
        ? '向前'
        : sign.entranceArrowDirection === 'right' ? '右出' : '左出'
      return [
        `道路：${sign.urbanRoadName} ${sign.urbanDirection}`.trim(),
        `目标：${sign.urbanDestination}方向`,
        `箭头：${arrowLabel}`,
      ]
    }
    case 'urban-expressway-entrance-preview':
      return [
        `道路：${sign.urbanRoadName}`,
        `方向：${sign.urbanDestination} / ${sign.exitDestination}`,
        `距离：${sign.exitDistance || '500'}m`,
      ]
    case 'urban-expressway-road-name':
      return [`道路：${sign.urbanRoadName}`]
    case 'urban-road-name':
      return [`道路：${sign.urbanRoadName}`]
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
  if (sign.template === 'free-mode') {return '删除自由标志？'}
  if (sign.template === 'intersection-guidance') {return '删除交叉路口指引？'}
  if (sign.template === 'crossroads-guidance') {return '删除十字路口图形式？'}
  if (sign.template === 'roundabout-guidance') {return '删除环岛图形式？'}
  if (sign.template === 'destination-distance') {return '删除地点距离标识？'}
  if (
    sign.template === 'entrance-preview-two-directions'
    || sign.template === 'urban-expressway-exit-preview'
    || sign.template === 'urban-expressway-entrance-preview'
    || sign.template === 'ordinary-road-exit'
  ) {return '删除出入口指引？'}
  return isForkSign(sign) ? '删除立交枢纽指引？' : '删除道路名称标识？'
}
