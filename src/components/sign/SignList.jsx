import { Separator } from '@/components/ui/separator'
import { Plus, Trash2 } from 'lucide-react'

const directionLabels = {
  north: '北',
  south: '南',
  east: '东',
  west: '西',
}

export function SignList({ signs, selectedId, onSelect, onAdd, onDelete }) {
  return (
    <div className="h-full border-r bg-background overflow-y-auto">
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            路牌列表
          </h2>
          <button
            onClick={onAdd}
            className="size-6 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        <Separator className="mb-3" />
        <div className="flex flex-col gap-1.5">
          {signs.map((sign) => (
            <div
              key={sign.id}
              onClick={() => onSelect(sign.id)}
              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors group ${
                sign.id === selectedId
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted/50 hover:bg-muted'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-5 rounded-sm text-[10px] font-bold text-white shrink-0 bg-[#c83232]">
                    {sign.route}
                  </span>
                  <span className="text-xs font-medium truncate">{sign.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {directionLabels[sign.direction]} · {sign.destinations.map(d => d.city).join(' / ')}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(sign.id) }}
                className="size-5 rounded hover:bg-destructive/10 flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
