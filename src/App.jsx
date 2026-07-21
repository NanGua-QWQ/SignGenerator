import { useState, useCallback } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Header } from '@/components/sign/Header'
import { SignList } from '@/components/sign/SignList'
import { SignPreview } from '@/components/sign/SignPreview'
import { SignSettings } from '@/components/sign/SignSettings'

const defaultDestinations = [
  { city: '北京', km: '50', arrow: 'up' },
  { city: '沈阳', km: '320', arrow: 'up' },
  { city: '哈尔滨', km: '580', arrow: 'up' },
]

function createSign(overrides = {}) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: 'highway',
    headerText: '国家高速',
    route: 'G1',
    name: '京哈高速',
    direction: 'north',
    destinations: defaultDestinations.map(d => ({ ...d })),
    ...overrides,
  }
}

const initialSigns = [
  createSign(),
  createSign({ route: 'G2', name: '京沪高速', direction: 'south', destinations: [
    { city: '天津', km: '120', arrow: 'up' },
    { city: '济南', km: '380', arrow: 'up' },
    { city: '上海', km: '1200', arrow: 'up' },
  ]}),
  createSign({ route: 'G4', name: '京港澳高速', direction: 'south', destinations: [
    { city: '石家庄', km: '280', arrow: 'up' },
    { city: '郑州', km: '680', arrow: 'up' },
    { city: '广州', km: '2100', arrow: 'up' },
  ]}),
]

export default function App() {
  const [signs, setSigns] = useState(initialSigns)
  const [selectedId, setSelectedId] = useState(initialSigns[0].id)
  const [mode, setMode] = useState('highway')

  const currentSign = signs.find(s => s.id === selectedId) || signs[0]

  const updateCurrentSign = useCallback((updates) => {
    setSigns(prev => prev.map(s =>
      s.id === selectedId ? { ...s, ...updates } : s
    ))
  }, [selectedId])

  const handleSelect = useCallback((id) => {
    setSelectedId(id)
  }, [])

  const handleAdd = useCallback(() => {
    const newSign = createSign({ type: mode })
    setSigns(prev => [...prev, newSign])
    setSelectedId(newSign.id)
  }, [mode])

  const handleDelete = useCallback((id) => {
    setSigns(prev => {
      const next = prev.filter(s => s.id !== id)
      if (next.length === 0) return prev
      if (id === selectedId) {
        const idx = prev.findIndex(s => s.id === id)
        const newIdx = Math.min(idx, next.length - 1)
        setSelectedId(next[newIdx].id)
      }
      return next
    })
  }, [selectedId])

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header mode={mode} onModeChange={setMode} />

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="hidden h-full md:block">
          <PanelGroup direction="horizontal" autoSaveId="sign-layout">
          <Panel defaultSize={15} minSize={12} maxSize={25} className="hidden md:block">
            <SignList
              signs={signs}
              selectedId={selectedId}
              onSelect={handleSelect}
              onAdd={handleAdd}
              onDelete={handleDelete}
            />
          </Panel>

          <PanelResizeHandle className="hidden md:block w-1.5 bg-transparent hover:bg-accent transition-colors cursor-col-resize shrink-0" />

          <Panel defaultSize={55} minSize={30}>
            <SignPreview sign={currentSign} />
          </Panel>

          <PanelResizeHandle className="hidden md:block w-1.5 bg-transparent hover:bg-accent transition-colors cursor-col-resize shrink-0" />

          <Panel defaultSize={30} minSize={20} maxSize={40}>
            <SignSettings sign={currentSign} onChange={updateCurrentSign} />
          </Panel>
          </PanelGroup>
        </div>

        <div className="flex h-full flex-col md:hidden">
          <div className="min-h-0 flex-[1.15]">
            <SignPreview sign={currentSign} />
          </div>
          <div className="min-h-0 flex-1">
            <SignSettings sign={currentSign} onChange={updateCurrentSign} />
          </div>
        </div>
      </div>
    </div>
  )
}
