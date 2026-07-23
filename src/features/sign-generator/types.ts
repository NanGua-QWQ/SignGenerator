export type SignKind = 'national' | 'provincial'
export type SignTemplate = 'expressway' | 'exit-location'

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
