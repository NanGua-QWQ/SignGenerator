import {
  isPopoverColor,
} from './popover-options'
import {
  cleanDigits,
  cleanDirection,
  cleanEntranceArrowDirection,
  cleanEntranceDistance,
  cleanExitDistance,
  cleanExitNumber,
  cleanExitText,
  cleanName,
  cleanProvinceLabel,
  cleanRoute,
} from '../generators/generator'

import type {
  CrossroadsConfig, CrossroadsItem, DestinationDistanceConfig, ExpresswayKind,
  FreeSignConfig, IntersectionConfig, IntersectionItem,
  OrdinaryRoadKind, RoundaboutConfig, RoundaboutDirection, Sign, SignKind,
  SignTemplate, UrbanRoadStyle,
} from './types'

type SignWorkspaceTab =
  | 'signs'
  | 'intersection-guidance'
  | 'destination-distance'
  | 'interchange-guidance'
  | 'entrance-exit-guidance'
  | 'free-mode'
type ForkTemplate = Extract<
  SignTemplate,
  | 'direction-guidance'
  | 'road-fork-preview'
  | 'two-lane-interchange-exit'
  | 'dual-exit-interchange-preview'
  | 'dual-direction-exit-preview'
  | 'urban-expressway-exit-preview'
  | 'urban-expressway-entrance-preview'
  | 'entrance-preview-two-directions'
  | 'standard-exit-sign'
  | 'ordinary-road-exit'
  | 'urban-expressway-road-name'
>
type InterchangeTemplate = Extract<
  SignTemplate,
  | 'direction-guidance'
  | 'road-fork-preview'
  | 'two-lane-interchange-exit'
  | 'dual-exit-interchange-preview'
  | 'dual-direction-exit-preview'
>
type EntranceExitTemplate = Extract<
  SignTemplate,
  | 'entrance-preview-two-directions'
  | 'urban-expressway-exit-preview'
  | 'urban-expressway-entrance-preview'
  | 'standard-exit-sign'
  | 'ordinary-road-exit'
>

const ORDINARY_ROAD_PREFIX: Record<OrdinaryRoadKind, string> = {
  'ordinary-national': 'G',
  'ordinary-provincial': 'S',
  'ordinary-county': 'X',
  'ordinary-township': 'Y',
}

const FORK_SIGN_NAME: Record<ForkTemplate, string> = {
  'direction-guidance': '分向指路标志',
  'road-fork-preview': '道路分岔预告',
  'two-lane-interchange-exit': '2车道立交枢纽出口',
  'dual-exit-interchange-preview': '双出口枢纽式互通立体交叉出口预告',
  'dual-direction-exit-preview': '双向出口预告',
  'urban-expressway-exit-preview': '无编号城市快速路出口预告',
  'urban-expressway-entrance-preview': '无编号城市快速路入口预告',
  'entrance-preview-two-directions': '入口预告-2方向',
  'standard-exit-sign': '国标出口标识',
  'ordinary-road-exit': '普通道路出口',
  'urban-expressway-road-name': '无编号快速路道路标识',
}

export const INTERCHANGE_ADD_CHOICES = [
  {
    value: 'direction-guidance',
    label: '分向指路标志',
  },
  {
    value: 'road-fork-preview',
    label: '道路分岔预告',
  },
  {
    value: 'two-lane-interchange-exit',
    label: '2车道立交枢纽出口',
  },
  {
    value: 'dual-exit-interchange-preview',
    label: '双出口枢纽式互通立体交叉出口预告',
  },
  {
    value: 'dual-direction-exit-preview',
    label: '双向出口预告',
  },
] satisfies { value: InterchangeTemplate; label: string }[]

export const ENTRANCE_EXIT_ADD_CHOICES = [
  {
    value: 'standard-exit-sign',
    label: '国标出口标识',
  },
  {
    value: 'ordinary-road-exit',
    label: '普通道路出口',
  },
  {
    value: 'urban-expressway-exit-preview',
    label: '无编号城市快速路出口预告',
  },
  {
    value: 'urban-expressway-entrance-preview',
    label: '无编号城市快速路入口预告',
  },
  {
    value: 'entrance-preview-two-directions',
    label: '入口预告-2方向',
  },
] satisfies { value: EntranceExitTemplate; label: string }[]

export const SIGN_ADD_CHOICES = [
  {
    value: 'expressway',
    label: '高速道路名称标识',
  },
  {
    value: 'urban-road-name',
    label: '城市道路名称标识',
  },
  {
    value: 'urban-expressway-road-name',
    label: '无编号快速路道路标识',
  },
  {
    value: 'ordinary-road',
    label: '普通道路名称标识',
  },
] satisfies { value: SignTemplate; label: string }[]

export const INTERSECTION_ADD_CHOICES = [
  {
    value: 'intersection-guidance',
    label: '交叉路口指路标志',
  },
  {
    value: 'crossroads-guidance',
    label: '十字路口图形式',
  },
  {
    value: 'roundabout-guidance',
    label: '环岛图形式',
  },
] satisfies { value: SignTemplate; label: string }[]

