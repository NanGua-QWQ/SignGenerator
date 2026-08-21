import {
  atom,
} from 'jotai'
import {
  atomWithStorage,
} from 'jotai/utils'

import {
  createSign,
  isExpresswayKind,
  isForkTemplate,
  normalizeUpdatedSign,
} from '@/lib/sign-model'
import type {
  ExpresswayKind, Sign, SignTemplate,
} from '@/lib/types'

import {
  createSignsStorage,
  getInitialWorkspace,
  normalizeWorkspace,
  SIGNS_STORAGE_KEY,
  SELECTED_ID_STORAGE_KEY,
} from './workspace-storage'

const initialWorkspace = getInitialWorkspace()

export const signsAtom = atomWithStorage<Sign[]>(
  SIGNS_STORAGE_KEY,
  initialWorkspace.signs,
  createSignsStorage(),
)

export const selectedIdAtom = atomWithStorage<string>(
  SELECTED_ID_STORAGE_KEY,
  initialWorkspace.selectedId,
)

export const expresswaySignListAtom = atom(get =>
  get(signsAtom).filter(sign => sign.template === 'expressway'))
export const effectiveSelectedIdAtom = atom(get => {
  const signs = get(signsAtom)
  const selectedId = get(selectedIdAtom)
  return signs.some(sign => sign.id === selectedId)
    ? selectedId
    : signs[0]?.id ?? selectedId
})
export const selectedSignAtom = atom(get => {
  const signs = get(signsAtom)
  const id = get(effectiveSelectedIdAtom)
  return signs.find(sign => sign.id === id) ?? signs[0]
})

export const visibleSignsAtom = atom(get => get(signsAtom))

export const selectSignAtom = atom(
  null,
  (_get, set, id: string) => set(selectedIdAtom, id),
)

export const initializeWorkspaceAtom = atom(
  null,
  (_get, set, state: { signs: Sign[]; selectedId: string }) => {
    const workspace = normalizeWorkspace(state.signs, state.selectedId)
    set(signsAtom, workspace.signs)
    set(selectedIdAtom, workspace.selectedId)
  },
)

export const updateSelectedSignAtom = atom(
  null,
  (get, set, updates: Partial<Sign>) => {
    set(updateSignByIdAtom, {
      id: get(effectiveSelectedIdAtom),
      updates,
    })
  },
)

export const addSignAtom = atom(
  null,
  (get, set, template?: SignTemplate) => {
    const sign = createSign({
      template: template ?? 'expressway',
    })
    set(signsAtom, [...get(signsAtom), sign])
    set(selectedIdAtom, sign.id)
  },
)

export const updateSignByIdAtom = atom(
  null,
  (get, set, params: { id: string; updates: Partial<Sign> }) => {
    set(signsAtom, updateSignAndReferences(get(signsAtom), params.id, params.updates))
  },
)

export const deleteSignAtom = atom(
  null,
  (get, set, id: string) => {
    const current = get(signsAtom)
    if (current.length <= 1) { return }

    const next = current.filter(sign => sign.id !== id)
    if (id === get(effectiveSelectedIdAtom)) {
      set(selectedIdAtom, next[0]?.id ?? '')
    }
    set(signsAtom, next)
  },
)

export const reorderSignAtom = atom(
  null,
  (get, set, params: { id: string; targetId: string; position: 'before' | 'after' }) => {
    const current = get(signsAtom)
    const {
      id, targetId, position,
    } = params
    if (
      id === targetId
      || !current.some(sign => sign.id === id)
      || !current.some(sign => sign.id === targetId)
    ) { return }

    const sourceIndex = current.findIndex(sign => sign.id === id)
    const targetIndex = current.findIndex(sign => sign.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) { return }

    const next = [...current]
    const [movedSign] = next.splice(sourceIndex, 1)
    const adjustedTargetIndex = next.findIndex(sign => sign.id === targetId)
    next.splice(
      position === 'before' ? adjustedTargetIndex : adjustedTargetIndex + 1,
      0,
      movedSign,
    )
    set(signsAtom, next)
    set(selectedIdAtom, id)
  },
)

export function updateSignAndReferences(signs: Sign[], id: string, updates: Partial<Sign>) {
  const previous = signs.find(sign => sign.id === id)
  if (!previous) { return signs }

  const updated = normalizeUpdatedSign(previous, updates)
  const nextSigns = signs.map(sign => sign.id === id ? updated : sign)
  if (
    previous.template !== 'expressway'
    || updated.template !== 'expressway'
    || !isExpresswayKind(updated.kind)
  ) { return nextSigns }

  return nextSigns.map(sign => syncForkRouteReference(sign, previous, updated))
}

function syncForkRouteReference(sign: Sign, previous: Sign, updated: Sign) {
  if (!isForkTemplate(sign.template)) { return sign }

  const updates: Partial<Sign> = {
  }
  if (
    sign.leftRouteSignId === previous.id
    || !sign.leftRouteSignId && sign.leftRoute === previous.code
  ) {
    Object.assign(updates, routeReferenceUpdates('left', updated))
  }
  if (
    sign.rightRouteSignId === previous.id
    || !sign.rightRouteSignId && sign.rightRoute === previous.code
  ) {
    Object.assign(updates, routeReferenceUpdates('right', updated))
  }

  return Object.keys(updates).length > 0 ? normalizeUpdatedSign(sign, updates) : sign
}

function routeReferenceUpdates(side: 'left' | 'right', sign: Sign) {
  const kind = sign.kind as ExpresswayKind
  return side === 'left' ? {
    leftRoute: sign.code,
    leftRouteSignId: sign.id,
    leftRouteKind: kind,
    leftRouteProvinceLabel: sign.provinceLabel,
    leftRouteThreeDigitDescend: sign.threeDigitDescend,
  } : {
    rightRoute: sign.code,
    rightRouteSignId: sign.id,
    rightRouteKind: kind,
    rightRouteProvinceLabel: sign.provinceLabel,
    rightRouteThreeDigitDescend: sign.threeDigitDescend,
  }
}
