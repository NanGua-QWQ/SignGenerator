import {
  cleanExpresswayName,
  nameLimitForDigits,
} from '@/lib/expressway-name'
import type {
  EntranceArrowDirection, ExpresswayKind, OrdinaryRoadKind, Sign, SignKind,
} from '@/lib/types'

import {
  DestinationDistanceSign,
} from './destination-distance'
import {
  OrdinaryRoadExitSign,
} from './exit/ordinary-road-exit'
import {
  StandardExitSign,
} from './exit/standard-exit-sign'
import {
  TwoLaneInterchangeExitSign,
} from './exit/two-lane-interchange-exit'
import {
  FreeModeSign,
} from './free-mode-sign'
import {
  DirectionGuidanceSign,
} from './interchange/direction-guidance'
import {
  DualDirectionExitPreviewSign,
} from './interchange/dual-direction-exit-preview'
import {
  DualExitInterchangePreviewSign,
} from './interchange/dual-exit-interchange-preview'
import {
  EntrancePreviewTwoDirectionsSign,
} from './interchange/entrance-preview-two-directions'
import {
  RoadForkPreviewSign,
} from './interchange/road-fork-preview'
import {
  UrbanExpresswayEntrancePreviewSign,
  UrbanExpresswayExitPreviewSign,
} from './interchange/urban-expressway-preview'
import {
  CrossroadsGuidanceSign,
} from './intersection/crossroads-guidance'
import {
  IntersectionGuidanceSign,
} from './intersection/intersection-guidance'
import {
  RoundaboutGuidanceSign,
} from './intersection/roundabout-guidance'
import {
  ExpresswaySignSvg, expresswaySignNaturalSize,
} from './sign/expressway'
import {
  OrdinaryRoadSignSvg, ordinaryRoadFilename,
} from './sign/ordinary_road'
import {
  UrbanExpresswayRoadNameSign,
} from './sign/urban-expressway-road-name'
import {
  UrbanRoadNameSign,
} from './sign/urban-road-name'

function SignSvgContent(sign: Sign, roadSignList: Sign[] = []) {
  switch (sign.template) {
    case 'intersection-guidance':
      return <IntersectionGuidanceSign sign={sign} roadSignList={roadSignList} />
    case 'crossroads-guidance':
      return <CrossroadsGuidanceSign sign={sign} roadSignList={roadSignList} />
    case 'roundabout-guidance':
      return <RoundaboutGuidanceSign sign={sign} roadSignList={roadSignList} />
    case 'destination-distance':
      return <DestinationDistanceSign sign={sign} roadSignList={roadSignList} />
    case 'free-mode':
      return <FreeModeSign sign={sign} roadSignList={roadSignList} />
    case 'direction-guidance':
      return <DirectionGuidanceSign sign={sign} />
    case 'two-lane-interchange-exit':
      return <TwoLaneInterchangeExitSign sign={sign} />
    case 'standard-exit-sign':
      return <StandardExitSign sign={sign} />
    case 'ordinary-road-exit':
      return <OrdinaryRoadExitSign sign={sign} />
    case 'dual-exit-interchange-preview':
      return <DualExitInterchangePreviewSign sign={sign} />
    case 'dual-direction-exit-preview':
      return <DualDirectionExitPreviewSign sign={sign} />
    case 'urban-expressway-exit-preview':
      return <UrbanExpresswayExitPreviewSign sign={sign} />
    case 'urban-expressway-entrance-preview':
      return <UrbanExpresswayEntrancePreviewSign sign={sign} />
    case 'entrance-preview-two-directions':
      return <EntrancePreviewTwoDirectionsSign sign={sign} />
    case 'road-fork-preview':
      return <RoadForkPreviewSign sign={sign} />
    case 'ordinary-road':
      return <OrdinaryRoadSignSvg kind={sign.kind as OrdinaryRoadKind} digits={sign.digits} />
    case 'urban-expressway-road-name':
      return <UrbanExpresswayRoadNameSign name={sign.urbanRoadName} />
    case 'urban-road-name':
      return <UrbanRoadNameSign
        name={sign.urbanRoadName}
        style={sign.urbanRoadStyle}
        routeSign={roadSignList.find(item => item.id === sign.urbanRoadRouteSignId)}
      />
    default:
      return (
        <ExpresswaySignSvg
          code={sign.code}
          name={sign.name}
          provinceLabel={sign.provinceLabel}
          kind={sign.kind as ExpresswayKind}
          threeDigitDescend={sign.threeDigitDescend}
        />
      )
  }
}

export function SignSvg({
  sign, roadSignList = [],
}: { sign: Sign; roadSignList?: Sign[] }) {
  return SignSvgContent(sign, roadSignList)
}

