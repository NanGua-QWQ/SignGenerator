import {
  useState,
} from 'react'

import Link from 'next/link'

import ThemeToggle from './ThemeToggle'
import './Header.css'
import TAB_TITLES from '../tab-meta.json'

export type WorkspaceTab =
  | 'signs'
  | 'intersection-guidance'
  | 'destination-distance'
  | 'interchange-guidance'
  | 'entrance-exit-guidance'
  | 'free-mode'

interface HeaderProps {
    activeTab: WorkspaceTab
}

export function Header({
  activeTab,
}: HeaderProps) {
  const [filled, setFilled] = useState(false)

  const tabClass = (tab: WorkspaceTab) => `tab flex h-8 min-h-8 shrink-0 items-center whitespace-nowrap rounded-sm px-3 text-xs font-medium ${activeTab === tab ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`

  const tabs = Object.keys(TAB_TITLES) as WorkspaceTab[]

  return (
    <header className="flex shrink-0 flex-col border-b bg-background sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex h-12 min-w-0 items-center justify-between px-4 sm:h-auto sm:px-0">
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
            className={`animated-title truncate text-base font-bold text-foreground sm:text-lg ${filled ? 'is-filled' : ''}`}
          >
                    道路标牌生成器
          </h1>
          <span className="hidden text-xs text-muted-foreground sm:inline">Road Sign Generator</span>
        </div>
        <div className="sm:hidden"><ThemeToggle /></div>
      </div>
      <div className="flex w-full items-center border-t px-2 py-1 sm:w-auto sm:border-t-0 sm:px-0 sm:py-0">
        <div role="tablist" aria-label="生成器类型" className="flex min-w-0 flex-1 overflow-x-auto rounded-md bg-muted p-1 sm:flex-none">
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
        <div className="ml-2 hidden sm:block"><ThemeToggle /></div>
      </div>
    </header>
  )
}
