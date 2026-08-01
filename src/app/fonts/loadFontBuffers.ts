import 'server-only'
import {
  readFile,
} from 'node:fs/promises'
import {
  join,
} from 'node:path'

import type {
  FontKey,
} from '../generators/svg-text'

const FONT_FILES: Record<FontKey, string> = {
  han: 'SourceHanSansSC-Bold.otf',
  a: 'jtbz_A.ttf',
  b: 'jtbz_B.ttf',
  c: 'jtbz_C.ttf',
}

export type FontBuffers = Record<FontKey, string>;

export async function loadFontBuffers(): Promise<FontBuffers> {
  const entries = await Promise.all(
    (Object.keys(FONT_FILES) as FontKey[]).map(async (kind) => {
      const buffer = await readFile(join('/', join(...decodeURI(new URL(import.meta.url).pathname).split('/').slice(0, -1)), 'files', FONT_FILES[kind]))
      return [kind, buffer.toString('base64')] as const
    }),
  )
  return Object.fromEntries(entries) as FontBuffers
}
