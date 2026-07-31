import { ThemeToggle } from './ThemeToggle'
import { useState } from 'react'

export type WorkspaceTab = 'signs' | 'interchange-guidance' | 'entrance-exit-guidance'

interface HeaderProps {
  activeTab: WorkspaceTab
  onTabChange: (tab: WorkspaceTab) => void
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const [filled, setFilled] = useState(false)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 sm:px-6">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1
          role="button"
          tabIndex={0}
          aria-pressed={filled}
          onClick={() => setFilled((f) => !f)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setFilled((f) => !f)
            }
          }}
          className={`animated-title truncate text-lg font-bold text-foreground ${filled ? 'is-filled' : ''}`}
        >
          道路标志生成器
        </h1>
        <span className="hidden text-xs text-muted-foreground sm:inline">Road Sign Generator</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div role="tablist" aria-label="生成器类型" className="flex rounded-md bg-muted p-1">
          <button type="button" role="tab" aria-selected={activeTab === 'signs'} onClick={() => onTabChange('signs')} className={`h-7 rounded-sm px-2 text-xs font-medium ${activeTab === 'signs' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}>道路名称标识</button>
          <button type="button" role="tab" aria-selected={activeTab === 'interchange-guidance'} onClick={() => onTabChange('interchange-guidance')} className={`h-7 rounded-sm px-2 text-xs font-medium ${activeTab === 'interchange-guidance' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}>立交枢纽指引</button>
          <button type="button" role="tab" aria-selected={activeTab === 'entrance-exit-guidance'} onClick={() => onTabChange('entrance-exit-guidance')} className={`h-7 rounded-sm px-2 text-xs font-medium ${activeTab === 'entrance-exit-guidance' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}>出入口指引</button>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
