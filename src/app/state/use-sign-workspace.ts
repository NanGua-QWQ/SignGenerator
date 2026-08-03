import {
  useCallback, useEffect, useMemo, useState,
} from 'react'

import type {
  WorkspaceTab,
} from '@/[tab]/Header'

import {
  useCreateInitialWorkspace,
  loadSavedWorkspace,
  saveWorkspace,
  type WorkspaceState,
} from './workspace-storage'
import {
  ENTRANCE_EXIT_ADD_CHOICES,
  INTERCHANGE_ADD_CHOICES,
  SIGN_ADD_CHOICES,
  createSign,
  isExpresswayKind,
  isForkTemplate,
  normalizeUpdatedSign,
  templateForTab,
  visibleSignsForTab,
} from '@/lib/sign-model'

import type {
  ExpresswayKind, Sign, SignTemplate,
} from '@/lib/types'

export function useSignWorkspace(tab: WorkspaceTab) {
  const [initialWorkspace] = useState<WorkspaceState>(useCreateInitialWorkspace())
  const [signs, setSigns] = useState<Sign[]>(initialWorkspace.signs)
  const [selectedId, setSelectedId] = useState<string>(initialWorkspace.selectedId)
  const [readyToSave, setReadyToSave] = useState(false)
  const activeTemplate = templateForTab(tab)
  const visibleSigns = useMemo(() => visibleSignsForTab(signs, tab), [tab, signs])
  const expresswaySignList = useMemo(
    () => signs.filter(sign => sign.template === 'expressway'),
    [signs],
  )
  const effectiveSelectedId = useMemo(
    () => visibleSigns.some(sign => sign.id === selectedId)
      ? selectedId
      : visibleSigns[0]?.id ?? selectedId,
    [selectedId, visibleSigns],
  )
  const selectedSign = useMemo<Sign>(
    () => visibleSigns.find(sign => sign.id === effectiveSelectedId) ?? visibleSigns[0],
    [effectiveSelectedId, visibleSigns],
  )

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const savedWorkspace = loadSavedWorkspace()
    if (savedWorkspace) {
      setSigns(savedWorkspace.signs)
      setSelectedId(savedWorkspace.selectedId)
    }
    setReadyToSave(true)
  }, [initialWorkspace])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!readyToSave) {return}
    saveWorkspace({
      signs,
      selectedId,
    })
  }, [readyToSave, selectedId, signs])

  const addSign = useCallback(
    (template?: SignTemplate) => {
      const sign = createSign({
        template: template ?? activeTemplate,
      })
      setSigns(current => [...current, sign])
      setSelectedId(sign.id)
    },
    [activeTemplate],
  )

  const updateSign = useCallback(
    (updates: Partial<Sign>) => {
      setSigns(current => updateSignAndReferences(current, effectiveSelectedId, updates))
    },
    [effectiveSelectedId],
  )

  const updateSignById = useCallback((id: string, updates: Partial<Sign>) => {
    setSigns(current => updateSignAndReferences(current, id, updates))
  }, [])

  const deleteSign = useCallback(
    (id: string) => {
      setSigns((current) => {
        const target = current.find(sign => sign.id === id)
        if (
          !target
          || current.filter(sign => sign.template === target.template).length === 1
        ) {return current}

        const next = current.filter(sign => sign.id !== id)
        if (id === effectiveSelectedId) {
          setSelectedId(
            next.find(sign => sign.template === target.template)?.id ?? next[0].id,
          )
        }
        return next
      })
    },
    [effectiveSelectedId],
  )

  const reorderSign = useCallback(
    (id: string, targetId: string, position: 'before' | 'after') => {
      setSigns((current) => {
        const signsForTab = visibleSignsForTab(current, tab)
        if (
          id === targetId
          || !signsForTab.some(sign => sign.id === id)
          || !signsForTab.some(sign => sign.id === targetId)
        ) {return current}

        const sourceIndex = current.findIndex(sign => sign.id === id)
        const targetIndex = current.findIndex(sign => sign.id === targetId)
        if (sourceIndex < 0 || targetIndex < 0) {return current}

        const next = [...current]
        const [movedSign] = next.splice(sourceIndex, 1)
        const adjustedTargetIndex = next.findIndex(sign => sign.id === targetId)
        next.splice(
          position === 'before' ? adjustedTargetIndex : adjustedTargetIndex + 1,
          0,
          movedSign,
        )
        return next
      })
      setSelectedId(id)
    },
    [tab],
  )

  const addChoices
    = tab === 'interchange-guidance' ? INTERCHANGE_ADD_CHOICES : tab === 'entrance-exit-guidance' ? ENTRANCE_EXIT_ADD_CHOICES : SIGN_ADD_CHOICES
  const signListTitle
    = tab === 'interchange-guidance' ? '立交枢纽指引' : tab === 'entrance-exit-guidance' ? '出入口指引' : '道路名称标识'

  return {
    addChoices,
    expresswaySignList,
    selectedId: effectiveSelectedId,
    selectedSign,
    signListTitle,
    visibleSigns,
    addSign,
    deleteSign,
    reorderSign,
    selectSign: setSelectedId,
    updateSign,
    updateSignById,
  }
}

function updateSignAndReferences(signs: Sign[], id: string, updates: Partial<Sign>): Sign[] {
  const previous = signs.find(sign => sign.id === id)
  if (!previous) {return signs}

  const updated = normalizeUpdatedSign(previous, updates)
  const nextSigns = signs.map(sign => sign.id === id ? updated : sign)
  if (
    previous.template !== 'expressway'
    || updated.template !== 'expressway'
    || !isExpresswayKind(updated.kind)
  ) {return nextSigns}

  return nextSigns.map(sign => syncForkRouteReference(sign, previous, updated))
}

function syncForkRouteReference(sign: Sign, previous: Sign, updated: Sign): Sign {
  if (!isForkTemplate(sign.template)) {return sign}

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

function routeReferenceUpdates(side: 'left' | 'right', sign: Sign): Partial<Sign> {
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
