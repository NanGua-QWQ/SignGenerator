import type {
  FontKey,
} from '../generators/svg-text'

export const FONT_FILES: Record<FontKey, string> = {
  han: 'SourceHanSansSC-Bold.otf',
  a: 'jtbz_A.ttf',
  b: 'jtbz_B.ttf',
  c: 'jtbz_C.ttf',
}

export const FONT_URLS = {
  han: '/fonts/han',
  a: '/fonts/a',
  b: '/fonts/b',
  c: '/fonts/c',
} as const

export type FontBuffers = Record<FontKey, Uint8Array>

export async function loadFontBuffers() {
  const entries = await Promise.all(
    (Object.keys(FONT_URLS) as FontKey[]).map(async (kind) => {
      const response = await fetch(FONT_URLS[kind])
      if (!response.ok) {
        throw new Error(`无法加载 ${kind.toUpperCase()} 型交通标志字体`)
      }
      const buffer = await response.arrayBuffer()
      return [kind, new Uint8Array(buffer)] as const
    }),
  )
  return Object.fromEntries(entries) as FontBuffers
}