export const DESTINATION_DISTANCE_ADD_CHOICES = [
  {
    value: 'destination-distance',
    label: '地点距离标识',
  },
] satisfies { value: SignTemplate; label: string }[]

export const FREE_MODE_ADD_CHOICES = [
  {
    value: 'free-mode',
    label: '自由标志',
  },
] satisfies { value: SignTemplate; label: string }[]

export function isExpresswayKind(value: SignKind | undefined): value is ExpresswayKind {
  switch (value) {
    case 'national':
    case 'provincial':
    case 'beijing-tianjin-hebei':
      return true
    default:
      return false
  }
}

export function isOrdinaryRoadKind(value: SignKind | undefined): value is OrdinaryRoadKind {
  switch (value) {
    case 'ordinary-national':
    case 'ordinary-provincial':
    case 'ordinary-county':
    case 'ordinary-township':
      return true
    default:
      return false
  }
}

export function isRoadSignTemplate(template: SignTemplate) {
  switch (template) {
    case 'expressway':
    case 'urban-road-name':
    case 'urban-expressway-road-name':
    case 'ordinary-road':
      return true
    default:
      return false
  }
}

export function isForkTemplate(template: SignTemplate) {
  switch (template) {
    case 'direction-guidance':
    case 'road-fork-preview':
    case 'two-lane-interchange-exit':
    case 'dual-exit-interchange-preview':
    case 'dual-direction-exit-preview':
    case 'urban-expressway-exit-preview':
    case 'urban-expressway-entrance-preview':
    case 'entrance-preview-two-directions':
    case 'standard-exit-sign':
    case 'ordinary-road-exit':
      return true
    default:
      return false
  }
}

export function isTemplateParam(value: string | null): value is SignTemplate {
  switch (value) {
    case 'expressway':
    case 'urban-road-name':
    case 'urban-expressway-road-name':
    case 'ordinary-road':
    case 'direction-guidance':
    case 'road-fork-preview':
    case 'two-lane-interchange-exit':
    case 'dual-exit-interchange-preview':
    case 'dual-direction-exit-preview':
    case 'urban-expressway-exit-preview':
    case 'urban-expressway-entrance-preview':
    case 'entrance-preview-two-directions':
    case 'standard-exit-sign':
    case 'ordinary-road-exit':
    case 'intersection-guidance':
    case 'crossroads-guidance':
    case 'roundabout-guidance':
    case 'destination-distance':
    case 'free-mode':
      return true
    default:
      return false
  }
}

export function templateForTab(tab: SignWorkspaceTab) {
  switch (tab) {
    case 'interchange-guidance':
      return 'direction-guidance'
    case 'intersection-guidance':
      return 'intersection-guidance'
    case 'destination-distance':
      return 'destination-distance'
    case 'entrance-exit-guidance':
      return 'entrance-preview-two-directions'
    case 'free-mode':
      return 'free-mode'
    default:
      return 'expressway'
  }
}

export function visibleSignsForTab(signs: Sign[], tab: SignWorkspaceTab) {
  switch (tab) {
    case 'intersection-guidance':
      return signs.filter(sign => sign.template === 'intersection-guidance'
        || sign.template === 'crossroads-guidance'
        || sign.template === 'roundabout-guidance')
    case 'destination-distance':
      return signs.filter(sign => sign.template === 'destination-distance')
    case 'interchange-guidance':
      return signs.filter(
        sign => sign.template === 'direction-guidance'
          || sign.template === 'road-fork-preview'
          || sign.template === 'two-lane-interchange-exit'
          || sign.template === 'dual-exit-interchange-preview'
          || sign.template === 'dual-direction-exit-preview',
      )
    case 'entrance-exit-guidance':
      return signs.filter(
        sign => sign.template === 'standard-exit-sign'
          || sign.template === 'ordinary-road-exit'
          || sign.template === 'entrance-preview-two-directions'
          || sign.template === 'urban-expressway-exit-preview'
          || sign.template === 'urban-expressway-entrance-preview',
      )
    case 'free-mode':
      return signs.filter(sign => sign.template === 'free-mode')
    default:
      return signs.filter(sign => isRoadSignTemplate(sign.template))
  }
}

export function parseInitialKind(value: string | null) {
  switch (value) {
    case 'national':
    case 'provincial':
    case 'beijing-tianjin-hebei':
      return value
    default:
      return undefined
  }
}

