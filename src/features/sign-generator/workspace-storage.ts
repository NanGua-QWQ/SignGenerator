import type { WorkspaceTab } from '@/components/layout/Header'
import type { Sign, SignTemplate } from './types'
import {
  createSign,
  isTemplateParam,
  parseInitialKind,
  restoreSign,
  visibleSignsForTab,
} from './sign-model'

const WORKSPACE_STORAGE_KEY = 'expressway-sign-generator:workspace'
const WORKSPACE_STORAGE_VERSION = 1
const DEFAULT_ROAD_FORK_SIGN = {
  template: 'road-fork-preview',
  name: '道路分岔预告',
  exitNumber: '360',
  exitDistance: '2',
  exitName: '清远',
  exitDestination: '东莞 深圳',
  leftRoute: 'G0421',
  rightRoute: 'G15',
  leftDirection: '北',
  rightDirection: '东',
} satisfies Partial<Sign>

const DEFAULT_TWO_LANE_SIGN = {
  ...DEFAULT_ROAD_FORK_SIGN,
  template: 'two-lane-interchange-exit',
  name: '2车道立交枢纽出口',
  exitDestination: '广州',
} satisfies Partial<Sign>

export interface WorkspaceState {
  signs: Sign[]
  activeTab: WorkspaceTab
  selectedId: string
}

interface SavedWorkspace extends WorkspaceState {
  version: typeof WORKSPACE_STORAGE_VERSION
}

export function createInitialWorkspace(): WorkspaceState {
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

export function saveWorkspace(workspace: WorkspaceState): void {
  try {
    const savedWorkspace: SavedWorkspace = {
      version: WORKSPACE_STORAGE_VERSION,
      ...workspace,
    }
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(savedWorkspace))
  } catch {
    // localStorage may be unavailable in private or restricted browser contexts.
  }
}

export function normalizeWorkspace(signs: Sign[], activeTab: WorkspaceTab, selectedId: string): WorkspaceState {
  const usableTab = visibleSignsForTab(signs, activeTab).length > 0 ? activeTab : 'signs'
  const visibleSigns = visibleSignsForTab(signs, usableTab)
  const selectedSign = visibleSigns.find(sign => sign.id === selectedId) ?? visibleSigns[0] ?? signs[0]
  return { signs, activeTab: usableTab, selectedId: selectedSign.id }
}

function initialTab(): WorkspaceTab {
  const template = new URLSearchParams(window.location.search).get('template')
  return template === 'road-fork-preview' || template === 'two-lane-interchange-exit' || template === 'exit-location' ? 'fork-guidance' : 'signs'
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

  if (template === 'road-fork-preview') {
    return [
      createSign({ template: 'road-fork-preview', name: '道路分岔预告', exitNumber, exitDistance, exitName, exitDestination: roadForkExitDestination, leftRoute, rightRoute, leftDirection, rightDirection }),
      createSign({ template: 'two-lane-interchange-exit', name: '2车道立交枢纽出口', exitNumber, exitDistance, exitName, exitDestination: twoLaneExitDestination, leftRoute, rightRoute, leftDirection, rightDirection }),
      createSign({ code, name, kind }),
      createSign({ code: 'G0421', name: '许广高速' }),
    ]
  }

  if (template === 'two-lane-interchange-exit') {
    return [
      createSign({ template: 'two-lane-interchange-exit', name: '2车道立交枢纽出口', exitNumber, exitDistance, exitName, exitDestination: twoLaneExitDestination, leftRoute, rightRoute, leftDirection, rightDirection }),
      createSign({ template: 'road-fork-preview', name: '道路分岔预告', exitNumber, exitDistance, exitName, exitDestination: roadForkExitDestination, leftRoute, rightRoute, leftDirection, rightDirection }),
      createSign({ code, name, kind }),
      createSign({ code: 'G0421', name: '许广高速' }),
    ]
  }

  if (template === 'ordinary-road') {
    return [
      createSign({ template: 'ordinary-road', kind: 'ordinary-national', digits: '105', name: '普通道路标识牌' }),
      createSign({ code, name, kind }),
      createSign({ code: 'G0421', name: '许广高速' }),
      createSign(DEFAULT_ROAD_FORK_SIGN),
      createSign(DEFAULT_TWO_LANE_SIGN),
    ]
  }

  return [
    createSign({ code, name, kind }),
    createSign({ code: 'G0421', name: '许广高速' }),
    createSign({ template: 'ordinary-road', kind: 'ordinary-national', digits: '105', name: '普通道路标识牌' }),
    createSign(DEFAULT_ROAD_FORK_SIGN),
    createSign(DEFAULT_TWO_LANE_SIGN),
  ]
}

function isWorkspaceTab(value: unknown): value is WorkspaceTab {
  return value === 'signs' || value === 'fork-guidance'
}
