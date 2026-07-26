import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ExpresswayKind, OrdinaryRoadKind, Sign, SignKind, SignTemplate } from '@/features/sign-generator/types'
import { cleanExitText, cleanExitDistance, cleanDirection, cleanDigits, cleanProvinceLabel, cleanRoute, cleanName, cleanExitNumber } from './features/sign-generator/generators/generator'
import { Header, type WorkspaceTab } from '@/components/layout/Header'
import { SignList } from '@/features/sign-generator/SignList'
import { SignPreview } from '@/features/sign-generator/SignPreview'
import { SignSettings } from '@/features/sign-generator/SignSettings'

function isExpresswayKind(value: SignKind | undefined): value is ExpresswayKind {
  return value === 'national' || value === 'provincial' || value === 'beijing-tianjin-hebei'
}

function isOrdinaryRoadKind(value: SignKind | undefined): value is OrdinaryRoadKind {
  return value === 'ordinary-national' || value === 'ordinary-provincial' || value === 'ordinary-county' || value === 'ordinary-township'
}

function ordinaryRoadPrefix(kind: OrdinaryRoadKind): string {
  return kind === 'ordinary-national' ? 'G' : kind === 'ordinary-provincial' ? 'S' : kind === 'ordinary-county' ? 'X' : 'Y'
}

function buildSignCode(kind: Sign['kind'], digits: string): string {
  if (isOrdinaryRoadKind(kind)) return `${ordinaryRoadPrefix(kind)}${digits}`
  return `${kind === 'national' ? 'G' : 'S'}${digits}`
}

function templateForTab(tab: WorkspaceTab): SignTemplate {
  return tab === 'fork-guidance' ? 'road-fork-preview' : 'expressway'
}

function isRoadSignTemplate(template: SignTemplate): boolean {
  return template === 'expressway' || template === 'ordinary-road'
}

function isForkTemplate(template: SignTemplate): boolean {
  return template === 'road-fork-preview' || template === 'two-lane-interchange-exit'
}

function isTemplateParam(value: string | null): value is SignTemplate {
  return value === 'expressway' || value === 'ordinary-road' || value === 'road-fork-preview' || value === 'two-lane-interchange-exit'
}

function forkSignName(template: SignTemplate): string {
  return template === 'two-lane-interchange-exit' ? '2车道立交枢纽出口' : '道路分岔预告'
}

const FORK_ADD_CHOICES: Array<{ value: SignTemplate; label: string }> = [
  { value: 'road-fork-preview', label: '道路分岔预告' },
  { value: 'two-lane-interchange-exit', label: '2车道立交枢纽出口' },
]

const SIGN_ADD_CHOICES: Array<{ value: SignTemplate; label: string }> = [
  { value: 'expressway', label: '高速标识牌' },
  { value: 'ordinary-road', label: '普通道路标识牌' },
]

const WORKSPACE_STORAGE_KEY = 'expressway-sign-generator:workspace'
const WORKSPACE_STORAGE_VERSION = 1

interface WorkspaceState {
  signs: Sign[]
  activeTab: WorkspaceTab
  selectedId: string
}

interface SavedWorkspace extends WorkspaceState {
  version: typeof WORKSPACE_STORAGE_VERSION
}

function initialTab(): WorkspaceTab {
  const template = new URLSearchParams(window.location.search).get('template')
  return template === 'road-fork-preview' || template === 'two-lane-interchange-exit' || template === 'exit-location' ? 'fork-guidance' : 'signs'
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

function parseInitialKind(value: string | null): ExpresswayKind | undefined {
  return value === 'national' || value === 'provincial' || value === 'beijing-tianjin-hebei' ? value : undefined
}

function normalizeSign(overrides: Partial<Sign> = {}): Omit<Sign, 'id' | 'name'> {
  const template = overrides.template ?? 'expressway'
  const defaultExitDestination = template === 'two-lane-interchange-exit' ? '广州' : '东莞 深圳'
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
    leftRoute: cleanRoute(overrides.leftRoute ?? 'G0421', 'G0421'),
    rightRoute: cleanRoute(overrides.rightRoute ?? 'G15', 'G15'),
    leftDirection: cleanDirection(overrides.leftDirection ?? '北', '北'),
    rightDirection: cleanDirection(overrides.rightDirection ?? '东', '东'),
  }
}

