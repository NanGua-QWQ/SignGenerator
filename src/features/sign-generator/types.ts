export type ExpresswayKind = 'national' | 'provincial' | 'beijing-tianjin-hebei'
export type OrdinaryRoadKind = 'ordinary-national' | 'ordinary-provincial' | 'ordinary-county' | 'ordinary-township'
export type SignKind = ExpresswayKind | OrdinaryRoadKind
export type SignTemplate = 'expressway' | 'ordinary-road' | 'road-fork-preview' | 'two-lane-interchange-exit'

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
  rightRoute: string
  leftDirection: string
  rightDirection: string
}
