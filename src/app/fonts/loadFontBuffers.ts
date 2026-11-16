import type {
  FontKey,
} from '../generators/svg-text'

export const FONT_FILES: Record<FontKey, string> = {
  han: 'SourceHanSansSC-Bold.otf',
  a: 'jtbz_A.ttf',
  b: 'jtbz_B.ttf',
  c: 'jtbz_C.ttf',
}

/**
 * 模型代码工坊专用的字体（不参与交通标志 SVG 的 FontKey 体系）。
 *
 * unifont 就是游戏里 `minecraft:uniform` 用的那套字形，
 * 所以画布上的文字预览与实机效果一致。
 */
export const STUDIO_FONT_FILES: Record<string, string> = {
  unifont: 'unifont-17.0.04.ttf',
}

export const STUDIO_FONT_URL = '/fonts/unifont'

export const FONT_URLS = {
  han: '/fonts/han',
  a: '/fonts/a',
  b: '/fonts/b',
  c: '/fonts/c',
} as const

export type FontBuffers = Record<FontKey, Uint8Array>

export async function loadFontBuffers() {
  const entries = await Promise.all(
    (Object.keys(FONT_URLS) as FontKey[]).map(async kind => {
      const response = await fetch(FONT_URLS[kind])
      if (!response.ok)
        throw new Error(`无法加载 ${kind.toUpperCase()} 型交通标志字体`)

      const buffer = await response.arrayBuffer()
      return [kind, new Uint8Array(buffer)] as const
    }),
  )
  return Object.fromEntries(entries) as FontBuffers
}
