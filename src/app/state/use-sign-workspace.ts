import {
  useCallback, useEffect,
} from 'react'

import {
  useAtom,
  useAtomValue, useSetAtom,
} from 'jotai'

import {
  addSignAtom,
  deleteSignAtom,
  effectiveSelectedIdAtom,
  expresswaySignListAtom,
  readyToSaveAtom,
  reorderSignAtom,
  selectedIdAtom,
  selectedSignAtom,
  signsAtom,
  updateSignByIdAtom,
} from './sign-workspace-store'
import {
  saveWorkspace,
} from './workspace-storage'

export function useSignWorkspace() {
  const signs = useAtomValue(signsAtom)
  const [selectedId, selectId] = useAtom(selectedIdAtom)
  const effectiveSelectedId = useAtomValue(effectiveSelectedIdAtom)
  const readyToSave = useAtomValue(readyToSaveAtom)

  const expresswaySignList = useAtomValue(expresswaySignListAtom)
  const selectedSign = useAtomValue(selectedSignAtom)

  const addSign = useSetAtom(addSignAtom)
  const deleteSign = useSetAtom(deleteSignAtom)
  const setReorderSign = useSetAtom(reorderSignAtom)
  const updateSignById = useSetAtom(updateSignByIdAtom)

  const reorderSign = useCallback(
    (id: string, targetId: string, position: 'before' | 'after') => {
      setReorderSign({
        id,
        targetId,
        position,
      })
    },
    [setReorderSign],
  )

  useEffect(() => {
    if (!readyToSave) { return }
    saveWorkspace({
      signs,
      selectedId,
    })
  }, [readyToSave, selectedId, signs])

  const updateSign = useCallback(
    (updates: Partial<typeof selectedSign>) => {
      updateSignById({
        id: effectiveSelectedId,
        updates,
      })
    },
    [effectiveSelectedId, updateSignById],
  )

  const signListTitle = '全部标志'

  return {
    expresswaySignList,
    selectedId: effectiveSelectedId,
    selectedSign,
    signs,
    signListTitle,
    addSign,
    deleteSign,
    reorderSign,
    selectId,
    updateSign,
    updateSignById,
  }
}
