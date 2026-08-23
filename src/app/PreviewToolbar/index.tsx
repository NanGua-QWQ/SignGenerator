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
  useTheme,
} from 'next-themes'
import {
  Tooltip,
} from '@radix-ui/themes'

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

import "./previewtoolbar.css"

import {
  selectedSignAtom,
} from '../state/sign-workspace-store'

export default function PreviewToolbar() {
  const sign = useAtomValue(selectedSignAtom)
  const [scale, setScale] = useAtom(scaleAtom)
  const zoomScale = useSetAtom(zoomScaleAtom)
  const setOffset = useSetAtom(offsetAtom)
  const pathname = usePathname()
  const {
    setTheme,
    resolvedTheme
  } = useTheme()

  return (
    <div className="preview-toolbar flex items-center gap-1 h-11 shrink-0 items-center justify-between border-b bg-background px-3">
      <div className="flex items-center gap-1">
        {pathname !== '/' && <Tooltip content="已创建的标牌">
          <Link href="/" className="flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
        </Tooltip>}
        {pathname !== '/created' && <Tooltip content="已创建的标牌">
          <Link href="/created" className="flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
            >
              <Folder className="size-4" />
            </Button>
          </Link>
        </Tooltip>}
        {pathname !== '/new' && <Tooltip content="创建新标牌">
          <Link href="/new" className="flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
            >
              <Plus className="size-4" />
            </Button>
          </Link>
        </Tooltip>}
      </div>
      <div className="flex items-center gap-1">
        <Tooltip content="缩小">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => zoomScale(0.8)}
          >
            <ZoomOut className="size-4" />
          </Button>
        </Tooltip>
        <output className="w-11 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(scale * 100)}%
        </output>
        <Tooltip content="放大">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => zoomScale(1.25)}
          >
            <ZoomIn className="size-4" />
          </Button>
        </Tooltip>
        <Tooltip content="复位">
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
          >
            <RotateCcw className="size-4" />
          </Button>
        </Tooltip>
      </div>
      <div className="flex items-center gap-1">
        <Tooltip content="切换主题">
          <Button variant="ghost" size="icon" onClick={() => {
            setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
          }} aria-label="切换主题" className="size-7">
            <span className="relative grid place-items-center">
              <Sun className="col-start-1 row-start-1 size-5 scale-100 transition-all dark:scale-0" />
              <Moon className="col-start-1 row-start-1 size-5 scale-0 transition-all dark:scale-100" />
            </span>
            <span className="sr-only">切换颜色主题</span>
          </Button>
        </Tooltip>
        <Tooltip content="下载 SVG">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => {
              const svg = document.querySelector('svg[role="img"]')
              if (!svg) return
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
          >
            <Download className="size-4" />
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}