export function normalizeSign(overrides: Partial<Sign> = {
}) {
  const template = overrides.template ?? 'expressway'
  const isEntrancePreview = template === 'entrance-preview-two-directions'
  const isUrbanExitPreview = template === 'urban-expressway-exit-preview'
  const isUrbanEntrancePreview = template === 'urban-expressway-entrance-preview'
  const isStandardExitSign = template === 'standard-exit-sign'
  const isOrdinaryRoadExit = template === 'ordinary-road-exit'
  const urbanRoadStyles: UrbanRoadStyle[] = [
    'plain',
    'right-chevron',
    'bidirectional',
    'straight-text',
    'straight-route',
  ]
  const ordinaryExitContentMode: Sign['ordinaryExitContentMode']
    = overrides.ordinaryExitContentMode === 'road-code' ? 'road-code' : 'text'
  const ordinaryExitBackground: Sign['ordinaryExitBackground']
    = overrides.ordinaryExitBackground === 'green' ? 'green' : 'blue'
  const isDualExitPreview = template === 'dual-exit-interchange-preview'
  const isDualDirectionExitPreview = template === 'dual-direction-exit-preview'
  const exitNameLimit = isDualDirectionExitPreview || isOrdinaryRoadExit ? 12 : 6
  const exitDestinationLimit = isDualDirectionExitPreview || isUrbanExitPreview ? 12 : 8
  const defaultExitDestination
    = template === 'two-lane-interchange-exit' || isDualExitPreview
      ? '广州'
      : isDualDirectionExitPreview ? '贺州' : isUrbanExitPreview ? '沪太路' : isStandardExitSign ? '济宁' : '东莞 深圳'
  const defaultExitName = isDualDirectionExitPreview ? '汕头' : isDualExitPreview ? '永州' : isStandardExitSign ? '日照' : isOrdinaryRoadExit ? '宝杨路' : isEntrancePreview ? '汕头' : '清远'
  const defaultExitNumber = isDualDirectionExitPreview ? '133' : isStandardExitSign ? '50' : '360'
  const defaultLeftRoute = isDualExitPreview ? 'G55' : isDualDirectionExitPreview ? 'G78' : 'G0421'
  const defaultRightRoute = isDualExitPreview ? 'G55' : isDualDirectionExitPreview ? 'G78' : 'G15'
  const defaultLeftDirection = isDualDirectionExitPreview ? '东' : '北'
  const defaultRightDirection = isDualDirectionExitPreview ? '西' : '东'
  const defaultUrbanRoadName = isUrbanExitPreview
    ? '南北高架路'
    : template === 'urban-expressway-road-name' ? '北四环' : template === 'urban-road-name' ? '南京路' : '九水路'
  const defaultUrbanDirection = isUrbanExitPreview ? '北' : '北'
  const defaultUrbanDestination = isUrbanExitPreview ? '共和新路立交' : '李沧'
  const leftRoute = overrides.leftRouteKind === 'urban-expressway' || overrides.leftRouteKind === 'urban-road'
    ? cleanExitText(overrides.leftRoute ?? '中环路', '中环路', 12)
    : cleanRoute(overrides.leftRoute ?? defaultLeftRoute, defaultLeftRoute)
  const rightRoute = overrides.rightRouteKind === 'urban-expressway' || overrides.rightRouteKind === 'urban-road'
    ? cleanExitText(overrides.rightRoute ?? '中环路', '中环路', 12)
    : cleanRoute(overrides.rightRoute ?? defaultRightRoute, defaultRightRoute)
  const parsed
    = template === 'ordinary-road' || isOrdinaryRoadExit && isOrdinaryRoadKind(overrides.kind) ? {
      kind: isOrdinaryRoadKind(overrides.kind) ? overrides.kind : 'ordinary-national',
      digits:
            overrides.digits === undefined ? cleanDigits(overrides.code ?? '') || '105' : cleanDigits(overrides.digits) || '105',
      provinceLabel: '',
    } : isOrdinaryRoadExit && (overrides.kind === 'urban-expressway' || overrides.kind === 'urban-road') ? {
      kind: overrides.kind,
      digits: cleanDigits(overrides.digits ?? '') || '15',
      provinceLabel: '',
    } : overrides.kind && isExpresswayKind(overrides.kind) ? {
      kind: overrides.kind,
      digits:
              overrides.digits === undefined ? cleanDigits(overrides.code ?? '') || '15' : cleanDigits(overrides.digits) || '15',
      provinceLabel: overrides.provinceLabel,
    } : parseSignCode(overrides.code ?? 'G15')

  return {
    template,
    kind: parsed.kind,
    digits: parsed.digits,
    threeDigitDescend: Boolean(overrides.threeDigitDescend),
    provinceLabel:
      parsed.kind === 'provincial' ? parsed.provinceLabel === undefined ? '粤' : cleanProvinceLabel(parsed.provinceLabel) : '',
    code: buildSignCode(parsed.kind, parsed.digits),
    exitNumber: cleanExitNumber(overrides.exitNumber ?? defaultExitNumber),
    exitDistance: isEntrancePreview || isUrbanEntrancePreview
      ? cleanEntranceDistance(overrides.exitDistance ?? '500')
      : cleanExitDistance(overrides.exitDistance ?? (isDualExitPreview ? '3' : '2')),
    exitName: cleanExitText(
      overrides.exitName ?? defaultExitName,
      '',
      exitNameLimit,
    ),
    exitDestination: cleanExitText(
      overrides.exitDestination ?? (isEntrancePreview ? '深圳' : defaultExitDestination),
      '',
      exitDestinationLimit,
    ),
    leftRoute,
    leftRouteSignId: typeof overrides.leftRouteSignId === 'string' ? overrides.leftRouteSignId : '',
    leftRouteKind: isExpresswayKind(overrides.leftRouteKind)
      || isOrdinaryRoadKind(overrides.leftRouteKind)
      || overrides.leftRouteKind === 'urban-expressway'
      || overrides.leftRouteKind === 'urban-road'
      ? overrides.leftRouteKind
      : routeKindFromCode(leftRoute),
    leftRouteProvinceLabel: cleanRouteProvinceLabel(
      overrides.leftRouteKind,
      overrides.leftRouteProvinceLabel,
      leftRoute,
    ),
    leftRouteThreeDigitDescend: Boolean(overrides.leftRouteThreeDigitDescend),
    rightRoute,
    rightRouteSignId:
      typeof overrides.rightRouteSignId === 'string' ? overrides.rightRouteSignId : '',
    rightRouteKind: isExpresswayKind(overrides.rightRouteKind)
      || isOrdinaryRoadKind(overrides.rightRouteKind)
      || overrides.rightRouteKind === 'urban-expressway'
      || overrides.rightRouteKind === 'urban-road'
      ? overrides.rightRouteKind
      : routeKindFromCode(rightRoute),
    rightRouteProvinceLabel: cleanRouteProvinceLabel(
      overrides.rightRouteKind,
      overrides.rightRouteProvinceLabel,
      rightRoute,
    ),
    rightRouteThreeDigitDescend: Boolean(overrides.rightRouteThreeDigitDescend),
    leftDirection: cleanDirection(
      overrides.leftDirection ?? defaultLeftDirection,
      defaultLeftDirection,
    ),
    rightDirection: cleanDirection(
      overrides.rightDirection ?? defaultRightDirection,
      defaultRightDirection,
    ),
    entranceSecondDirectionEnabled:
      typeof overrides.entranceSecondDirectionEnabled === 'boolean' ? overrides.entranceSecondDirectionEnabled : true,
    entranceCardinalDirection: cleanDirection(overrides.entranceCardinalDirection ?? '南', '南'),
    entranceLeftCardinalDirectionVisible:
      typeof overrides.entranceLeftCardinalDirectionVisible === 'boolean'
        ? overrides.entranceLeftCardinalDirectionVisible
        : true,
    entranceLeftCardinalDirection: cleanDirection(
      overrides.entranceLeftCardinalDirection ?? '西',
      '西',
    ),
    entranceRightCardinalDirectionVisible:
      typeof overrides.entranceRightCardinalDirectionVisible === 'boolean'
        ? overrides.entranceRightCardinalDirectionVisible
        : true,
    entranceRightCardinalDirection: cleanDirection(
      overrides.entranceRightCardinalDirection ?? '东',
      '东',
    ),
    entranceArrowDirection: cleanEntranceArrowDirection(
      overrides.entranceArrowDirection ?? (isStandardExitSign ? 'right' : undefined),
    ),
    entranceDistanceVisible:
      typeof overrides.entranceDistanceVisible === 'boolean'
        ? overrides.entranceDistanceVisible
        : true,
    entranceDistanceUnit: (overrides.entranceDistanceUnit === 'km' ? 'km' : 'm') as Sign['entranceDistanceUnit'],
    urbanRoadName: cleanExitText(
      overrides.urbanRoadName ?? defaultUrbanRoadName,
      '',
      24,
    ),
    urbanRoadStyle: urbanRoadStyles.includes(overrides.urbanRoadStyle as UrbanRoadStyle)
      ? overrides.urbanRoadStyle as UrbanRoadStyle
      : 'bidirectional',
    urbanRoadRouteSignId:
      typeof overrides.urbanRoadRouteSignId === 'string' ? overrides.urbanRoadRouteSignId : '',
    urbanDirection: cleanDirection(
      overrides.urbanDirection ?? defaultUrbanDirection,
      defaultUrbanDirection,
    ),
    urbanDestination: cleanExitText(
      overrides.urbanDestination ?? defaultUrbanDestination,
      '',
      isUrbanExitPreview ? 12 : 10,
    ),
    urbanExitDirectionVisible:
      typeof overrides.urbanExitDirectionVisible === 'boolean'
        ? overrides.urbanExitDirectionVisible
        : true,
    urbanExitDestinationDirectionVisible:
      typeof overrides.urbanExitDestinationDirectionVisible === 'boolean'
        ? overrides.urbanExitDestinationDirectionVisible
        : true,
    urbanExitSecondDestinationVisible:
      typeof overrides.urbanExitSecondDestinationVisible === 'boolean'
        ? overrides.urbanExitSecondDestinationVisible
        : false,
    urbanEntranceDistanceVisible:
      typeof overrides.urbanEntranceDistanceVisible === 'boolean'
        ? overrides.urbanEntranceDistanceVisible
        : true,
    ordinaryExitContentMode,
    ordinaryExitBackground,
    ordinaryExitRoadSignId:
      typeof overrides.ordinaryExitRoadSignId === 'string' ? overrides.ordinaryExitRoadSignId : '',
    popoverColor: isPopoverColor(overrides.popoverColor) ? overrides.popoverColor : 'slate',
    intersectionConfig: normalizeIntersectionConfig(overrides.intersectionConfig),
    crossroadsConfig: normalizeCrossroadsConfig(overrides.crossroadsConfig),
    roundaboutConfig: normalizeRoundaboutConfig(overrides.roundaboutConfig),
    destinationDistanceConfig: normalizeDestinationDistanceConfig(
      overrides.destinationDistanceConfig,
    ),
    freeConfig: normalizeFreeConfig(overrides.freeConfig),
  }
}

