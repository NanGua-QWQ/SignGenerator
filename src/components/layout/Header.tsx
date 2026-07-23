import { ThemeToggle } from './ThemeToggle'

export function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 sm:px-6">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="truncate text-lg font-bold text-foreground">道路标志生成器</h1>
        <span className="hidden text-xs text-muted-foreground sm:inline">Road Sign Generator</span>
      </div>
      <ThemeToggle />
    </header>
  )
}
