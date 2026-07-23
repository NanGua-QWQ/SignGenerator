import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Sign } from '@/features/sign-generator/types'
import { Download, LoaderCircle, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateSignSvg, signFilename } from '@/features/sign-generator/generator'

const MIN_SCALE = 0.4
const MAX_SCALE = 3

interface Offset {
  x: number
  y: number
}

export function SignPreview({ sign }: { sign: Sign }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const dragging = useRef(false)
  const lastPosition = useRef<Offset>({ x: 0, y: 0 })

  useEffect(() => {
    let active = true
    setError('')
    setIsLoading(true)
    generateSignSvg(sign)
      .then(result => { if (active) { setSvg(result); setIsLoading(false) } })
      .catch(reason => { if (active) { setSvg(''); setError(reason.message); setIsLoading(false) } })
    return () => { active = false }
  }, [sign])

  const zoom = useCallback((multiplier: number) => setScale(current => Math.min(MAX_SCALE, Math.max(MIN_SCALE, current * multiplier))), [])
  const reset = () => { setScale(1); setOffset({ x: 0, y: 0 }) }
  const download = () => {
    if (!svg) return
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = signFilename(sign)
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    dragging.current = true
    lastPosition.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    setOffset(current => ({
      x: current.x + event.clientX - lastPosition.current.x,
      y: current.y + event.clientY - lastPosition.current.y,
    }))
    lastPosition.current = { x: event.clientX, y: event.clientY }
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col bg-muted">
      <div className="flex h-11 shrink-0 items-center justify-between border-b bg-background px-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => zoom(0.8)} title="缩小"><ZoomOut className="size-3.5" /></Button>
          <output className="w-11 text-center text-xs tabular-nums text-muted-foreground">{Math.round(scale * 100)}%</output>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => zoom(1.25)} title="放大"><ZoomIn className="size-3.5" /></Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={reset} title="复位"><RotateCcw className="size-3.5" /></Button>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={download} disabled={!svg} title="下载 SVG"><Download className="size-3.5" /></Button>
      </div>
      <div className="flex min-h-0 min-w-0 w-full flex-1 touch-none select-none items-center justify-center overflow-hidden p-6" style={{ backgroundImage: 'radial-gradient(var(--sign-preview-grid) 0.75px, transparent 0.75px)', backgroundSize: '16px 16px' }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { dragging.current = false }} onPointerCancel={() => { dragging.current = false }}>
        {isLoading ? <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-label="正在生成预览" /> : error ? <p className="max-w-sm rounded-md border border-destructive/30 bg-background p-4 text-sm text-destructive">{error}</p> : <div className="min-w-0 w-full max-w-[550px] [&_svg]:block [&_svg]:h-auto [&_svg]:w-full drop-shadow-[0_10px_20px_rgba(15,23,42,0.18)]" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }} dangerouslySetInnerHTML={{ __html: svg }} />}
      </div>
    </section>
  )
}
