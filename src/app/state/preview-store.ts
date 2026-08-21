import {
  atom,
} from 'jotai'

const MIN_SCALE = 0.4
const MAX_SCALE = 3

interface PreviewOffset {
  x: number
  y: number
}

export const scaleAtom = atom(1)
export const offsetAtom = atom<PreviewOffset>({
  x: 0, y: 0,
})
export const zoomScaleAtom = atom(
  null,
  (get, set, update: number) => set(scaleAtom, prev => Math.min(
    MAX_SCALE,
    Math.max(
      MIN_SCALE,
      prev * update,
    ),
  )),
)
