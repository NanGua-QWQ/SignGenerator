'use client'

import {
  useAtom,
  useSetAtom,
} from 'jotai'
import {
  Download, RotateCcw, ZoomIn, ZoomOut,
} from 'lucide-react'

import {
  Button,
} from '@/components/button'
import {
  signFilename,
} from '@/generators/generator'
import type {
  Sign,
} from '@/lib/types'
import {
  offsetAtom,
  scaleAtom,
  zoomScaleAtom,
} from '@/state/preview-store'

import ThemeToggle from './theme-toggle'

export function PreviewToolbar({
  sign,
}: { sign: Sign }) {
  const [scale, setScale] = useAtom(scaleAtom)
  const zoomScale = useSetAtom(zoomScaleAtom)
  const setOffset = useSetAtom(offsetAtom)

  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-b bg-background px-3">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => zoomScale(0.8)}
          title="缩小"
        >
          <ZoomOut className="size-3.5" />
        </Button>
        <output className="w-11 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(scale * 100)}%
        </output>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => zoomScale(1.25)}
          title="放大"
        >
          <ZoomIn className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => {
            setScale(1)
            setOffset({
              x: 0, y: 0,
            })
          }}
          title="复位"
        >
          <RotateCcw className="size-3.5" />
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => {
            const svg = document.querySelector('svg[role="img"]')
            if (!svg) { return }
            const source = new XMLSerializer().serializeToString(svg)
            const blob = new Blob([source], {
              type: 'image/svg+xml;charset=utf-8',
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${signFilename(sign)}.svg`
            a.click()
            URL.revokeObjectURL(url)
          }}
          title="下载 SVG"
        >
          <Download className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
