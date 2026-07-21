import { useRef, useState, useEffect } from 'react'
import { ModeToggle } from '@/components/mode-toggle'

const modeLabels = [
  { key: 'highway', label: '高速' },
  { key: 'national', label: '国道' },
  { key: 'natio', label: '1' },
]

export function Header({ mode, onModeChange }) {
  const containerRef = useRef(null)
  const btnRefs = useRef({})
  const [indicatorStyle, setIndicatorStyle] = useState({})

  useEffect(() => {
    const el = btnRefs.current[mode]
    const container = containerRef.current
    if (!el || !container) return
    const containerRect = container.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    setIndicatorStyle({
      left: elRect.left - containerRect.left,
      width: elRect.width,
    })
  }, [mode])

  return (
    <header className="border-b bg-background h-14 flex items-center px-6 justify-between sticky top-0 z-10 shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-foreground">道路标识生成器</h1>
        <span className="text-xs text-muted-foreground hidden sm:inline">Road Sign Generator</span>
      </div>
      <div className="flex items-center gap-2">
        <div ref={containerRef} className="relative inline-flex bg-muted rounded-lg p-0.5">
          <div
            className="absolute top-0.5 bottom-0.5 bg-background shadow-sm rounded-md transition-all duration-300 ease-out"
            style={indicatorStyle}
          />
          {modeLabels.map(({ key, label }) => (
            <button
              key={key}
              ref={el => (btnRefs.current[key] = el)}
              onClick={() => onModeChange(key)}
              className={`relative z-10 px-3 py-1 text-sm rounded-md transition-colors duration-300 ${
                mode === key
                  ? 'font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <ModeToggle />
      </div>
    </header>
  )
}
