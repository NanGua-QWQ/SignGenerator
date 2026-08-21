import {
  restoreSign,
} from '@/lib/sign-model'
import type {
  Sign, SignTemplate,
} from '@/lib/types'

const WORKSPACE_STORAGE_KEY = 'expressway-sign-generator:workspace'
const WORKSPACE_STORAGE_VERSION = 1
const DEFAULT_DIRECTION_GUIDANCE_SIGN = {
  template: 'direction-guidance',
  name: '分向指路标志',
  exitNumber: '360',
  exitDistance: '2',
  exitName: '清远',
  exitDestination: '东莞 深圳',
  leftRoute: 'G78',
  rightRoute: 'G15',
  leftDirection: '东',
  rightDirection: '西',
} satisfies Partial<Sign>

const DEFAULT_ROAD_FORK_PREVIEW_SIGN = {
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
  ...DEFAULT_ROAD_FORK_PREVIEW_SIGN,
  template: 'two-lane-interchange-exit',
  name: '2车道立交枢纽出口',
  exitDestination: '广州',
} satisfies Partial<Sign>

const DEFAULT_DUAL_EXIT_INTERCHANGE_PREVIEW_SIGN = {
  template: 'dual-exit-interchange-preview',
  name: '双出口枢纽式互通立体交叉出口预告',
  exitDistance: '3',
  exitName: '永州',
  exitDestination: '广州',
  leftRoute: 'G55',
  rightRoute: 'G55',
} satisfies Partial<Sign>

const DEFAULT_ENTRANCE_PREVIEW_TWO_DIRECTIONS_SIGN = {
  template: 'entrance-preview-two-directions',
  name: '入口预告-2方向',
  exitDistance: '500',
  exitName: '汕头',
  exitDestination: '深圳',
  rightRoute: 'G15',
  entranceSecondDirectionEnabled: true,
  entranceCardinalDirection: '南',
  entranceArrowDirection: 'front',
} satisfies Partial<Sign>

export interface WorkspaceState {
  signs: Sign[]
  selectedId: string
}

interface SavedWorkspace extends WorkspaceState {
  version: typeof WORKSPACE_STORAGE_VERSION
}

export function getInitialWorkspace() {
  const fallbackSigns = getInitialSigns()
  return normalizeWorkspace(fallbackSigns, fallbackSigns[0].id)
}

export function loadSavedWorkspace() {
  if (typeof window === 'undefined') {return null}
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY)
    if (!raw) {return null}

    const parsed = JSON.parse(raw) as Partial<SavedWorkspace>
    if (parsed.version !== WORKSPACE_STORAGE_VERSION || !Array.isArray(parsed.signs)) {return null}

    const restoredSigns = parsed.signs
      .map(restoreSign)
      .filter((sign): sign is Sign => Boolean(sign))
    if (restoredSigns.length === 0) {return null}

    return normalizeWorkspace(
      restoredSigns,
      typeof parsed.selectedId === 'string' ? parsed.selectedId : restoredSigns[0].id,
    )
  } catch {
    return null
  }
}

