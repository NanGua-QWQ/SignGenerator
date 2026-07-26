import type { Sign } from '@/features/sign-generator/types'
import { Plus, Trash2 } from 'lucide-react'
import type { SignTemplate } from './types'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface AddChoice {
  value: SignTemplate
  label: string
}

interface SignListProps {
  title: string
  signs: Sign[]
  selectedId: string
  onSelect: (id: string) => void
  onAdd: (template?: SignTemplate) => void
  addChoices?: AddChoice[]
  onDelete: (id: string) => void
}

export function SignList({ title, signs, selectedId, onSelect, onAdd, addChoices = [], onDelete }: SignListProps) {
  const isForkSign = (sign: Sign) => sign.template === 'road-fork-preview' || sign.template === 'two-lane-interchange-exit'
  const signBadge = (sign: Sign) => sign.template === 'road-fork-preview' ? '分岔' : sign.template === 'two-lane-interchange-exit' ? '出口' : sign.code || 'G15'
  const signTitle = (sign: Sign) => sign.template === 'road-fork-preview'
    ? sign.name || '道路分岔预告'
    : sign.template === 'two-lane-interchange-exit'
      ? sign.name || '2车道立交枢纽出口'
      : sign.name || '高速编号牌'
  const signInfo = (sign: Sign) => {
    const left = `左区：${sign.leftDirection} ${sign.leftRoute} ${sign.exitName}`.trim()
    const right = `右区：${sign.rightDirection} ${sign.rightRoute} ${sign.exitDestination}`.trim()
    const distance = sign.template === 'road-fork-preview' ? `距离：${sign.exitDistance || '0'}km` : ''
    return [left, right, distance].filter(Boolean)
  }
  const deleteDialogTitle = (sign: Sign) => isForkSign(sign) ? '删除分叉指引？' : '删除标识牌？'
  const deleteButton = (sign: Sign, onClick?: () => void) => (
    <button type="button" onClick={onClick} className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus:opacity-100" aria-label={`删除 ${signTitle(sign)}`}><Trash2 className="size-3" /></button>
  )

  return (
    <aside className="h-full overflow-y-auto border-r bg-background max-md:max-h-32 max-md:border-b max-md:border-r-0">
      <div className="p-3 max-md:py-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</h2>
          {addChoices.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent" title="新增标志">
                  <Plus className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {addChoices.map(choice => (
                  <DropdownMenuItem key={choice.value} onSelect={() => onAdd(choice.value)}>
                    {choice.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button type="button" onClick={() => onAdd()} className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent" title="新增标志">
              <Plus className="size-3.5" />
            </button>
          )}
        </div>
        <div className="mb-3 h-px bg-border max-md:hidden" />
        <div className="flex flex-col gap-1.5 max-md:flex-row max-md:overflow-x-auto">
          {signs.map(sign => {
            const info = signInfo(sign)
            return (
              <div key={sign.id} className={`group relative shrink-0 rounded-md transition-colors max-md:w-40 ${sign.id === selectedId ? 'bg-accent text-accent-foreground' : 'bg-muted/50 hover:bg-muted'}`}>
                <button type="button" onClick={() => onSelect(sign.id)} className="flex w-full items-center gap-2 p-2 pr-8 text-left" title={isForkSign(sign) ? info.join('\n') : signTitle(sign)}>
                  <Badge variant={sign.template === 'expressway' ? 'expressway' : 'guidance'} >{signBadge(sign)}</Badge>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{signTitle(sign)}</span>
                </button>
                {isForkSign(sign) && (
                  <div className="pointer-events-none absolute left-2 right-2 top-[calc(100%+0.25rem)] z-30 hidden rounded-md border bg-background p-2 text-[11px] leading-5 text-foreground shadow-lg group-hover:block">
                    {info.map(line => <div key={line} className="truncate">{line}</div>)}
                  </div>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>{deleteButton(sign)}</AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogTitle className="text-sm font-semibold">{deleteDialogTitle(sign)}</AlertDialogTitle>
                    <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">
                      将删除“{signTitle(sign)}”。这个操作不能撤销。
                    </AlertDialogDescription>
                    <div className="mt-4 flex justify-end gap-2">
                      <AlertDialogCancel className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent">取消</AlertDialogCancel>
                      <AlertDialogAction className="inline-flex h-9 items-center justify-center rounded-md bg-destructive px-3 text-sm font-medium text-white hover:bg-destructive/90" onClick={() => onDelete(sign.id)}>删除</AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
