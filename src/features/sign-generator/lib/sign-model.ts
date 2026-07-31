import type { ExpresswayKind, OrdinaryRoadKind, Sign, SignKind, SignTemplate } from '../types'
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
import { isPopoverColor } from './popover-options'

type SignWorkspaceTab = 'signs' | 'interchange-guidance' | 'entrance-exit-guidance'
type ForkTemplate = Extract<SignTemplate, 'direction-guidance' | 'road-fork-preview' | 'two-lane-interchange-exit' | 'entrance-preview-two-directions'>
type InterchangeTemplate = Extract<SignTemplate, 'direction-guidance' | 'road-fork-preview' | 'two-lane-interchange-exit'>
type EntranceExitTemplate = Extract<SignTemplate, 'entrance-preview-two-directions'>

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
  'entrance-preview-two-directions': '入口预告-2方向',
}

export const INTERCHANGE_ADD_CHOICES: Array<{ value: InterchangeTemplate; label: string }> = [
  { value: 'direction-guidance', label: '分向指路标志' },
  { value: 'road-fork-preview', label: '道路分岔预告' },
  { value: 'two-lane-interchange-exit', label: '2车道立交枢纽出口' },
]

export const ENTRANCE_EXIT_ADD_CHOICES: Array<{ value: EntranceExitTemplate; label: string }> = [
  { value: 'entrance-preview-two-directions', label: '入口预告-2方向' },
]

export const SIGN_ADD_CHOICES: Array<{ value: SignTemplate; label: string }> = [
  { value: 'expressway', label: '高速道路名称标识' },
  { value: 'ordinary-road', label: '普通道路名称标识' },
]

export function isExpresswayKind(value: SignKind | undefined): value is ExpresswayKind {
  return value === 'national' || value === 'provincial' || value === 'beijing-tianjin-hebei'
}

export function isOrdinaryRoadKind(value: SignKind | undefined): value is OrdinaryRoadKind {
  return value === 'ordinary-national' || value === 'ordinary-provincial' || value === 'ordinary-county' || value === 'ordinary-township'
}

export function isRoadSignTemplate(template: SignTemplate): boolean {
  return template === 'expressway' || template === 'ordinary-road'
}

export function isForkTemplate(template: SignTemplate): boolean {
  return template === 'direction-guidance' || template === 'road-fork-preview' || template === 'two-lane-interchange-exit' || template === 'entrance-preview-two-directions'
}

export function isTemplateParam(value: string | null): value is SignTemplate {
  return value === 'expressway' || value === 'ordinary-road' || value === 'direction-guidance' || value === 'road-fork-preview' || value === 'two-lane-interchange-exit' || value === 'entrance-preview-two-directions'
}

export function templateForTab(tab: SignWorkspaceTab): SignTemplate {
  if (tab === 'interchange-guidance') return 'direction-guidance'
  if (tab === 'entrance-exit-guidance') return 'entrance-preview-two-directions'
  return 'expressway'
}

export function visibleSignsForTab(signs: Sign[], tab: SignWorkspaceTab): Sign[] {
  if (tab === 'interchange-guidance') return signs.filter(sign => sign.template === 'direction-guidance' || sign.template === 'road-fork-preview' || sign.template === 'two-lane-interchange-exit')
  if (tab === 'entrance-exit-guidance') return signs.filter(sign => sign.template === 'entrance-preview-two-directions')
  return signs.filter(sign => isRoadSignTemplate(sign.template))
}

export function parseInitialKind(value: string | null): ExpresswayKind | undefined {
  return value === 'national' || value === 'provincial' || value === 'beijing-tianjin-hebei' ? value : undefined
}

