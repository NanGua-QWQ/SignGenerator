import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, RotateCcw, Ruler, ZoomIn, ZoomOut } from 'lucide-react'

const arrowMap = {
  up: '↑',
  'up-right': '↗',
  right: '→',
  left: '←',
}

const MIN_SCALE = 0.4
const MAX_SCALE = 3

function getHeaderCharacters(text) {
  return Array.from(text || '国家高速').slice(0, 4).concat(['', '', '', '']).slice(0, 4)
}

function getNameSize(name) {
  if (name.length > 8) return 3.4
  if (name.length > 6) return 4
  return 4.8
}

export function SignPreview({ sign }) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [showGuides, setShowGuides] = useState(false)
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const clampScale = (value) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))

  const zoomAtCenter = useCallback((multiplier) => {
    setScale((previous) => clampScale(previous * multiplier))
  }, [])

  const handleWheel = useCallback((event) => {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    zoomAtCenter(event.deltaY < 0 ? 1.15 : 0.87)
  }, [zoomAtCenter])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return undefined

    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  useEffect(() => {
    const releaseDrag = () => {
      dragging.current = false
    }
    window.addEventListener('mouseup', releaseDrag)
    return () => window.removeEventListener('mouseup', releaseDrag)
  }, [])

  const handleMouseDown = (event) => {
    if (event.button !== 0) return
    dragging.current = true
    lastPos.current = { x: event.clientX, y: event.clientY }
  }

  const handleMouseMove = (event) => {
    if (!dragging.current) return
    const x = event.clientX - lastPos.current.x
    const y = event.clientY - lastPos.current.y
    lastPos.current = { x: event.clientX, y: event.clientY }
    setOffset((previous) => ({ x: previous.x + x, y: previous.y + y }))
  }

  const reset = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  const downloadSvg = () => {
    const svg = svgRef.current
    if (!svg) return

    const source = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${sign.route || 'road-sign'}-${sign.name || 'design'}.svg`
    link.click()
    URL.revokeObjectURL(url)
  }

  const headerCharacters = getHeaderCharacters(sign.headerText)
  const destinations = sign.destinations.slice(0, 3)

  return (
    <section className="h-full min-h-0 flex flex-col bg-[#f7f8f8]">
      <div className="flex h-11 items-center justify-between border-b bg-background px-3 shrink-0">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => zoomAtCenter(0.8)} title="缩小">
            <ZoomOut className="size-3.5" />
          </Button>
          <output className="w-11 text-center text-xs tabular-nums text-muted-foreground">{Math.round(scale * 100)}%</output>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => zoomAtCenter(1.25)} title="放大">
            <ZoomIn className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={reset} title="复位">
            <RotateCcw className="size-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={showGuides ? 'secondary' : 'ghost'}
            size="icon"
            className="size-7"
            onClick={() => setShowGuides((current) => !current)}
            title="显示尺寸辅助线"
          >
            <Ruler className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={downloadSvg} title="下载 SVG">
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-hidden cursor-grab select-none active:cursor-grabbing"
        style={{ backgroundImage: 'radial-gradient(#cbd5d1 0.75px, transparent 0.75px)', backgroundSize: '16px 16px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => { dragging.current = false }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="flex min-h-full min-w-full items-center justify-center p-6">
          <div
            className="origin-center"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
          >
            <svg
              ref={svgRef}
              className="block w-[min(88vw,620px)] md:w-[min(48vw,680px)] drop-shadow-[0_10px_20px_rgba(15,23,42,0.18)]"
              viewBox="-8 -8 116 116"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label={`${sign.name} 路牌预览`}
            >
              <rect x="0" y="0" width="100" height="100" rx="12" fill="#ffffff" stroke="#111827" strokeWidth="0.9" />
              <rect x="3" y="3" width="94" height="94" rx="9" fill="none" stroke="#111827" strokeWidth="0.55" />

              <line x1="3" y1="23" x2="97" y2="23" stroke="#111827" strokeWidth="0.55" />
              {headerCharacters.map((character, index) => {
                const x = 15 + index * 20
                return (
                  <g key={`${character}-${index}`}>
                    <rect x={x} y="8" width="10" height="10" fill="#ffffff" stroke="#111827" strokeWidth="0.55" />
                    <text
                      x={x + 5}
                      y="15.15"
                      fill="#111827"
                      fontFamily="JTBZ-A, Noto Sans SC, sans-serif"
                      fontSize="5.3"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {character}
                    </text>
                  </g>
                )
              })}

              <rect x="16.5" y="37" width="67" height="45" fill="#ffffff" stroke="#111827" strokeWidth="0.65" />
              <rect x="20.5" y="41" width="13.5" height="6.3" rx="0.7" fill="#111827" />
              <text x="27.25" y="45.3" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="3.2" fontWeight="700" textAnchor="middle">
                {sign.route || 'G1'}
              </text>
              <text
                x="76.5"
                y="45.4"
                fill="#111827"
                fontFamily="JTBZ-A, Noto Sans SC, sans-serif"
                fontSize={getNameSize(sign.name)}
                fontWeight="700"
                textAnchor="end"
              >
                {sign.name || '道路名称'}
              </text>
              <line x1="20.5" y1="51.5" x2="79.5" y2="51.5" stroke="#111827" strokeWidth="0.4" />

              {destinations.map((destination, index) => {
                const y = 59.2 + index * 7
                return (
                  <g key={`${destination.city}-${index}`} fill="#111827" fontFamily="JTBZ-A, Noto Sans SC, sans-serif">
                    <text x="24" y={y} fontSize="4.7" fontWeight="700" textAnchor="middle">
                      {arrowMap[destination.arrow] || '↑'}
                    </text>
                    <text x="29" y={y} fontSize="4.4" fontWeight="700">
                      {destination.city || '目的地'}
                    </text>
                    <text x="76.5" y={y} fontFamily="Arial, sans-serif" fontSize="3.25" letterSpacing="0.15" textAnchor="end">
                      {destination.km ? `${destination.km} km` : ''}
                    </text>
                  </g>
                )
              })}

              {showGuides && (
                <g fill="none" stroke="#e11d48" strokeWidth="0.25" opacity="0.85">
                  <line x1="0" y1="-4" x2="100" y2="-4" />
                  <line x1="0" y1="-6" x2="0" y2="-2" />
                  <line x1="100" y1="-6" x2="100" y2="-2" />
                  <line x1="-4" y1="0" x2="-4" y2="100" />
                  <line x1="-6" y1="0" x2="-2" y2="0" />
                  <line x1="-6" y1="100" x2="-2" y2="100" />
                  <text x="50" y="-4.8" fill="#e11d48" stroke="none" fontFamily="Arial, sans-serif" fontSize="3" textAnchor="middle">100</text>
                  <text x="-4.8" y="50" fill="#e11d48" stroke="none" fontFamily="Arial, sans-serif" fontSize="3" textAnchor="middle" transform="rotate(-90 -4.8 50)">100</text>
                  <text x="50" y="86.5" fill="#e11d48" stroke="none" fontFamily="Arial, sans-serif" fontSize="2.6" textAnchor="middle">67 × 45</text>
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}
