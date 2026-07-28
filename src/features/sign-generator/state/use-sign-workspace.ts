import { useCallback, useEffect, useMemo, useState } from 'react'
import type { WorkspaceTab } from '@/components/layout/Header'
import type { ExpresswayKind, Sign, SignTemplate } from '../types'
import {
  FORK_ADD_CHOICES,
  SIGN_ADD_CHOICES,
  createSign,
  isExpresswayKind,
  isForkTemplate,
  normalizeUpdatedSign,
  templateForTab,
  visibleSignsForTab,
} from '../lib/sign-model'
import { createInitialWorkspace, saveWorkspace, type WorkspaceState } from './workspace-storage'

export function useSignWorkspace() {
  const [initialWorkspace] = useState<WorkspaceState>(createInitialWorkspace)
  const [signs, setSigns] = useState<Sign[]>(initialWorkspace.signs)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialWorkspace.activeTab)
  const [selectedId, setSelectedId] = useState<string>(initialWorkspace.selectedId)
  const activeTemplate = templateForTab(activeTab)
  const visibleSigns = useMemo(() => visibleSignsForTab(signs, activeTab), [activeTab, signs])
  const expresswaySignList = useMemo(() => signs.filter(sign => sign.template === 'expressway'), [signs])
  const selectedSign = useMemo<Sign>(
    () => visibleSigns.find(sign => sign.id === selectedId) ?? visibleSigns[0],
    [selectedId, visibleSigns],
  )

  useEffect(() => {
    saveWorkspace({ signs, activeTab, selectedId })
  }, [activeTab, selectedId, signs])

  const addSign = useCallback((template?: SignTemplate) => {
    const sign = createSign({ template: template ?? activeTemplate })
    setSigns(current => [...current, sign])
    setSelectedId(sign.id)
  }, [activeTemplate])

  const changeTab = useCallback((tab: WorkspaceTab) => {
    const signsForTab = visibleSignsForTab(signs, tab)
    const firstSign = signsForTab[0]
    if (!firstSign) return

    setActiveTab(tab)
    setSelectedId(current => signsForTab.some(sign => sign.id === current) ? current : firstSign.id)
  }, [signs])

  const updateSign = useCallback((updates: Partial<Sign>) => {
    setSigns(current => updateSignAndReferences(current, selectedId, updates))
  }, [selectedId])

  const updateSignById = useCallback((id: string, updates: Partial<Sign>) => {
    setSigns(current => updateSignAndReferences(current, id, updates))
  }, [])

  const deleteSign = useCallback((id: string) => {
    setSigns(current => {
      const target = current.find(sign => sign.id === id)
      if (!target || current.filter(sign => sign.template === target.template).length === 1) return current

      const next = current.filter(sign => sign.id !== id)
      if (id === selectedId) setSelectedId(next.find(sign => sign.template === target.template)?.id ?? next[0].id)
      return next
    })
  }, [selectedId])

  const reorderSign = useCallback((id: string, targetId: string, position: 'before' | 'after') => {
    setSigns(current => {
      const signsForTab = visibleSignsForTab(current, activeTab)
      if (id === targetId || !signsForTab.some(sign => sign.id === id) || !signsForTab.some(sign => sign.id === targetId)) return current

      const sourceIndex = current.findIndex(sign => sign.id === id)
      const targetIndex = current.findIndex(sign => sign.id === targetId)
      if (sourceIndex < 0 || targetIndex < 0) return current

      const next = [...current]
      const [movedSign] = next.splice(sourceIndex, 1)
      const adjustedTargetIndex = next.findIndex(sign => sign.id === targetId)
      next.splice(position === 'before' ? adjustedTargetIndex : adjustedTargetIndex + 1, 0, movedSign)
      return next
    })
    setSelectedId(id)
  }, [activeTab])

  return {
    activeTab,
    addChoices: activeTab === 'fork-guidance' ? FORK_ADD_CHOICES : SIGN_ADD_CHOICES,
    expresswaySignList,
    selectedId,
    selectedSign,
    signListTitle: activeTab === 'fork-guidance' ? '分叉指引' : '标志列表',
    visibleSigns,
    addSign,
    changeTab,
    deleteSign,
    reorderSign,
    selectSign: setSelectedId,
    updateSign,
    updateSignById,
  }
}

function updateSignAndReferences(signs: Sign[], id: string, updates: Partial<Sign>): Sign[] {
  const previous = signs.find(sign => sign.id === id)
  if (!previous) return signs

  const updated = normalizeUpdatedSign(previous, updates)
  const nextSigns = signs.map(sign => sign.id === id ? updated : sign)
  if (previous.template !== 'expressway' || updated.template !== 'expressway' || !isExpresswayKind(updated.kind)) return nextSigns

  return nextSigns.map(sign => syncForkRouteReference(sign, previous, updated))
}

function syncForkRouteReference(sign: Sign, previous: Sign, updated: Sign): Sign {
  if (!isForkTemplate(sign.template)) return sign

  const updates: Partial<Sign> = {}
  if (sign.leftRouteSignId === previous.id || (!sign.leftRouteSignId && sign.leftRoute === previous.code)) {
    Object.assign(updates, routeReferenceUpdates('left', updated))
  }
  if (sign.rightRouteSignId === previous.id || (!sign.rightRouteSignId && sign.rightRoute === previous.code)) {
    Object.assign(updates, routeReferenceUpdates('right', updated))
  }

  return Object.keys(updates).length > 0 ? normalizeUpdatedSign(sign, updates) : sign
}

function routeReferenceUpdates(side: 'left' | 'right', sign: Sign): Partial<Sign> {
  const kind = sign.kind as ExpresswayKind
  return side === 'left'
    ? {
        leftRoute: sign.code,
        leftRouteSignId: sign.id,
        leftRouteKind: kind,
        leftRouteProvinceLabel: sign.provinceLabel,
        leftRouteThreeDigitDescend: sign.threeDigitDescend,
      }
    : {
        rightRoute: sign.code,
        rightRouteSignId: sign.id,
        rightRouteKind: kind,
        rightRouteProvinceLabel: sign.provinceLabel,
        rightRouteThreeDigitDescend: sign.threeDigitDescend,
      }
}