export function createSign(overrides: Partial<Sign> = {
}) {
  const sign = normalizeSign(overrides)
  return {
    id: createSignId(),
    ...sign,
    name: signName(sign, overrides.name),
  }
}

export function restoreSign(value: unknown) {
  if (!value || typeof value !== 'object') {return null}

  const raw = value as Partial<Sign>
  const normalized = normalizeSign(raw)
  const rawName = typeof raw.name === 'string' ? raw.name : undefined
  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : createSignId(),
    ...normalized,
    name: signName(normalized, rawName),
  }
}

export function normalizeUpdatedSign(sign: Sign, updates: Partial<Sign>) {
  const next = {
    ...sign,
    ...updates,
  }
  const normalized = normalizeSign(next)
  const hasNameUpdate = Object.prototype.hasOwnProperty.call(updates, 'name')
  return {
    ...next,
    ...normalized,
    name:
      hasNameUpdate || sign.name === '' ? cleanEditableSignName(normalized, next.name) : signName(normalized, next.name),
  }
}

export function defaultOptionName(sign: Pick<Sign, 'template' | 'digits' | 'kind'>) {
  switch (sign.template) {
    case 'expressway':
      return cleanName('沈海高速', sign.digits, sign.kind as ExpresswayKind)
    case 'ordinary-road':
      return '普通道路名称标识'
    case 'urban-road-name':
      return '城市道路名称标识'
    case 'urban-expressway-road-name':
      return '无编号快速路道路标识'
    case 'dual-direction-exit-preview':
      return '双向出口预告'
    case 'urban-expressway-exit-preview':
      return '无编号城市快速路出口预告'
    case 'urban-expressway-entrance-preview':
      return '无编号城市快速路入口预告'
    case 'standard-exit-sign':
      return '国标出口标识'
    case 'ordinary-road-exit':
      return '普通道路出口'
    case 'intersection-guidance':
      return '交叉路口指路标志'
    case 'crossroads-guidance':
      return '十字路口图形式'
    case 'roundabout-guidance':
      return '环岛图形式'
    case 'destination-distance':
      return '地点距离标识'
    case 'free-mode':
      return '自由标志'
    default:
      return FORK_SIGN_NAME[sign.template]
  }
}

