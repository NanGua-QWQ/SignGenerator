export type SignKind = 'national' | 'provincial' | 'beijing-tianjin-hebei'
export type SignTemplate = 'expressway' | 'road-fork-preview'

export interface Sign {
  id: string
  template: SignTemplate
  kind: SignKind
  digits: string
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