function createSign(overrides: Partial<Sign> = {}): Sign {
  const sign = normalizeSign(overrides)
  return {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    ...sign,
    name: sign.template === 'expressway'
      ? cleanName(overrides.name ?? '沈海高速', sign.digits)
      : sign.template === 'ordinary-road'
        ? cleanExitText(overrides.name ?? '普通道路标识牌', '普通道路标识牌', 10)
      : cleanExitText(overrides.name ?? forkSignName(sign.template), forkSignName(sign.template), 10),
  }
}

function visibleSignsForTab(signs: Sign[], tab: WorkspaceTab): Sign[] {
  return tab === 'fork-guidance' ? signs.filter(sign => isForkTemplate(sign.template)) : signs.filter(sign => isRoadSignTemplate(sign.template))
}

function isWorkspaceTab(value: unknown): value is WorkspaceTab {
  return value === 'signs' || value === 'fork-guidance'
}

function restoreSign(value: unknown): Sign | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<Sign>
  const normalized = normalizeSign(raw)
  const rawName = typeof raw.name === 'string' ? raw.name : undefined
  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    ...normalized,
    name: normalized.template === 'expressway'
      ? cleanName(rawName ?? '沈海高速', normalized.digits)
      : normalized.template === 'ordinary-road'
        ? cleanExitText(rawName ?? '普通道路标识牌', '普通道路标识牌', 10)
      : cleanExitText(rawName ?? forkSignName(normalized.template), forkSignName(normalized.template), 10),
  }
}

function normalizeWorkspace(signs: Sign[], activeTab: WorkspaceTab, selectedId: string): WorkspaceState {
  const usableTab = visibleSignsForTab(signs, activeTab).length > 0 ? activeTab : 'signs'
  const visibleSigns = visibleSignsForTab(signs, usableTab)
  const selectedSign = visibleSigns.find(sign => sign.id === selectedId) ?? visibleSigns[0] ?? signs[0]
  return { signs, activeTab: usableTab, selectedId: selectedSign.id }
}