function normalizeCrossroadsConfig(value: CrossroadsConfig | undefined): CrossroadsConfig {
  type LegacyFields = {
    topRoad?: string; topDistance?: string; expresswayRoad?: string; expresswayDistance?: string
    leftRoad?: string; rightRoad?: string
    leftSideRoad?: string; rightSideRoad?: string
  }
  const source = value && typeof value === 'object' ? value as CrossroadsConfig & LegacyFields : undefined
  const cleanText = (value: unknown, max = 16) => Array.from(
    typeof value === 'string' ? value.trim() : '',
  ).slice(0, max).join('')
  const cleanDistance = (value: unknown) => cleanText(value, 8).replace(/[^0-9.km米公里]/gi, '')
  const makeItem = (text: string, distance = '', highlighted = false): CrossroadsItem => ({
    id: `crossroads-item-${Math.random().toString(36).slice(2, 8)}`,
    type: 'text',
    text,
    roadSignId: '',
    distance,
    highlighted,
  })
  const legacyDirections: CrossroadsConfig['directions'] = {
    straight: [
      makeItem(cleanText(source?.topRoad ?? '湖山路'), cleanDistance(source?.topDistance ?? '250m')),
      ...source?.expresswayRoad === '' ? [] : [makeItem(
        cleanText(source?.expresswayRoad ?? '宁杭高速'),
        cleanDistance(source?.expresswayDistance ?? '450m'),
        true,
      )],
    ],
    left: [makeItem(cleanText(source?.leftRoad ?? '湖西路'))],
    right: [makeItem(cleanText(source?.rightRoad ?? '湖西路'))],
  }
  const normalizeItems = (direction: keyof CrossroadsConfig['directions']) => {
    const raw = source?.directions?.[direction]
    if (!Array.isArray(raw)) { return legacyDirections[direction] }
    const selected = direction !== 'straight' && !raw.length ? [makeItem('')] : raw
    return selected.slice(0, direction === 'straight' ? 5 : 1).map(item => ({
      id: typeof item?.id === 'string' && item.id ? item.id : makeItem('').id,
      type: item?.type === 'road-sign' ? 'road-sign' as const : 'text' as const,
      text: cleanText(item?.text, 24),
      roadSignId: typeof item?.roadSignId === 'string' ? item.roadSignId : '',
      distance: direction === 'straight' ? cleanDistance(item?.distance) : '',
      highlighted: Boolean(item?.highlighted),
    }))
  }
  const leftSideRoads = source?.leftSideRoads
  const rightSideRoads = source?.rightSideRoads
  const normalizeSideRoads = (roads: unknown, legacyRoad: string): IntersectionItem[] => {
    if (!Array.isArray(roads)) { return [makeItem(legacyRoad)] }
    return roads.slice(0, 3).map(road => typeof road === 'string'
      ? makeItem(cleanText(road))
      : {
        id: typeof road?.id === 'string' && road.id ? road.id : makeItem('').id,
        type: road?.type === 'road-sign' ? 'road-sign' as const : 'text' as const,
        text: cleanText(road?.text),
        roadSignId: typeof road?.roadSignId === 'string' ? road.roadSignId : '',
      })
  }
  return {
    cardinalDirection: source?.cardinalDirection === ''
      ? ''
      : cleanDirection(source?.cardinalDirection ?? '北', '北'),
    centerRoad: cleanText(source?.centerRoad ?? '宏运大道'),
    directions: {
      straight: normalizeItems('straight'),
      left: normalizeItems('left'),
      right: normalizeItems('right'),
    },
    leftSideRoads: normalizeSideRoads(leftSideRoads, source?.leftSideRoad ?? '上高路'),
    leftSideDistance: cleanDistance(source?.leftSideDistance ?? '240m'),
    rightSideRoads: normalizeSideRoads(rightSideRoads, source?.rightSideRoad ?? ''),
    rightSideDistance: cleanDistance(source?.rightSideDistance ?? ''),
  }
}

