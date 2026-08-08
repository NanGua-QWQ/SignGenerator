import {
  readFile,
} from 'node:fs/promises'
import {
  join,
} from 'node:path'

import {
  NextResponse,
} from 'next/server'

import {
  FONT_FILES,
} from '../loadFontBuffers'

const FONT_DIRECTORY = join(process.cwd(), 'src', 'app', 'fonts', 'files')
const FONT_MIME_TYPES: Record<string, string> = {
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
}

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ font: string }> },
) {
  const {
    font,
  } = await params
  if (!isFontKey(font)) {
    return NextResponse.json({
      error: 'Not found',
    }, {
      status: 404,
    })
  }

  const filename = FONT_FILES[font]
  const filePath = join(FONT_DIRECTORY, filename)
  const buffer = await readFile(filePath)
  const ext = filename.slice(filename.lastIndexOf('.'))

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': FONT_MIME_TYPES[ext] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

function isFontKey(value: string): value is keyof typeof FONT_FILES {
  return value in FONT_FILES
}
