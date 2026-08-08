import {
  useState,
} from 'react'

import Link from 'next/link'

import ThemeToggle from './ThemeToggle'
import './Header.css'
import TAB_TITLES from '../tab-meta.json'

export type WorkspaceTab = 'signs' | 'interchange-guidance' | 'entrance-exit-guidance'

interface HeaderProps {
    activeTab: WorkspaceTab
}

export function Header({
  activeTab,
}: HeaderProps) {
  const [filled, setFilled] = useState(false)

  const tabClass = (tab: WorkspaceTab) => `tab h-7 rounded-sm px-2 text-xs font-medium ${activeTab === tab ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`

  const tabs = Object.keys(TAB_TITLES) as WorkspaceTab[]

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 sm:px-6">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1
          role="button"
          tabIndex={0}
          aria-pressed={filled}
          onClick={() => setFilled(f => !f)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setFilled(f => !f)
            }
          }}
          className={`animated-title truncate text-lg font-bold text-foreground ${filled ? 'is-filled' : ''}`}
        >
                    道路标牌生成器
        </h1>
        <span className="hidden text-xs text-muted-foreground sm:inline">Road Sign Generator</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div role="tablist" aria-label="生成器类型" className="flex rounded-md bg-muted p-1">
          {tabs.map(tab => <Link
            key={tab}
            href={`/${tab}`}
            role="tab"
            aria-selected={activeTab === tab}
            className={tabClass(tab)}
          >
            {TAB_TITLES[tab]}
          </Link>)}
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