export function signFilename(sign: Sign) {
  let code: string
  switch (sign.template) {
    case 'road-fork-preview': {
      code = `道路分岔预告_${sign.exitNumber}`
      break
    }
    case 'direction-guidance': {
      code = `分向指路标志_${sign.leftRoute}_${sign.rightRoute}`
      break
    }
    case 'two-lane-interchange-exit': {
      code = `2车道立交枢纽出口_${sign.rightRoute}`
      break
    }
    case 'standard-exit-sign': {
      code = `国标出口标识_${sign.exitNumber}_${sign.rightRoute}`
      break
    }
    case 'ordinary-road-exit': {
      code = `普通道路出口_${sign.ordinaryExitContentMode === 'text' ? sign.exitName : sign.code}`
      break
    }
    case 'intersection-guidance': {
      code = `交叉路口_${sign.intersectionConfig.centerRoadName || '未命名'}`
      break
    }
    case 'crossroads-guidance': {
      code = `十字路口图形式_${sign.crossroadsConfig.centerRoad || '未命名'}`
      break
    }
    case 'roundabout-guidance': {
      const destinations = Object.values(sign.roundaboutConfig.exits)
        .filter(exit => exit.enabled && exit.destination)
        .map(exit => exit.destination)
        .slice(0, 2)
        .join('_')
      code = `环岛图形式_${destinations || '未命名'}`
      break
    }
    case 'destination-distance': {
      const first = sign.destinationDistanceConfig.items[0]
      code = `地点距离标识_${first?.text || first?.distance || '未命名'}`
      break
    }
    case 'dual-exit-interchange-preview': {
      code = `双出口枢纽式互通立体交叉出口预告_${sign.leftRoute}_${sign.rightRoute}`
      break
    }
    case 'dual-direction-exit-preview': {
      code = `双向出口预告_${sign.exitNumber}`
      break
    }
    case 'urban-expressway-exit-preview': {
      code = `无编号城市快速路出口预告_${sign.urbanDestination}`
      break
    }
    case 'urban-expressway-entrance-preview': {
      code = `无编号城市快速路入口预告_${sign.urbanRoadName}`
      break
    }
    case 'entrance-preview-two-directions': {
      code = `入口预告-2方向_${sign.rightRoute}`
      break
    }
    case 'ordinary-road': {
      code = ordinaryRoadFilename(sign.kind as OrdinaryRoadKind, sign.digits).replace(/\.svg$/, '')
      break
    }
    case 'free-mode': {
      code = `自由标志_${sign.name || '未命名'}`
      break
    }
    case 'urban-expressway-road-name': {
      code = `无编号快速路道路标识_${sign.urbanRoadName}`
      break
    }
    case 'urban-road-name': {
      code = `城市道路名称标识_${sign.urbanRoadName}`
      break
    }
    default: {
      code = sign.code
      break
    }
  }
  const name = sign.template === 'destination-distance' || sign.template === 'roundabout-guidance'
    ? ''
    : sign.template === 'expressway' || sign.template === 'ordinary-road'
      ? sign.name
      : sign.exitName || sign.name
  const safeCode = String(code || 'road-sign')
    .trim()
    .replace(/[<>:"/\\|?*]/g, '_')
  const safeName = String(name || '')
    .trim()
    .replace(/[<>:"/\\|?*]/g, '_')
  const base = `${safeCode}${safeName ? `_${safeName}` : ''}`
  return `${base || 'road-sign'}.svg`
}

export function routeSignWidth(code: string, ROUTE_SIGN_HEIGHT: number, kind: SignKind = 'national') {
  if (kind === 'urban-road') {
    return ROUTE_SIGN_HEIGHT * 760 / 300
  }
  if (kind === 'urban-expressway') {
    const naturalWidth = Math.max(520, Array.from(code).length * 90 + 220)
    return naturalWidth * ROUTE_SIGN_HEIGHT / 360
  }
  if (kind === 'ordinary-national' || kind === 'ordinary-provincial' || kind === 'ordinary-county' || kind === 'ordinary-township') {
    return ROUTE_SIGN_HEIGHT * 213.51 / 102.59
  }
  const naturalSize = expresswaySignNaturalSize(code)
  return ROUTE_SIGN_HEIGHT * naturalSize.width / naturalSize.height
}

export function fitRoutePairWidths(
  leftWidth: number,
  rightWidth: number,
  availableWidth: number,
  minGap = 18,
) {
  const scale = Math.min(1, Math.max(0, (availableWidth - minGap) / (leftWidth + rightWidth)))
  return {
    leftWidth: leftWidth * scale,
    rightWidth: rightWidth * scale,
  }
}

export function cleanExitText(value: string, fallback: string, limit: number) {
  const text = Array.from(String(value || '').trim())
    .slice(0, limit)
    .join('')
  return text || fallback
}

export const cleanExitDistance = (value: string) =>

  String(value || '')
    .replace(/[^\d.]/g, '')
    .replace(/(\..*)\./g, '$1')
    .slice(0, 1) || ' '

export const cleanEntranceDistance = (value: string) =>

  String(value || '')
    .replace(/\D/g, '')
    .slice(0, 4) || '500'

export const cleanExitRoute = (value: string, fallback: string, kind: SignKind = 'national') =>
  kind === 'urban-expressway'
    ? cleanExitText(value, fallback, 12)
    : String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 5) || fallback

export function cleanDirection(value: string, fallback: string) {
  const direction = Array.from(String(value || '').trim())
    .slice(0, 1)
    .join('')
  return ['东', '南', '西', '北'].includes(direction) ? direction : fallback
}

export function cleanEntranceArrowDirection(value: string | undefined): EntranceArrowDirection {
  switch (value) {
    case 'left':
    case 'right':
    case 'front':
      return value
    default:
      return 'front'
  }
}

export const cleanDigits = (value: string) =>
  String(value || '')
    .replace(/\D/g, '')
    .slice(0, 4)

export const cleanProvinceLabel = (value: string) =>
  Array.from(String(value || '').trim())
    .slice(0, 1)
    .join('')

export {
  nameLimitForDigits,
}

export const cleanName = cleanExpresswayName

export const cleanExitNumber = (value: string) =>
  String(value || '')
    .replace(/\D/g, '')
    .slice(0, 4)

export const cleanRoute = (value: string, fallback: string) =>

  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5) || fallback
