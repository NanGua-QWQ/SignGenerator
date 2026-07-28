import type { ExpresswayKind, OrdinaryRoadKind, Sign, SignKind, SignTemplate } from '../types'
import {
  cleanDigits,
  cleanDirection,
  cleanExitDistance,
  cleanExitNumber,
  cleanExitText,
  cleanName,
  cleanProvinceLabel,
  cleanRoute,
} from '../generators/generator'
import { isPopoverColor } from './popover-options'

type SignWorkspaceTab = 'signs' | 'fork-guidance'
type ForkTemplate = Extract<SignTemplate, 'direction-guidance' | 'road-fork-preview' | 'two-lane-interchange-exit'>

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
}

export const FORK_ADD_CHOICES: Array<{ value: SignTemplate; label: string }> = [
  { value: 'direction-guidance', label: '分向指路标志' },
  { value: 'road-fork-preview', label: '道路分岔预告' },
  { value: 'two-lane-interchange-exit', label: '2车道立交枢纽出口' },
]

export const SIGN_ADD_CHOICES: Array<{ value: SignTemplate; label: string }> = [
  { value: 'expressway', label: '高速标识牌' },
  { value: 'ordinary-road', label: '普通道路标识牌' },
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
  return template === 'direction-guidance' || template === 'road-fork-preview' || template === 'two-lane-interchange-exit'
}

export function isTemplateParam(value: string | null): value is SignTemplate {
  return value === 'expressway' || value === 'ordinary-road' || value === 'direction-guidance' || value === 'road-fork-preview' || value === 'two-lane-interchange-exit'
}

export function templateForTab(tab: SignWorkspaceTab): SignTemplate {
  return tab === 'fork-guidance' ? 'direction-guidance' : 'expressway'
}

export function visibleSignsForTab(signs: Sign[], tab: SignWorkspaceTab): Sign[] {
  return tab === 'fork-guidance' ? signs.filter(sign => isForkTemplate(sign.template)) : signs.filter(sign => isRoadSignTemplate(sign.template))
}

export function parseInitialKind(value: string | null): ExpresswayKind | undefined {
  return value === 'national' || value === 'provincial' || value === 'beijing-tianjin-hebei' ? value : undefined
}

export function normalizeSign(overrides: Partial<Sign> = {}): Omit<Sign, 'id' | 'name'> {
  const template = overrides.template ?? 'expressway'
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
    exitDistance: cleanExitDistance(overrides.exitDistance ?? '2'),
    exitName: cleanExitText(overrides.exitName ?? '清远', '', 6),
    exitDestination: cleanExitText(overrides.exitDestination ?? defaultExitDestination, '', 8),
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
  return {
    ...next,
    ...normalized,
    name: signName(normalized, next.name),
  }
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
  if (sign.template === 'expressway') return cleanName(name ?? '沈海高速', sign.digits)
  if (sign.template === 'ordinary-road') return cleanExitText(name ?? '普通道路标识牌', '普通道路标识牌', 10)
  return cleanExitText(name ?? FORK_SIGN_NAME[sign.template], FORK_SIGN_NAME[sign.template], 10)
}

function createSignId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
