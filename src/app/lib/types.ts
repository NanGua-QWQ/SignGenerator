export type ExpresswayKind = 'national' | 'provincial' | 'beijing-tianjin-hebei'
export type OrdinaryRoadKind =
  'ordinary-national' | 'ordinary-provincial' | 'ordinary-county' | 'ordinary-township'
export type SignKind = ExpresswayKind | OrdinaryRoadKind | 'urban-expressway' | 'urban-road'
export type SignTemplate =
  | 'expressway'
  | 'urban-road-name'
  | 'urban-expressway-road-name'
  | 'ordinary-road'
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
  | 'intersection-guidance'
  | 'crossroads-guidance'
  | 'roundabout-guidance'
  | 'destination-distance'
  | 'free-mode'
export type PopoverColor = 'slate' | 'amber' | 'emerald' | 'sky' | 'rose' | 'violet'
export type EntranceArrowDirection = 'front' | 'left' | 'right'
export type OrdinaryExitContentMode = 'text' | 'road-code'
export type SignBoardColor = 'blue' | 'green'
export type FreeSignVariant =
  | 'custom'
  | 'left-exit-down'
  | 'left-exit-up'
  | 'straight'
  | 'lane-guidance'
  | 'right-exit-down'
  | 'right-exit-up'
export type FreeSignBackground = 'green' | 'blue' | 'brown'
export type FreeArrowDirection =
  | 'front'
  | 'down'
  | 'left-up'
  | 'left-down'
  | 'right-up'
  | 'right-down'
export type FreeElementType = 'text' | 'road-sign' | 'arrow'
export type FreeCardinalDirection = '' | '东' | '南' | '西' | '北'
export type UrbanRoadStyle =
  | 'plain'
  | 'right-chevron'
  | 'bidirectional'
  | 'straight-text'
  | 'straight-route'
export type IntersectionDirection = 'left' | 'straight' | 'right'
export type IntersectionItemType = 'text' | 'road-sign'
export type RoundaboutDirection = 'right' | 'right-forward' | 'straight' | 'left-forward' | 'left'
export type RoundaboutLayout = 'square' | 'wide'
export type RoundaboutRoadClass = 'major' | 'numbered' | 'local'
export type DestinationDistanceItemType = 'text' | 'road-sign'

export interface IntersectionItem {
  id: string
  type: IntersectionItemType
  text: string
  roadSignId: string
}

export interface IntersectionConfig {
  centerRoadName: string
  cardinalDirection: string
  directions: Record<IntersectionDirection, IntersectionItem[]>
}

export interface CrossroadsConfig {
  cardinalDirection: string
  centerRoad: string
  directions: Record<IntersectionDirection, CrossroadsItem[]>
  leftSideRoads: IntersectionItem[]
  leftSideDistance: string
  rightSideRoads: IntersectionItem[]
  rightSideDistance: string
}

export interface CrossroadsItem extends IntersectionItem {
  distance: string
  highlighted: boolean
}

export interface RoundaboutExit {
  direction: RoundaboutDirection
  enabled: boolean
  destination: string
  roadSignId: string
  roadClass: RoundaboutRoadClass
}

export interface RoundaboutConfig {
  layout: RoundaboutLayout
  cardinalDirectionVisible: boolean
  cardinalDirection: string
  approachRoadClass: RoundaboutRoadClass
  exits: Record<RoundaboutDirection, RoundaboutExit>
}

export interface DestinationDistanceItem {
  id: string
  type: DestinationDistanceItemType
  text: string
  english: string
  englishEnabled: boolean
  roadSignId: string
  distance: string
  unit: 'm' | 'km'
}

export interface DestinationDistanceConfig {
  background: FreeSignBackground
  items: DestinationDistanceItem[]
}

export interface FreeSignElement {
  id: string
  type: FreeElementType
  text: string
  english: string
  englishEnabled: boolean
  leadingIcon: boolean
  trailingIcon: boolean
  roadSignId: string
  cardinalDirection: FreeCardinalDirection
  arrowDirection: FreeArrowDirection
}

export interface FreeSignRow {
  id: string
  elements: FreeSignElement[]
  showDividerAfter: boolean
  showCenterDivider: boolean
}

export interface FreeSignConfig {
  variant: FreeSignVariant
  background: FreeSignBackground
  showExitNumberSign: boolean
  exitNumber: string
  exitSuffixEnabled: boolean
  exitSuffix: string
  customExitNameEnabled: boolean
  customExitName: string
  opacity: number
  showExitDistance: boolean
  exitDistance: string
  exitDistanceUnit: 'm' | 'km'
  showTopBar: boolean
  topBarText: string
  rows: FreeSignRow[]
}

export interface Sign {
  id: string
  template: SignTemplate
  kind: SignKind
  digits: string
  threeDigitDescend: boolean
  provinceLabel: string
  code: string
  name: string
  exitNumber: string
  exitDistance: string
  exitName: string
  exitDestination: string
  leftRoute: string
  leftRouteSignId: string
  leftRouteKind: SignKind
  leftRouteProvinceLabel: string
  leftRouteThreeDigitDescend: boolean
  rightRoute: string
  rightRouteSignId: string
  rightRouteKind: SignKind
  rightRouteProvinceLabel: string
  rightRouteThreeDigitDescend: boolean
  leftDirection: string
  rightDirection: string
  entranceSecondDirectionEnabled: boolean
  entranceCardinalDirection: string
  entranceLeftCardinalDirectionVisible: boolean
  entranceLeftCardinalDirection: string
  entranceRightCardinalDirectionVisible: boolean
  entranceRightCardinalDirection: string
  entranceArrowDirection: EntranceArrowDirection
  entranceDistanceVisible: boolean
  entranceDistanceUnit: 'm' | 'km'
  urbanRoadName: string
  urbanRoadStyle: UrbanRoadStyle
  urbanRoadRouteSignId: string
  urbanDirection: string
  urbanDestination: string
  urbanExitDirectionVisible: boolean
  urbanExitDestinationDirectionVisible: boolean
  urbanExitSecondDestinationVisible: boolean
  urbanEntranceDistanceVisible: boolean
  ordinaryExitContentMode: OrdinaryExitContentMode
  ordinaryExitBackground: SignBoardColor
  ordinaryExitRoadSignId: string
  popoverColor: PopoverColor
  intersectionConfig: IntersectionConfig
  crossroadsConfig: CrossroadsConfig
  roundaboutConfig: RoundaboutConfig
  destinationDistanceConfig: DestinationDistanceConfig
  freeConfig: FreeSignConfig
}