export function normalizeSign(overrides: Partial<Sign> = {}): Omit<Sign, 'id' | 'name'> {
  const template = overrides.template ?? 'expressway'
  const isEntrancePreview = template === 'entrance-preview-two-directions'
  const defaultExitDestination = template === 'two-lane-interchange-exit' ? '广州' : '东莞 深圳'
  const leftRoute = cleanRoute(overrides.leftRoute ?? 'G0421', 'G0421')
  const rightRoute = cleanRoute(overrides.rightRoute ?? 'G15', 'G15')
  const parsed = template === 'ordinary-road'
    ? {
        kind: isOrdinaryRoadKind(overrides.kind) ? overrides.kind : 'ordinary-national',
        digits: cleanDigits(overrides.digits ?? overrides.code ?? '') || '105',
        provinceLabel: '',
      }
    : overrides.kind && isExpresswayKind(overrides.kind)
      ? { kind: overrides.kind, digits: cleanDigits(overrides.digits ?? ''), provinceLabel: overrides.provinceLabel }
      : parseSignCode(overrides.code ?? 'G15')

  return {
    template,
    kind: parsed.kind,
    digits: parsed.digits,
    threeDigitDescend: Boolean(overrides.threeDigitDescend),
    provinceLabel: parsed.kind === 'provincial' ? (parsed.provinceLabel === undefined ? '粤' : cleanProvinceLabel(parsed.provinceLabel)) : '',
    code: buildSignCode(parsed.kind, parsed.digits),
    exitNumber: cleanExitNumber(overrides.exitNumber ?? '360'),
    exitDistance: isEntrancePreview ? cleanEntranceDistance(overrides.exitDistance ?? '500') : cleanExitDistance(overrides.exitDistance ?? '2'),
    exitName: cleanExitText(overrides.exitName ?? (isEntrancePreview ? '汕头' : '清远'), '', 6),
    exitDestination: cleanExitText(overrides.exitDestination ?? (isEntrancePreview ? '深圳' : defaultExitDestination), '', 8),
    leftRoute,
    leftRouteSignId: typeof overrides.leftRouteSignId === 'string' ? overrides.leftRouteSignId : '',
    leftRouteKind: isExpresswayKind(overrides.leftRouteKind) ? overrides.leftRouteKind : routeKindFromCode(leftRoute),
    leftRouteProvinceLabel: cleanRouteProvinceLabel(overrides.leftRouteKind, overrides.leftRouteProvinceLabel, leftRoute),
    leftRouteThreeDigitDescend: Boolean(overrides.leftRouteThreeDigitDescend),
    rightRoute,
    rightRouteSignId: typeof overrides.rightRouteSignId === 'string' ? overrides.rightRouteSignId : '',
    rightRouteKind: isExpresswayKind(overrides.rightRouteKind) ? overrides.rightRouteKind : routeKindFromCode(rightRoute),
    rightRouteProvinceLabel: cleanRouteProvinceLabel(overrides.rightRouteKind, overrides.rightRouteProvinceLabel, rightRoute),
    rightRouteThreeDigitDescend: Boolean(overrides.rightRouteThreeDigitDescend),
    leftDirection: cleanDirection(overrides.leftDirection ?? '北', '北'),
    rightDirection: cleanDirection(overrides.rightDirection ?? '东', '东'),
    entranceSecondDirectionEnabled: typeof overrides.entranceSecondDirectionEnabled === 'boolean' ? overrides.entranceSecondDirectionEnabled : true,
    entranceCardinalDirection: cleanDirection(overrides.entranceCardinalDirection ?? '南', '南'),
    entranceArrowDirection: cleanEntranceArrowDirection(overrides.entranceArrowDirection),
    popoverColor: isPopoverColor(overrides.popoverColor) ? overrides.popoverColor : 'slate',
  }
}

export function createSign(overrides: Partial<Sign> = {}): Sign {
  const sign = normalizeSign(overrides)
  return {
    id: createSignId(),
    ...sign,
    name: signName(sign, overrides.name),
  }
}

export function restoreSign(value: unknown): Sign | null {
  if (!value || typeof value !== 'object') return null

  const raw = value as Partial<Sign>
  const normalized = normalizeSign(raw)
  const rawName = typeof raw.name === 'string' ? raw.name : undefined
  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : createSignId(),
    ...normalized,
    name: signName(normalized, rawName),
  }
}

export function normalizeUpdatedSign(sign: Sign, updates: Partial<Sign>): Sign {
  const next = { ...sign, ...updates }
  const normalized = normalizeSign(next)
  const hasNameUpdate = Object.prototype.hasOwnProperty.call(updates, 'name')
  return {
    ...next,
    ...normalized,
    name: hasNameUpdate || sign.name === '' ? cleanEditableSignName(normalized, next.name) : signName(normalized, next.name),
  }
}

export function defaultOptionName(sign: Pick<Sign, 'template' | 'digits'>): string {
  if (sign.template === 'expressway') return cleanName('沈海高速', sign.digits)
  if (sign.template === 'ordinary-road') return '普通道路名称标识'
  return FORK_SIGN_NAME[sign.template]
}

function buildSignCode(kind: Sign['kind'], digits: string): string {
  if (isOrdinaryRoadKind(kind)) return `${ORDINARY_ROAD_PREFIX[kind]}${digits}`
  return `${kind === 'national' ? 'G' : 'S'}${digits}`
}

function parseSignCode(value: string): { kind: Sign['kind']; digits: string; provinceLabel?: string } {
  const code = String(value || '').trim().toUpperCase()
  const national = /^G(\d{1,4})$/.exec(code)
  if (national) return { kind: 'national', digits: national[1] }

  const provincial = /^S(\d{1,4})$/.exec(code)
  if (provincial) return { kind: 'provincial', digits: provincial[1], provinceLabel: '粤' }

  const legacyProvincial = /^(.)(S(\d{1,4}))$/u.exec(code)
  if (legacyProvincial) return { kind: 'provincial', digits: legacyProvincial[3], provinceLabel: legacyProvincial[1] }

  return { kind: 'national', digits: cleanDigits(code) || '15' }
}

function routeKindFromCode(code: string): ExpresswayKind {
  return code.startsWith('S') ? 'provincial' : 'national'
}

function cleanRouteProvinceLabel(kind: Sign['leftRouteKind'] | undefined, value: string | undefined, code: string): string {
  const routeKind = isExpresswayKind(kind) ? kind : routeKindFromCode(code)
  return routeKind === 'provincial' ? cleanProvinceLabel(value === undefined ? '粤' : value) : ''
}

function signName(sign: Omit<Sign, 'id' | 'name'>, name: string | undefined): string {
  if (sign.template === 'expressway') return cleanName(name ?? defaultOptionName(sign), sign.digits)
  if (sign.template === 'ordinary-road') return cleanExitText(name ?? defaultOptionName(sign), defaultOptionName(sign), 10)
  return cleanExitText(name ?? defaultOptionName(sign), defaultOptionName(sign), 10)
}

function cleanEditableSignName(sign: Omit<Sign, 'id' | 'name'>, name: string | undefined): string {
  if (sign.template === 'expressway') return cleanName(name ?? '', sign.digits)
  return Array.from(String(name ?? '')).slice(0, 10).join('')
}

function createSignId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
