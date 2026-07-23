import { ThemeToggle } from './ThemeToggle'

export type WorkspaceTab = 'signs' | 'fork-guidance'

interface HeaderProps {
  activeTab: WorkspaceTab
  onTabChange: (tab: WorkspaceTab) => void
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 sm:px-6">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="truncate text-lg font-bold text-foreground">道路标志生成器</h1>
        <span className="hidden text-xs text-muted-foreground sm:inline">Road Sign Generator</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div role="tablist" aria-label="生成器类型" className="flex rounded-md bg-muted p-1">
          <button type="button" role="tab" aria-selected={activeTab === 'signs'} onClick={() => onTabChange('signs')} className={`h-7 rounded-sm px-2 text-xs font-medium ${activeTab === 'signs' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}>标识牌</button>
          <button type="button" role="tab" aria-selected={activeTab === 'fork-guidance'} onClick={() => onTabChange('fork-guidance')} className={`h-7 rounded-sm px-2 text-xs font-medium ${activeTab === 'fork-guidance' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}>分叉指引</button>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
