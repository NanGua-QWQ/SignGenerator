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

function decodeBase64(b64: string) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {bytes[i] = binary.charCodeAt(i)}
  return bytes
}

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
  const b64 = buffers[kind]
  if (!b64) {throw new Error(`未提供 ${kind} 字体数据`)}
  const buffer = decodeBase64(b64)
  const font = fontkit.create(buffer)
  fontInstances.set(kind, font)
  return font
}
