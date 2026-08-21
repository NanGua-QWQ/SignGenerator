import {
  useState, type DragEvent,
} from 'react'

import {
  GripVertical, Plus,
} from 'lucide-react'

import {
  Badge,
} from '@/components/badge'
import type {
  Sign
  ,
  SignTemplate,
} from '@/lib/types'

import {
  ALL_TEMPLATES, TEMPLATE_TITLES,
} from '@/lib/sign-model'
import {
  isForkSign,
  signBadge,
  signBadgeVariant,
  signInfo,
  signTitle,
} from '@/lib/sign-display'

interface SignListProps {
  title: string
  signs: Sign[]
  selectedId: string
  onSelect: (id: string) => void
  onAdd: (template: SignTemplate) => void
  onReorder?: (id: string, targetId: string, position: 'before' | 'after') => void
}

const SIGN_DRAG_TYPE = 'application/x-sign-id'

export function SignList({
  title,
  signs,
  selectedId,
  onSelect,
  onAdd,
  onReorder,
}: SignListProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(
    null,
  )
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  function dropPosition(event: DragEvent<HTMLDivElement>): 'before' | 'after' {
    const rect = event.currentTarget.getBoundingClientRect()
    return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
  }
  function startDrag(event: DragEvent<HTMLButtonElement>, sign: Sign) {
    if (!onReorder) {return}
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(SIGN_DRAG_TYPE, sign.id)
    setDraggingId(sign.id)
  }
  function overSign(event: DragEvent<HTMLDivElement>, sign: Sign) {
    if (!draggingId || draggingId === sign.id) {return}
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropTarget({
      id: sign.id,
      position: dropPosition(event),
    })
  }
  function dropSign(event: DragEvent<HTMLDivElement>, sign: Sign) {
    const draggedId = event.dataTransfer.getData(SIGN_DRAG_TYPE) || draggingId
    if (!draggedId || draggedId === sign.id || !dropTarget) {return}
    event.preventDefault()
    onReorder?.(draggedId, sign.id, dropTarget.position)
    setDraggingId(null)
    setDropTarget(null)
  }
  function endDrag() {
    setDraggingId(null)
    setDropTarget(null)
  }
  function selectOnly(sign: Sign) {
    onSelect(sign.id)
  }

  return (
    <aside className="h-full overflow-y-auto border-r bg-background max-md:max-h-32 max-md:border-b max-md:border-r-0">
      <div className="p-3 max-md:py-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {title}
          </h2>
          <div className="relative">
            <button
              type="button"
              onClick={() => setAddMenuOpen(open => !open)}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              title="新增标志"
            >
              <Plus className="size-3.5" />
            </button>
            {addMenuOpen && <div className="absolute right-0 top-7 z-40 w-52 rounded-md border bg-background p-1 shadow-lg">
              {ALL_TEMPLATES.map(template => (
                <button
                  key={template}
                  type="button"
                  onClick={() => {
                    onAdd(template)
                    setAddMenuOpen(false)
                  }}
                  className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                >
                  {TEMPLATE_TITLES[template]}
                </button>
              ))}
            </div>}
          </div>
        </div>
        <div className="mb-3 h-px bg-border max-md:hidden" />
        <div className="flex flex-col gap-1.5 max-md:flex-row max-md:overflow-x-auto">
          {signs.map((sign) => {
            const info = signInfo(sign)
            const isDropTarget = dropTarget?.id === sign.id
            const dropClass = isDropTarget ? dropTarget.position === 'before' ? 'border-t-primary' : 'border-b-primary' : 'border-y-transparent'
            const stateClass = sign.id === selectedId
              ? 'bg-accent text-accent-foreground'
              : 'bg-muted/50 hover:bg-muted'
            return (
              <div
                key={sign.id}
                className={[
                  'group relative shrink-0 rounded-md border-y-2 transition-colors max-md:w-40',
                  dropClass,
                  draggingId === sign.id ? 'opacity-50' : '',
                  stateClass,
                ].join(' ')}
                onContextMenu={(event) => {
                  event.preventDefault()
                  selectOnly(sign)
                }}
                onDragOver={event => overSign(event, sign)}
                onDrop={event => dropSign(event, sign)}
              >
                <button
                  type="button"
                  draggable={Boolean(onReorder)}
                  onDragStart={event => startDrag(event, sign)}
                  onDragEnd={endDrag}
                  className="absolute left-1 top-1/2 flex size-6 -translate-y-1/2 cursor-grab items-center justify-center rounded text-muted-foreground opacity-60 hover:bg-accent-foreground/10 hover:text-foreground active:cursor-grabbing group-hover:opacity-100"
                  aria-label={`拖动排序 ${signTitle(sign)}`}
                  title="拖动排序"
                >
                  <GripVertical className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelect(sign.id)}
                  className="flex w-full items-center gap-2 py-2 pl-8 pr-8 text-left"
                  title={isForkSign(sign) ? info.join('\n') : signTitle(sign)}
                >
                  <Badge variant={signBadgeVariant(sign)}>{signBadge(sign)}</Badge>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {signTitle(sign)}
                  </span>
                </button>
                {isForkSign(sign)
                  && <div className="pointer-events-none absolute left-2 right-2 top-[calc(100%+0.25rem)] z-30 hidden rounded-md border bg-background p-2 text-[11px] leading-5 text-foreground shadow-lg group-hover:block">
                    {info.map(line => <div key={line} className="truncate">
                      {line}
                    </div>,
                    )}
                  </div>
                }
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
