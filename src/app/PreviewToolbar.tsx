'use client'

import {
  useAtom,
  useAtomValue,
  useSetAtom,
} from 'jotai'
import {
  Download,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sun,
  Folder,
  Moon,
  ArrowLeft,
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import {
  usePathname,
} from 'next/navigation'

import {
  Button,
} from '@/components/button'
import {
  signFilename,
} from '@/generators/generator'
import {
  offsetAtom,
  scaleAtom,
  zoomScaleAtom,
} from '@/state/preview-store'

import {
  selectedSignAtom,
} from './state/sign-workspace-store'

export function PreviewToolbar() {
  const sign = useAtomValue(selectedSignAtom)
  const [scale, setScale] = useAtom(scaleAtom)
  const zoomScale = useSetAtom(zoomScaleAtom)
  const setOffset = useSetAtom(offsetAtom)
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1 h-11 shrink-0 items-center justify-between border-b bg-background px-3">
      <div className="flex">
        {pathname !== '/' && <Link href="/">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="已创建的标牌"
          >
            <ArrowLeft className="size-3.5" />
          </Button>
        </Link>}
        {pathname !== '/created' && <Link href="/created">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="已创建的标牌"
          >
            <Folder className="size-3.5" />
          </Button>
        </Link>}
        {pathname !== '/new' && <Link href="/new">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="创建新标牌"
          >
            <Plus className="size-3.5" />
          </Button>
        </Link>}
      </div>
      <div className="flex items-center">
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
      <div className="flex">
        <Button variant="ghost" size="icon" onClick={() => {
          window.darkmode.real = !window.darkmode.real
          window.darkmode.apply()
        }} title="切换主题" aria-label="切换主题" className="size-7">
          <Sun className="size-3.5 scale-100 transition-all dark:scale-0" />
          <Moon className="size-3.5 scale-0 transition-all dark:scale-100" />
          <span className="sr-only">切换颜色主题</span>
        </Button>
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
