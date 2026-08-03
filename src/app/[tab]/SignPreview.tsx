import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,

  type PointerEvent as ReactPointerEvent } from 'react'

import {
  Download, RotateCcw, ZoomIn, ZoomOut,
} from 'lucide-react'

import {
  Button,
} from '@/components/button'
import {
  SignSvg, signFilename,
} from '@/generators/generator'
import type {
  Sign,
} from '@/lib/types'

const MIN_SCALE = 0.4
const MAX_SCALE = 3

interface Offset {
    x: number
    y: number
}

interface BoardPosition {
    x: number
    y: number
}

interface Measurement {
    start: BoardPosition
    end: BoardPosition
    startPoint: Offset
    endPoint: Offset
}

export function SignPreview({
  sign,
}: { sign: Sign }) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState<Offset>({
    x: 0,
    y: 0,
  })
  const [isDragging, setIsDragging] = useState(false)
  const [showPosition, setShowPosition] = useState(false)
  const [showPixelMeasure, setShowPixelMeasure] = useState(false)
  const [boardPosition, setBoardPosition] = useState<BoardPosition | null>(null)
  const [measurement, setMeasurement] = useState<Measurement | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const measuring = useRef(false)
  const lastPosition = useRef<Offset>({
    x: 0,
    y: 0,
  })
  const previewResetKey = [
    sign.id,
    sign.template,
    sign.kind,
    sign.code,
    sign.digits,
    sign.threeDigitDescend,
    sign.provinceLabel,
    sign.leftRoute,
    sign.rightRoute,
    sign.leftRouteKind,
    sign.rightRouteKind,
    sign.leftRouteProvinceLabel,
    sign.rightRouteProvinceLabel,
    sign.leftRouteThreeDigitDescend,
    sign.rightRouteThreeDigitDescend,
  ].join('|')

  const zoom = useCallback(
    (multiplier: number) => setScale(
      current => Math.min(MAX_SCALE, Math.max(MIN_SCALE, current * multiplier)),
    ),
    [],
  )

  useEffect(() => {
    const preview = previewRef.current
    if (!preview) {return}
    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) {return}
      event.preventDefault()
      zoom(event.deltaY < 0 ? 1.1 : 0.9)
    }
    preview.addEventListener('wheel', handleWheel, {
      passive: false,
    })
    return () => preview.removeEventListener('wheel', handleWheel)
  }, [zoom])

  useEffect(() => {
    const eventName = 'sign-preview-position-toggle'
    const togglePosition = () => setShowPosition(current => !current)
    const previousPositionDescriptor = Object.getOwnPropertyDescriptor(window, 'position')

    window.addEventListener(eventName, togglePosition)
    if (!previousPositionDescriptor || previousPositionDescriptor.configurable) {
      Object.defineProperty(window, 'position', {
        configurable: true,
        get() {
          window.dispatchEvent(new Event(eventName))
          return 'position overlay toggled'
        },
      })
    }

    return () => {
      window.removeEventListener(eventName, togglePosition)
      if (previousPositionDescriptor) {
        Object.defineProperty(window, 'position', previousPositionDescriptor)
      } else {
        delete (window as Window & { position?: unknown }).position
      }
    }
  }, [])

  useEffect(() => {
    const eventName = 'sign-preview-pixel-measure-toggle'
    const togglePixelMeasure = () => {
      setShowPixelMeasure((current) => {
        const next = !current
        if (!next) {setMeasurement(null)}
        return next
      })
    }
    const previousPxDescriptor = Object.getOwnPropertyDescriptor(window, 'px')

    window.addEventListener(eventName, togglePixelMeasure)
    if (!previousPxDescriptor || previousPxDescriptor.configurable) {
      Object.defineProperty(window, 'px', {
        configurable: true,
        get() {
          window.dispatchEvent(new Event(eventName))
          return 'pixel measurer toggled'
        },
      })
    }

    return () => {
      window.removeEventListener(eventName, togglePixelMeasure)
      if (previousPxDescriptor) {
        Object.defineProperty(window, 'px', previousPxDescriptor)
      } else {
        delete (window as Window & { px?: unknown }).px
      }
    }
  }, [])

  const boardPositionFromClient = (clientX: number, clientY: number): BoardPosition | null => {
    const svgElement = previewRef.current?.querySelector('svg')
    if (!svgElement) {return null}
    const rect = svgElement.getBoundingClientRect()
    const viewBox = svgElement.viewBox.baseVal
    if (
      rect.width <= 0
      || rect.height <= 0
      || viewBox.width <= 0
      || viewBox.height <= 0
    ) {return null}

    return {
      x: viewBox.x + (clientX - rect.left) / rect.width * viewBox.width,
      y: viewBox.y + (clientY - rect.top) / rect.height * viewBox.height,
    }
  }

  const previewPointFromClient = (clientX: number, clientY: number): Offset | null => {
    const previewRect = previewRef.current?.getBoundingClientRect()
    if (!previewRect) {return null}
    return {
      x: clientX - previewRect.left,
      y: clientY - previewRect.top,
    }
  }

  const measurePointFromEvent = (event: ReactPointerEvent<HTMLDivElement>) => {
    const board = boardPositionFromClient(event.clientX, event.clientY)
    const point = previewPointFromClient(event.clientX, event.clientY)
    if (!board || !point) {return null}
    return {
      board,
      point,
    }
  }

  const constrainedMeasurePoint = (
    start: Measurement,
    next: { board: BoardPosition; point: Offset },
    constrained: boolean,
  ) => {
    if (!constrained) {return next}

    const lockHorizontal
            = Math.abs(next.board.x - start.start.x) >= Math.abs(next.board.y - start.start.y)
    return lockHorizontal ? {
      board: {
        x: next.board.x,
        y: start.start.y,
      },
      point: {
        x: next.point.x,
        y: start.startPoint.y,
      },
    } : {
      board: {
        x: start.start.x,
        y: next.board.y,
      },
      point: {
        x: start.startPoint.x,
        y: next.point.y,
      },
    }
  }

  const updateBoardPosition = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!showPosition && !showPixelMeasure) {return}
    const position = boardPositionFromClient(event.clientX, event.clientY)
    if (!position) {
      setBoardPosition(null)
      return
    }
    setBoardPosition(position)
  }

  const reset = () => {
    setScale(1)
    setOffset({
      x: 0,
      y: 0,
    })
  }
  const download = () => {
    const svgElement = document.querySelector('svg[role=img]')
    if (!svgElement) {return}
    const svgString = svgElement.outerHTML
    const blob = new Blob([svgString], {
      type: 'image/svg+xml;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = signFilename(sign)
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {return}
    event.preventDefault()
    if (showPixelMeasure) {
      const point = measurePointFromEvent(event)
      if (!point) {return}
      measuring.current = true
      setMeasurement({
        start: point.board,
        end: point.board,
        startPoint: point.point,
        endPoint: point.point,
      })
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    dragging.current = true
    lastPosition.current = {
      x: event.clientX,
      y: event.clientY,
    }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    updateBoardPosition(event)
    if (measuring.current) {
      const point = measurePointFromEvent(event)
      if (point) {
        setMeasurement((current) => {
          if (!current) {return null}
          const next = constrainedMeasurePoint(current, point, event.shiftKey)
          return {
            ...current,
            end: next.board,
            endPoint: next.point,
          }
        })
      }
      return
    }
    if (!dragging.current) {return}
    setOffset(current => ({
      x: current.x + event.clientX - lastPosition.current.x,
      y: current.y + event.clientY - lastPosition.current.y,
    }))
    lastPosition.current = {
      x: event.clientX,
      y: event.clientY,
    }
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = false
    measuring.current = false
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const measureDelta = measurement ? {
    x: measurement.end.x - measurement.start.x,
    y: measurement.end.y - measurement.start.y,
    length: Math.hypot(
      measurement.end.x - measurement.start.x,
      measurement.end.y - measurement.start.y,
    ),
  } : null

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col bg-muted">
      <div className="flex h-11 shrink-0 items-center justify-between border-b bg-background px-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => zoom(0.8)}
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
            onClick={() => zoom(1.25)}
            title="放大"
          >
            <ZoomIn className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={reset} title="复位">
            <RotateCcw className="size-3.5" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={download} title="下载 SVG">
          <Download className="size-3.5" />
        </Button>
      </div>
      <div
        ref={previewRef}
        className={`relative flex min-h-0 min-w-0 w-full flex-1 touch-none select-none items-center justify-center overflow-hidden p-6 ${showPixelMeasure ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          backgroundImage: 'radial-gradient(var(--sign-preview-grid) 0.75px, transparent 0.75px)',
          backgroundSize: '16px 16px',
        }}
        onPointerDownCapture={startDrag}
        onPointerMove={moveDrag}
        onPointerLeave={() => setBoardPosition(null)}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        {showPosition
                    && <output className="pointer-events-none absolute right-3 top-3 z-10 rounded-md border border-border bg-background/95 px-2.5 py-1.5 text-xs font-medium tabular-nums text-foreground shadow-sm">
                        x {boardPosition ? boardPosition.x.toFixed(1) : '--'} y{' '}
                      {boardPosition ? boardPosition.y.toFixed(1) : '--'}
                    </output>
        }
        {showPixelMeasure
                    && <>
                      <output
                        className={`pointer-events-none absolute right-3 z-10 rounded-md border border-border bg-background/95 px-2.5 py-1.5 text-xs font-medium tabular-nums text-foreground shadow-sm ${showPosition ? 'top-12' : 'top-3'}`}
                      >
                            dx {measureDelta ? Math.abs(measureDelta.x).toFixed(1) : '--'} dy{' '}
                        {measureDelta ? Math.abs(measureDelta.y).toFixed(1) : '--'} px{' '}
                        {measureDelta ? measureDelta.length.toFixed(1) : '--'}
                      </output>
                      {measurement && <PixelMeasureOverlay measurement={measurement} />}
                    </>
        }
        <SignErrorBoundary key={previewResetKey}>
          <div
            className="min-w-0 w-full max-w-137.5 [&_svg]:block [&_svg]:h-auto [&_svg]:w-full drop-shadow-[0_10px_20px_rgba(15,23,42,0.18)]"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            }}
          >
            <SignSvg sign={sign} />
          </div>
        </SignErrorBoundary>
      </div>
    </section>
  )
}

function PixelMeasureOverlay({
  measurement,
}: { measurement: Measurement }) {
  const x1 = measurement.startPoint.x
  const y1 = measurement.startPoint.y
  const x2 = measurement.endPoint.x
  const y2 = measurement.endPoint.y
  const left = Math.min(x1, x2)
  const top = Math.min(y1, y2)
  const width = Math.abs(x2 - x1)
  const height = Math.abs(y2 - y1)
  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI
  const length = Math.hypot(x2 - x1, y2 - y1)

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div
        className="absolute border border-primary/70 bg-primary/10"
        style={{
          left,
          top,
          width,
          height,
        }}
      />
      <div
        className="absolute h-px origin-left bg-primary"
        style={{
          left: x1,
          top: y1,
          width: length,
          transform: `rotate(${angle}deg)`,
        }}
      />
      <span
        className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
        style={{
          left: x1,
          top: y1,
        }}
      />
      <span
        className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
        style={{
          left: x2,
          top: y2,
        }}
      />
    </div>
  )
}

interface SignErrorBoundaryState {
    error: Error | null
}

class SignErrorBoundary extends Component<{ children: ReactNode }, SignErrorBoundaryState> {
  state: SignErrorBoundaryState = {
    error: null,
  }

  static getDerivedStateFromError(error: Error): SignErrorBoundaryState {
    return {
      error,
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('标志预览渲染失败', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <p className="max-w-sm rounded-md border border-destructive/30 bg-background p-4 text-sm text-destructive">
          {this.state.error.message}
        </p>
      )
    }
    return this.props.children
  }
}
