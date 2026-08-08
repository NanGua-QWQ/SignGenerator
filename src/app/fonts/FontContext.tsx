'use client'
import {
  createContext,
  use,
  type ReactNode,
} from 'react'

import fontkit from '@pdf-lib/fontkit'

import type {
  FontBuffers,
} from './loadFontBuffers'
import type {
  FontKey,
} from '../generators/svg-text'
import type {
  Font,
} from '@pdf-lib/fontkit'

const FontContext = createContext<FontBuffers | null>(null)

const fontInstances = new Map<FontKey, Font>()

export function FontProvider({
  buffers,
  children,
}: { buffers: FontBuffers; children: ReactNode }) {
  return (
    <FontContext value={buffers}>
      {children}
    </FontContext>
  )
}

export function useFont(kind: FontKey) {
  const buffers = use(FontContext)
  if (!buffers) {throw new Error('useFont 必须在 FontProvider 内使用')}
  const cached = fontInstances.get(kind)
  if (cached) {return cached}
  const buffer = buffers[kind]
  if (!buffer) {throw new Error(`未提供 ${kind} 字体数据`)}
  const font = fontkit.create(buffer)
  fontInstances.set(kind, font)
  return font
}
