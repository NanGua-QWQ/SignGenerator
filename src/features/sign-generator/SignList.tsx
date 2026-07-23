import type { Sign } from '@/features/sign-generator/types'
import { Plus, Trash2 } from 'lucide-react'

interface SignListProps {
  signs: Sign[]
  selectedId: string
  onSelect: (id: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
}

export function SignList({ signs, selectedId, onSelect, onAdd, onDelete }: SignListProps) {
  const signBadge = (sign: Sign) => sign.template === 'exit-location' ? '出口' : sign.code || 'G15'
  const signTitle = (sign: Sign) => sign.template === 'exit-location' ? sign.name || '出口定位' : sign.name || '高速编号牌'

  return (
    <aside className="h-full overflow-y-auto border-r bg-background max-md:max-h-32 max-md:border-b max-md:border-r-0">
      <div className="p-3 max-md:py-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">标志列表</h2>
          <button onClick={onAdd} className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent" title="新增标志"><Plus className="size-3.5" /></button>
        </div>
        <div className="mb-3 h-px bg-border max-md:hidden" />
        <div className="flex flex-col gap-1.5 max-md:flex-row max-md:overflow-x-auto">
          {signs.map(sign => (
            <div key={sign.id} className={`group relative shrink-0 rounded-md transition-colors max-md:w-40 ${sign.id === selectedId ? 'bg-accent text-accent-foreground' : 'bg-muted/50 hover:bg-muted'}`}>
              <button type="button" onClick={() => onSelect(sign.id)} className="flex w-full items-center gap-2 p-2 pr-8 text-left">
                <span className={`inline-flex h-6 min-w-8 items-center justify-center rounded-sm px-1 text-[10px] font-bold text-white ${sign.template === 'exit-location' ? 'bg-[#050203]' : 'bg-[#359b47]'}`}>{signBadge(sign)}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{signTitle(sign)}</span>
              </button>
              <button type="button" onClick={() => onDelete(sign.id)} className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground opacity-0 hover:bg-destructive/10 group-hover:opacity-100 focus:opacity-100" aria-label={`删除 ${signTitle(sign)}`}><Trash2 className="size-3" /></button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