function normalizeIntersectionConfig(value: IntersectionConfig | undefined): IntersectionConfig {
  const source = value && typeof value === 'object' ? value : undefined
  const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`
  const cleanText = (text: unknown) => Array.from(String(text ?? '').trim()).slice(0, 24).join('')
  const normalizeItems = (items: unknown, fallbackText: string) => {
    if (!Array.isArray(items)) {
      return fallbackText ? [{
        id: makeId('intersection-item'),
        type: 'text' as const,
        text: fallbackText,
        roadSignId: '',
      }] : []
    }
    return items.slice(0, 5).map((item) => {
      const raw = item && typeof item === 'object'
        ? item as Partial<IntersectionConfig['directions']['left'][number]>
        : undefined
      return {
        id: typeof raw?.id === 'string' && raw.id ? raw.id : makeId('intersection-item'),
        type: raw?.type === 'road-sign' ? 'road-sign' as const : 'text' as const,
        text: cleanText(raw?.text),
        roadSignId: typeof raw?.roadSignId === 'string' ? raw.roadSignId : '',
      }
    })
  }

  return {
    centerRoadName: source ? cleanText(source.centerRoadName) : '南京路',
    cardinalDirection: cleanDirection(source?.cardinalDirection ?? '西', '西'),
    directions: {
      left: normalizeItems(source?.directions?.left, '昆山南路'),
      straight: normalizeItems(source?.directions?.straight, '北京路'),
      right: normalizeItems(source?.directions?.right, '四川路'),
    },
  }
}

function normalizeRoundaboutConfig(value: RoundaboutConfig | undefined): RoundaboutConfig {
  const source = value && typeof value === 'object' ? value : undefined
  const directions: RoundaboutDirection[] = [
    'right',
    'right-forward',
    'straight',
    'left-forward',
    'left',
  ]
  const roadClasses: RoundaboutConfig['approachRoadClass'][] = ['major', 'numbered', 'local']
  const fallbackDestinations: Record<RoundaboutDirection, string> = {
    right: '双塔',
    'right-forward': '三河',
    straight: '白涧',
    'left-forward': '',
    left: '唐山',
  }
  const fallbackEnabled: Record<RoundaboutDirection, boolean> = {
    right: true,
    'right-forward': true,
    straight: true,
    'left-forward': false,
    left: true,
  }
  const cleanText = (text: unknown) => Array.from(
    typeof text === 'string' ? text.trim() : '',
  ).slice(0, 12).join('')
  const exits = Object.fromEntries(directions.map((direction) => {
    const rawExit = source?.exits?.[direction]
    return [direction, {
      direction,
      enabled: typeof rawExit?.enabled === 'boolean'
        ? rawExit.enabled
        : fallbackEnabled[direction],
      destination: cleanText(rawExit?.destination ?? fallbackDestinations[direction]),
      roadSignId: typeof rawExit?.roadSignId === 'string' ? rawExit.roadSignId : '',
      roadClass: roadClasses.includes(rawExit?.roadClass as RoundaboutConfig['approachRoadClass'])
        ? rawExit?.roadClass as RoundaboutConfig['approachRoadClass']
        : direction === 'straight' ? 'major' : 'numbered',
    }]
  })) as Record<RoundaboutDirection, RoundaboutConfig['exits'][RoundaboutDirection]>

  return {
    layout: source?.layout === 'wide' ? 'wide' : 'square',
    cardinalDirectionVisible:
      typeof source?.cardinalDirectionVisible === 'boolean'
        ? source.cardinalDirectionVisible
        : true,
    cardinalDirection: cleanDirection(source?.cardinalDirection ?? '北', '北'),
    approachRoadClass: roadClasses.includes(source?.approachRoadClass as RoundaboutConfig['approachRoadClass'])
      ? source?.approachRoadClass as RoundaboutConfig['approachRoadClass']
      : 'major',
    exits,
  }
}

function normalizeDestinationDistanceConfig(
  value: DestinationDistanceConfig | undefined,
): DestinationDistanceConfig {
  const source = value && typeof value === 'object' ? value : undefined
  const backgrounds: DestinationDistanceConfig['background'][] = ['green', 'blue', 'brown']
  const makeId = () => `destination-${Math.random().toString(36).slice(2, 8)}`
  const cleanText = (text: unknown, limit: number) => Array.from(
    typeof text === 'string' ? text.trim() : '',
  ).slice(0, limit).join('')
  const fallbackItems: DestinationDistanceConfig['items'] = [
    {
      id: makeId(),
      type: 'text',
      text: '采育',
      english: '',
      englishEnabled: false,
      roadSignId: '',
      distance: '14',
      unit: 'km',
    },
    {
      id: makeId(),
      type: 'text',
      text: '廊坊',
      english: '',
      englishEnabled: false,
      roadSignId: '',
      distance: '37',
      unit: 'km',
    },
    {
      id: makeId(),
      type: 'text',
      text: '天津',
      english: '',
      englishEnabled: false,
      roadSignId: '',
      distance: '95',
      unit: 'km',
    },
  ]
  const sourceItems = source?.items
  const rawItems = Array.isArray(sourceItems) ? sourceItems : fallbackItems
  const items = rawItems.slice(0, 5).map(item => ({
    id: typeof item?.id === 'string' && item.id ? item.id : makeId(),
    type: item?.type === 'road-sign' ? 'road-sign' as const : 'text' as const,
    text: cleanText(item?.text, 16),
    english: cleanText(item?.english, 32),
    englishEnabled: Boolean(item?.englishEnabled),
    roadSignId: typeof item?.roadSignId === 'string' ? item.roadSignId : '',
    distance: String(item?.distance ?? '')
      .replace(/[^\d.]/g, '')
      .replace(/(\..*)\./g, '$1')
      .slice(0, 6),
    unit: item?.unit === 'm' ? 'm' as const : 'km' as const,
  }))
  return {
    background: source && backgrounds.includes(source.background) ? source.background : 'green',
    items: items.length > 0 ? items : fallbackItems,
  }
}

function normalizeFreeConfig(value: FreeSignConfig | undefined): FreeSignConfig {
  const source = value && typeof value === 'object' ? value : undefined
  const variants: FreeSignConfig['variant'][] = [
    'custom',
    'left-exit-down',
    'left-exit-up',
    'straight',
    'lane-guidance',
    'right-exit-down',
    'right-exit-up',
  ]
  const backgrounds: FreeSignConfig['background'][] = ['green', 'blue', 'brown']
  const directions: FreeSignConfig['rows'][number]['elements'][number]['arrowDirection'][] = [
    'front',
    'down',
    'left-up',
    'left-down',
    'right-up',
    'right-down',
  ]
  const elementTypes: FreeSignConfig['rows'][number]['elements'][number]['type'][] = [
    'text',
    'road-sign',
    'arrow',
  ]
  const cleanText = (text: unknown, limit: number) => Array.from(
    typeof text === 'string' ? text.trim() : '',
  ).slice(0, limit).join('')
  const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`
  const fallbackRows: FreeSignConfig['rows'] = [
    {
      id: makeId('row'),
      showDividerAfter: true,
      showCenterDivider: false,
      elements: [
        {
          id: makeId('element'),
          type: 'text',
          text: '前方出口',
          english: 'EXIT AHEAD',
          englishEnabled: true,
          leadingIcon: false,
          trailingIcon: false,
          roadSignId: '',
          cardinalDirection: '',
          arrowDirection: 'right-up',
        },
      ],
    },
  ]
  const rawRows = source?.rows
  const rows = Array.isArray(rawRows) ? rawRows.slice(0, 5).map((row) => {
    const rawElements = Array.isArray(row?.elements) ? row.elements : []
    const elements = rawElements.slice(0, 4).map(element => ({
      id: typeof element?.id === 'string' && element.id ? element.id : makeId('element'),
      type: elementTypes.includes(element?.type) ? element.type : 'text',
      text: cleanText(element?.text, 16),
      english: cleanText(element?.english, 32),
      englishEnabled: Boolean(element?.englishEnabled),
      leadingIcon: Boolean(element?.leadingIcon),
      trailingIcon: Boolean(element?.trailingIcon),
      roadSignId: typeof element?.roadSignId === 'string' ? element.roadSignId : '',
      cardinalDirection: ['', '东', '南', '西', '北'].includes(element?.cardinalDirection)
        ? element.cardinalDirection
        : '',
      arrowDirection: directions.includes(element?.arrowDirection)
        ? element.arrowDirection
        : 'right-up',
    }))
    return {
      id: typeof row?.id === 'string' && row.id ? row.id : makeId('row'),
      elements: elements.length > 0 ? elements : fallbackRows[0].elements,
      showDividerAfter:
        typeof row?.showDividerAfter === 'boolean' ? row.showDividerAfter : true,
      showCenterDivider: Boolean(row?.showCenterDivider),
    }
  }) : fallbackRows

  return {
    variant: source && variants.includes(source.variant) ? source.variant : 'right-exit-up',
    background: source && backgrounds.includes(source.background) ? source.background : 'green',
    showExitNumberSign:
      typeof source?.showExitNumberSign === 'boolean' ? source.showExitNumberSign : true,
    exitNumber: String(source?.exitNumber ?? '12').replace(/\D/g, '').slice(0, 4),
    exitSuffixEnabled: Boolean(source?.exitSuffixEnabled),
    exitSuffix: String(source?.exitSuffix || 'A')
      .toUpperCase()
      .replace(/[^A-Z-]/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-/, '')
      .slice(0, 3),
    customExitNameEnabled: Boolean(source?.customExitNameEnabled),
    customExitName: cleanText(source?.customExitName || '出口', 8),
    opacity: Math.min(1, Math.max(0.5, Number(source?.opacity) || 1)),
    showExitDistance: Boolean(source?.showExitDistance),
    exitDistance: String(source?.exitDistance ?? '500').replace(/\D/g, '').slice(0, 5),
    exitDistanceUnit: source?.exitDistanceUnit === 'km' ? 'km' : 'm',
    showTopBar: Boolean(source?.showTopBar),
    topBarText: cleanText(source?.topBarText || '出口信息', 12),
    rows: rows.length > 0 ? rows : fallbackRows,
  }
}

