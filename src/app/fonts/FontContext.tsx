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

interface FontContextValue {
    buffers: FontBuffers | null
    error: string | null
}

const FontContext = createContext<FontContextValue>({
  buffers: null,
  error: null,
})

const fontInstances = new Map<FontKey, Font>()

export function FontProvider({
  buffers,
  error = null,
  children,
}: { buffers: FontBuffers | null; error?: string | null; children: ReactNode }) {
  return (
    <FontContext value={{ buffers, error }}>
      {children}
    </FontContext>
  )
}

export function useFontsReady() {
  const { buffers } = use(FontContext)
  return buffers !== null
}

export function useFontError() {
  const { error } = use(FontContext)
  return error
}

export function useFont(kind: FontKey) {
  const { buffers } = use(FontContext)
  if (!buffers) throw new Error('useFont 必须在字体加载完成后使用')
  const cached = fontInstances.get(kind)
  if (cached) return cached
  const buffer = buffers[kind]
  if (!buffer) throw new Error(`未提供 ${kind} 字体数据`)
  const font = fontkit.create(buffer)
  fontInstances.set(kind, font)
  return font
}
