import type {
  ExpresswayKind,
} from './types'

export const nameLimitForDigits = (digits: string) =>
  digits.length === 4 ? 6 : 4

export const expresswayNameLimit = (kind: ExpresswayKind, digits: string) =>
  kind === 'provincial' || kind === 'beijing-tianjin-hebei'
    ? 6
    : nameLimitForDigits(digits)

export const cleanExpresswayName = (
  value: string,
  digits: string,
  kind: ExpresswayKind = 'national',
) =>
  Array.from(String(value || ''))
    .slice(0, expresswayNameLimit(kind, digits))
    .join('')