function buildSignCode(kind: Sign['kind'], digits: string) {
  if (isOrdinaryRoadKind(kind)) {return `${ORDINARY_ROAD_PREFIX[kind]}${digits}`}
  return `${kind === 'provincial' || kind === 'beijing-tianjin-hebei' ? 'S' : 'G'}${digits}`
}

function parseSignCode(value: string): {
  kind: Sign['kind']
  digits: string
  provinceLabel?: string
} {
  const code = String(value || '')
    .trim()
    .toUpperCase()
  const national = /^G(\d{1,4})$/.exec(code)
  if (national) {return {
    kind: 'national',
    digits: national[1],
  }}

  const provincial = /^S(\d{1,4})$/.exec(code)
  if (provincial) {return {
    kind: 'provincial',
    digits: provincial[1],
    provinceLabel: '粤',
  }}

  const legacyProvincial = /^(.)(S(\d{1,4}))$/u.exec(code)
  if (legacyProvincial) {return {
    kind: 'provincial',
    digits: legacyProvincial[3],
    provinceLabel: legacyProvincial[1],
  }}

  return {
    kind: 'national',
    digits: cleanDigits(code) || '15',
  }
}

const routeKindFromCode = (code: string) =>
  code.startsWith('S') ? 'provincial' : 'national'