export function saveWorkspace(workspace: WorkspaceState) {
  if (typeof window === 'undefined') {return}

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

export function normalizeWorkspace(
  signs: Sign[],
  selectedId: string,
) {
  const selectedSign = signs.find(sign => sign.id === selectedId) ?? signs[0]
  return {
    signs,
    selectedId: selectedSign.id,
  }
}

function getInitialSigns() {
  const template = 'expressway' as SignTemplate
  const code = 'G15'
  const kind = 'national'
  const name = '沈海高速'
  const exitNumber = '360'
  const exitDistance = '2'
  const exitName = '清远'
  const roadForkExitDestination = '东莞 深圳'
  const twoLaneExitDestination = '广州'
  const dualExitDestination = '广州'
  const leftRoute = 'G0421'
  const rightRoute = 'G15'
  const dualLeftRoute = 'G55'
  const dualRightRoute = 'G55'
  const leftDirection = '北'
  const rightDirection = '东'

  switch (template) {
    case 'direction-guidance': {
      return [
        createInitialSign('initial-direction-guidance', {
          template: 'direction-guidance',
          name: '分向指路标志',
          exitNumber,
          exitDistance,
          exitName,
          exitDestination: roadForkExitDestination,
          leftRoute: 'G78',
          rightRoute: 'G15',
          leftDirection: '东',
          rightDirection: '西',
        }),
        createInitialSign('initial-road-fork-preview', {
          template: 'road-fork-preview',
          name: '道路分岔预告',
          exitNumber,
          exitDistance,
          exitName,
          exitDestination: roadForkExitDestination,
          leftRoute,
          rightRoute,
          leftDirection,
          rightDirection,
        }),
        createInitialSign(
          'initial-entrance-preview-two-directions',
          DEFAULT_ENTRANCE_PREVIEW_TWO_DIRECTIONS_SIGN,
        ),
        createInitialSign('initial-two-lane-interchange-exit', {
          template: 'two-lane-interchange-exit',
          name: '2车道立交枢纽出口',
          exitNumber,
          exitDistance,
          exitName,
          exitDestination: twoLaneExitDestination,
          leftRoute,
          rightRoute,
          leftDirection,
          rightDirection,
        }),
        createInitialSign('initial-dual-exit-interchange-preview', {
          template: 'dual-exit-interchange-preview',
          name: '双出口枢纽式互通立体交叉出口预告',
          exitDistance: '3',
          exitName: '永州',
          exitDestination: dualExitDestination,
          leftRoute: dualLeftRoute,
          rightRoute: dualRightRoute,
        }),
        createInitialSign('initial-expressway-primary', {
          code,
          name,
          kind,
        }),
        createInitialSign('initial-expressway-g0421', {
          code: 'G0421',
          name: '许广高速',
        }),
      ]
    }

    case 'two-lane-interchange-exit': {
      return [
        createInitialSign('initial-two-lane-interchange-exit', {
          template: 'two-lane-interchange-exit',
          name: '2车道立交枢纽出口',
          exitNumber,
          exitDistance,
          exitName,
          exitDestination: twoLaneExitDestination,
          leftRoute,
          rightRoute,
          leftDirection,
          rightDirection,
        }),
        createInitialSign('initial-direction-guidance', {
          template: 'direction-guidance',
          name: '分向指路标志',
          exitNumber,
          exitDistance,
          exitName,
          exitDestination: roadForkExitDestination,
          leftRoute: 'G78',
          rightRoute: 'G15',
          leftDirection: '东',
          rightDirection: '西',
        }),
        createInitialSign('initial-road-fork-preview', {
          template: 'road-fork-preview',
          name: '道路分岔预告',
          exitNumber,
          exitDistance,
          exitName,
          exitDestination: roadForkExitDestination,
          leftRoute,
          rightRoute,
          leftDirection,
          rightDirection,
        }),
        createInitialSign(
          'initial-entrance-preview-two-directions',
          DEFAULT_ENTRANCE_PREVIEW_TWO_DIRECTIONS_SIGN,
        ),
        createInitialSign(
          'initial-dual-exit-interchange-preview',
          DEFAULT_DUAL_EXIT_INTERCHANGE_PREVIEW_SIGN,
        ),
        createInitialSign('initial-expressway-primary', {
          code,
          name,
          kind,
        }),
        createInitialSign('initial-expressway-g0421', {
          code: 'G0421',
          name: '许广高速',
        }),
      ]
    }

    case 'dual-exit-interchange-preview': {
      return [
        createInitialSign('initial-dual-exit-interchange-preview', {
          template: 'dual-exit-interchange-preview',
          name: '双出口枢纽式互通立体交叉出口预告',
          exitDistance: '3',
          exitName: '永州',
          exitDestination: dualExitDestination,
          leftRoute: dualLeftRoute,
          rightRoute: dualRightRoute,
        }),
        createInitialSign('initial-direction-guidance', DEFAULT_DIRECTION_GUIDANCE_SIGN),
        createInitialSign('initial-road-fork-preview', DEFAULT_ROAD_FORK_PREVIEW_SIGN),
        createInitialSign('initial-two-lane-interchange-exit', DEFAULT_TWO_LANE_SIGN),
        createInitialSign(
          'initial-entrance-preview-two-directions',
          DEFAULT_ENTRANCE_PREVIEW_TWO_DIRECTIONS_SIGN,
        ),
        createInitialSign('initial-expressway-primary', {
          code,
          name,
          kind,
        }),
        createInitialSign('initial-expressway-g55', {
          code: 'G55',
          name: '二广高速',
        }),
      ]
    }

    case 'entrance-preview-two-directions': {
      return [
        createInitialSign('initial-entrance-preview-two-directions', {
          ...DEFAULT_ENTRANCE_PREVIEW_TWO_DIRECTIONS_SIGN,
          exitDistance: '500',
          exitName: '汕头',
          exitDestination: '深圳',
          rightRoute,
        }),
        createInitialSign('initial-road-fork-preview', {
          template: 'road-fork-preview',
          name: '道路分岔预告',
          exitNumber,
          exitDistance,
          exitName,
          exitDestination: roadForkExitDestination,
          leftRoute,
          rightRoute,
          leftDirection,
          rightDirection,
        }),
        createInitialSign(
          'initial-dual-exit-interchange-preview',
          DEFAULT_DUAL_EXIT_INTERCHANGE_PREVIEW_SIGN,
        ),
        createInitialSign('initial-direction-guidance', DEFAULT_DIRECTION_GUIDANCE_SIGN),
        createInitialSign('initial-expressway-primary', {
          code,
          name,
          kind,
        }),
        createInitialSign('initial-expressway-g0421', {
          code: 'G0421',
          name: '许广高速',
        }),
      ]
    }

    case 'ordinary-road': {
      return [
        createInitialSign('initial-ordinary-road', {
          template: 'ordinary-road',
          kind: 'ordinary-national',
          digits: '105',
          name: '普通道路名称标识',
        }),
        createInitialSign('initial-expressway-primary', {
          code,
          name,
          kind,
        }),
        createInitialSign('initial-expressway-g0421', {
          code: 'G0421',
          name: '许广高速',
        }),
        createInitialSign('initial-direction-guidance', DEFAULT_DIRECTION_GUIDANCE_SIGN),
        createInitialSign('initial-two-lane-interchange-exit', DEFAULT_TWO_LANE_SIGN),
        createInitialSign(
          'initial-dual-exit-interchange-preview',
          DEFAULT_DUAL_EXIT_INTERCHANGE_PREVIEW_SIGN,
        ),
        createInitialSign(
          'initial-entrance-preview-two-directions',
          DEFAULT_ENTRANCE_PREVIEW_TWO_DIRECTIONS_SIGN,
        ),
      ]
    }

    default:
      return [
        createInitialSign('initial-expressway-primary', {
          code,
          name,
          kind,
        }),
        createInitialSign('initial-expressway-g0421', {
          code: 'G0421',
          name: '许广高速',
        }),
        createInitialSign('initial-ordinary-road', {
          template: 'ordinary-road',
          kind: 'ordinary-national',
          digits: '105',
          name: '普通道路名称标识',
        }),
        createInitialSign('initial-direction-guidance', DEFAULT_DIRECTION_GUIDANCE_SIGN),
        createInitialSign('initial-road-fork-preview', DEFAULT_ROAD_FORK_PREVIEW_SIGN),
        createInitialSign('initial-two-lane-interchange-exit', DEFAULT_TWO_LANE_SIGN),
        createInitialSign(
          'initial-dual-exit-interchange-preview',
          DEFAULT_DUAL_EXIT_INTERCHANGE_PREVIEW_SIGN,
        ),
        createInitialSign(
          'initial-entrance-preview-two-directions',
          DEFAULT_ENTRANCE_PREVIEW_TWO_DIRECTIONS_SIGN,
        ),
      ]
  }
}

function createInitialSign(id: string, overrides: Partial<Sign>) {
  const sign = restoreSign({
    id,
    ...overrides,
  })
  if (!sign) {throw new Error(`无法创建默认标志：${id}`)}
  return sign
}
