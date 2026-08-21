import {
  atom,
} from 'jotai'

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
  getInitialWorkspace,
} from './workspace-storage'

const initial = getInitialWorkspace()
export const signsAtom = atom<Sign[]>(initial.signs)
export const selectedIdAtom = atom<string>(initial.selectedId)
export const readyToSaveAtom = atom(false)

export const expresswaySignListAtom = atom(get =>
  get(signsAtom).filter(sign => sign.template === 'expressway'))
export const effectiveSelectedIdAtom = atom((get) => {
  const signs = get(signsAtom)
  const selectedId = get(selectedIdAtom)
  return signs.some(sign => sign.id === selectedId)
    ? selectedId
    : signs[0]?.id ?? selectedId
})
export const selectedSignAtom = atom((get) => {
  const signs = get(signsAtom)
  const id = get(effectiveSelectedIdAtom)
  return signs.find(sign => sign.id === id) ?? signs[0]
})

export const addSignAtom = atom(
  null,
  (_get, set, template?: SignTemplate) => {
    const sign = createSign({
      template: template ?? 'expressway',
    })
    set(signsAtom, current => [...current, sign])
    set(selectedIdAtom, sign.id)
  },
)

export const updateSignByIdAtom = atom(
  null,
  (_get, set, params: { id: string; updates: Partial<Sign> }) => {
    set(signsAtom, current => updateSignAndReferences(current, params.id, params.updates))
  },
)

export const deleteSignAtom = atom(
  null,
  (get, set, id: string) => {
    set(signsAtom, (current) => {
      if (current.length <= 1) { return current }

      const next = current.filter(sign => sign.id !== id)
      if (id === get(effectiveSelectedIdAtom)) {
        set(selectedIdAtom, next[0]?.id ?? '')
      }
      return next
    })
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