function cleanRouteProvinceLabel(
  kind: SignKind | undefined,
  value: string | undefined,
  code: string,
) {
  const routeKind = isExpresswayKind(kind) ? kind : routeKindFromCode(code)
  return routeKind === 'provincial' ? cleanProvinceLabel(value === undefined ? '粤' : value) : ''
}

function signName(sign: Omit<Sign, 'id' | 'name'>, name: string | undefined) {
  switch (sign.template) {
    case 'expressway':
      return cleanName(name ?? defaultOptionName(sign), sign.digits, sign.kind as ExpresswayKind)
    case 'ordinary-road':
      return cleanExitText(name ?? defaultOptionName(sign), defaultOptionName(sign), 10)
    case 'urban-expressway-road-name':
      return cleanExitText(name ?? defaultOptionName(sign), defaultOptionName(sign), 10)
    case 'urban-road-name':
      return cleanExitText(name ?? defaultOptionName(sign), defaultOptionName(sign), 10)
    default:
      return cleanExitText(name ?? defaultOptionName(sign), defaultOptionName(sign), 10)
  }
}

function cleanEditableSignName(sign: Omit<Sign, 'id' | 'name'>, name: string | undefined) {
  switch (sign.template) {
    case 'expressway':
      return cleanName(name ?? '', sign.digits, sign.kind as ExpresswayKind)
    default:
      return Array.from(String(name ?? ''))
        .slice(0, 10)
        .join('')
  }
}

const createSignId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