function createInitialSigns(): Sign[] {
  const params = new URLSearchParams(window.location.search)
  const requestedTemplate = params.get('template')
  const template: SignTemplate = isTemplateParam(requestedTemplate) ? requestedTemplate : requestedTemplate === 'exit-location' ? 'road-fork-preview' : 'expressway'
  const code = params.get('code') ?? 'G15'
  const kind = parseInitialKind(params.get('kind'))
  const name = params.get('name') ?? '沈海高速'
  const exitNumber = params.get('exitNumber') ?? '360'
  const exitDistance = params.get('exitDistance') ?? '2'
  const exitName = params.get('exitName') ?? '清远'
  const exitDestinationParam = params.get('exitDestination')
  const roadForkExitDestination = exitDestinationParam ?? '东莞 深圳'
  const twoLaneExitDestination = exitDestinationParam ?? '广州'
  const leftRoute = params.get('leftRoute') ?? 'G0421'
  const rightRoute = params.get('rightRoute') ?? 'G15'
  const leftDirection = params.get('leftDirection') ?? '北'
  const rightDirection = params.get('rightDirection') ?? '东'
  return template === 'road-fork-preview'
    ? [
        createSign({ template: 'road-fork-preview', name: '道路分岔预告', exitNumber, exitDistance, exitName, exitDestination: roadForkExitDestination, leftRoute, rightRoute, leftDirection, rightDirection }),
        createSign({ template: 'two-lane-interchange-exit', name: '2车道立交枢纽出口', exitNumber, exitDistance, exitName, exitDestination: twoLaneExitDestination, leftRoute, rightRoute, leftDirection, rightDirection }),
        createSign({ code, name, kind }),
        createSign({ code: 'G0421', name: '许广高速' }),
      ]
    : template === 'two-lane-interchange-exit'
      ? [
        createSign({ template: 'two-lane-interchange-exit', name: '2车道立交枢纽出口', exitNumber, exitDistance, exitName, exitDestination: twoLaneExitDestination, leftRoute, rightRoute, leftDirection, rightDirection }),
        createSign({ template: 'road-fork-preview', name: '道路分岔预告', exitNumber, exitDistance, exitName, exitDestination: roadForkExitDestination, leftRoute, rightRoute, leftDirection, rightDirection }),
        createSign({ code, name, kind }),
        createSign({ code: 'G0421', name: '许广高速' }),
      ]
    : template === 'ordinary-road'
      ? [
        createSign({ template: 'ordinary-road', kind: 'ordinary-national', digits: '105', name: '普通道路标识牌' }),
        createSign({ code, name, kind }),
        createSign({ code: 'G0421', name: '许广高速' }),
        createSign({ template: 'road-fork-preview', name: '道路分岔预告', exitNumber: '360', exitDistance: '2', exitName: '清远', exitDestination: '东莞 深圳', leftRoute: 'G0421', rightRoute: 'G15', leftDirection: '北', rightDirection: '东' }),
        createSign({ template: 'two-lane-interchange-exit', name: '2车道立交枢纽出口', exitNumber: '360', exitDistance: '2', exitName: '清远', exitDestination: '广州', leftRoute: 'G0421', rightRoute: 'G15', leftDirection: '北', rightDirection: '东' }),
      ]
    : [
        createSign({ code, name, kind }),
        createSign({ code: 'G0421', name: '许广高速' }),
        createSign({ template: 'ordinary-road', kind: 'ordinary-national', digits: '105', name: '普通道路标识牌' }),
        createSign({ template: 'road-fork-preview', name: '道路分岔预告', exitNumber: '360', exitDistance: '2', exitName: '清远', exitDestination: '东莞 深圳', leftRoute: 'G0421', rightRoute: 'G15', leftDirection: '北', rightDirection: '东' }),
        createSign({ template: 'two-lane-interchange-exit', name: '2车道立交枢纽出口', exitNumber: '360', exitDistance: '2', exitName: '清远', exitDestination: '广州', leftRoute: 'G0421', rightRoute: 'G15', leftDirection: '北', rightDirection: '东' }),
      ]
}

function createInitialWorkspace(): WorkspaceState {
  const fallbackSigns = createInitialSigns()
  const fallbackWorkspace = normalizeWorkspace(fallbackSigns, initialTab(), fallbackSigns[0].id)
  if (typeof window === 'undefined') return fallbackWorkspace

  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY)
    if (!raw) return fallbackWorkspace
    const parsed = JSON.parse(raw) as Partial<SavedWorkspace>
    if (parsed.version !== WORKSPACE_STORAGE_VERSION || !Array.isArray(parsed.signs)) return fallbackWorkspace
    const restoredSigns = parsed.signs.map(restoreSign).filter((sign): sign is Sign => Boolean(sign))
    if (restoredSigns.length === 0) return fallbackWorkspace
    return normalizeWorkspace(
      restoredSigns,
      isWorkspaceTab(parsed.activeTab) ? parsed.activeTab : fallbackWorkspace.activeTab,
      typeof parsed.selectedId === 'string' ? parsed.selectedId : restoredSigns[0].id,
    )
  } catch {
    return fallbackWorkspace
  }
}

