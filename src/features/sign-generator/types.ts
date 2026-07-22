export type SignKind = 'national' | 'provincial'

export interface Sign {
  id: string
  kind: SignKind
  digits: string
  provinceLabel: string
  code: string
  name: string
}
