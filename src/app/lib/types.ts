export type ExpresswayKind = 'national' | 'provincial' | 'beijing-tianjin-hebei'
export type OrdinaryRoadKind =
  'ordinary-national' | 'ordinary-provincial' | 'ordinary-county' | 'ordinary-township'
export type SignKind = ExpresswayKind | OrdinaryRoadKind
export type SignTemplate =
  | 'expressway'
  | 'ordinary-road'
  | 'direction-guidance'
  | 'road-fork-preview'
  | 'two-lane-interchange-exit'
  | 'dual-exit-interchange-preview'
  | 'entrance-preview-two-directions'
export type PopoverColor = 'slate' | 'amber' | 'emerald' | 'sky' | 'rose' | 'violet'
export type EntranceArrowDirection = 'front' | 'left' | 'right'

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
  leftRouteKind: ExpresswayKind
  leftRouteProvinceLabel: string
  leftRouteThreeDigitDescend: boolean
  rightRoute: string
  rightRouteSignId: string
  rightRouteKind: ExpresswayKind
  rightRouteProvinceLabel: string
  rightRouteThreeDigitDescend: boolean
  leftDirection: string
  rightDirection: string
  entranceSecondDirectionEnabled: boolean
  entranceCardinalDirection: string
  entranceArrowDirection: EntranceArrowDirection
  popoverColor: PopoverColor
}