export default function App() {
  const [initialWorkspace] = useState<WorkspaceState>(createInitialWorkspace)
  const [signs, setSigns] = useState<Sign[]>(initialWorkspace.signs)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialWorkspace.activeTab)
  const [selectedId, setSelectedId] = useState<string>(initialWorkspace.selectedId)
  const activeTemplate = templateForTab(activeTab)
  const visibleSigns = useMemo(
    () => activeTab === 'fork-guidance' ? signs.filter(sign => isForkTemplate(sign.template)) : signs.filter(sign => isRoadSignTemplate(sign.template)),
    [activeTab, signs],
  )
  const expresswaySignList = useMemo(() => signs.filter(sign => sign.template === 'expressway'), [signs])
  const selectedSign = useMemo<Sign>(
    () => visibleSigns.find(sign => sign.id === selectedId) ?? visibleSigns[0],
    [selectedId, visibleSigns],
  )

  useEffect(() => {
    try {
      const workspace: SavedWorkspace = {
        version: WORKSPACE_STORAGE_VERSION,
        signs,
        activeTab,
        selectedId,
      }
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace))
    } catch {
      // localStorage may be unavailable in private or restricted browser contexts.
    }
  }, [activeTab, selectedId, signs])

  const addSign = useCallback((template?: SignTemplate) => {
    const sign = createSign({ template: template ?? activeTemplate })
    setSigns(current => [...current, sign])
    setSelectedId(sign.id)
  }, [activeTemplate])

  const changeTab = useCallback((tab: WorkspaceTab) => {
    const firstSign = signs.find(sign => tab === 'fork-guidance' ? isForkTemplate(sign.template) : isRoadSignTemplate(sign.template))
    if (!firstSign) return
    setActiveTab(tab)
    setSelectedId(current => signs.some(sign => sign.id === current && (tab === 'fork-guidance' ? isForkTemplate(sign.template) : isRoadSignTemplate(sign.template))) ? current : firstSign.id)
  }, [signs])

  const updateSign = useCallback((updates: Partial<Sign>) => {
    setSigns(current => current.map(sign => {
      if (sign.id !== selectedId) return sign
      const next = { ...sign, ...updates }
      const normalized = normalizeSign(next)
      return {
        ...next,
        ...normalized,
        name: normalized.template === 'expressway' ? cleanName(next.name, normalized.digits) : normalized.template === 'ordinary-road' ? cleanExitText(next.name, '普通道路标识牌', 10) : cleanExitText(next.name, forkSignName(normalized.template), 10),
      }
    }))
  }, [selectedId])

  const deleteSign = useCallback((id: string) => {
    setSigns(current => {
      const target = current.find(sign => sign.id === id)
      if (!target || current.filter(sign => sign.template === target.template).length === 1) return current
      const next = current.filter(sign => sign.id !== id)
      if (id === selectedId) setSelectedId(next.find(sign => sign.template === target.template)?.id ?? next[0].id)
      return next
    })
  }, [selectedId])

  return (
    <div className="flex h-dvh flex-col bg-background">
      <Header activeTab={activeTab} onTabChange={changeTab} />
      <main className="grid min-h-0 flex-1 grid-cols-[14rem_minmax(0,1fr)_20rem] max-lg:grid-cols-[12rem_minmax(0,1fr)] max-md:grid-cols-1 max-md:grid-rows-[auto_minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
        <div>
          <SignList title={activeTab === 'fork-guidance' ? '分叉指引' : '标志列表'} signs={visibleSigns} selectedId={selectedId} onSelect={setSelectedId} onAdd={addSign} addChoices={activeTab === 'fork-guidance' ? FORK_ADD_CHOICES : SIGN_ADD_CHOICES} onDelete={deleteSign} />
        </div>
        <SignPreview sign={selectedSign} />
        <div className="max-lg:col-span-2 max-lg:max-h-72 max-md:col-span-1 max-md:max-h-none">
          <SignSettings sign={selectedSign} onChange={updateSign} expresswaySignList={expresswaySignList} />
        </div>
      </main>
    </div>
  )
}
