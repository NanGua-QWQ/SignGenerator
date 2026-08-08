import {
  useState, type DragEvent, type MouseEvent,
} from 'react'

import {
  GripVertical, Plus, Trash2,
} from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/alert-dialog'
import {
  Badge,
} from '@/components/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu'
import type {
  Sign
  ,
  SignTemplate,
} from '@/lib/types'

import {
  SignListDialogEditor, SignListPopoverEditor,
} from './SignListEditor'
import {
  deleteDialogTitle,
  isForkSign,
  signBadge,
  signBadgeVariant,
  signInfo,
  signTitle,
} from '../lib/sign-display'

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
  onReorder?: (id: string, targetId: string, position: 'before' | 'after') => void
  onUpdate?: (id: string, updates: Partial<Sign>) => void
}

const SIGN_DRAG_TYPE = 'application/x-sign-id'

export function SignList({
  title,
  signs,
  selectedId,
  onSelect,
  onAdd,
  addChoices = [],
  onDelete,
  onReorder,
  onUpdate,
}: SignListProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(
    null,
  )
  const [popoverEditor, setPopoverEditor] = useState<{ id: string; x: number; y: number } | null>(
    null,
  )
  const [dialogEditorId, setDialogEditorId] = useState<string | null>(null)
  const popoverSign = signs.find(sign => sign.id === popoverEditor?.id)
  const dialogSign = signs.find(sign => sign.id === dialogEditorId)
  const actionButtonClass
    = 'flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent-foreground/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30'
  const deleteButton = (sign: Sign, onClick?: () => void) => <button
    type="button"
    onClick={onClick}
    className={`${actionButtonClass} hover:bg-destructive/10 hover:text-destructive`}
    aria-label={`删除 ${signTitle(sign)}`}
  >
    <Trash2 className="size-3" />
  </button>

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
  function openEditor(event: MouseEvent<HTMLDivElement>, sign: Sign) {
    if (!onUpdate) {return}
    event.preventDefault()
    onSelect(sign.id)
    setPopoverEditor({
      id: sign.id,
      x: Math.min(event.clientX, window.innerWidth - 340),
      y: Math.min(event.clientY, window.innerHeight - 440),
    })
  }

  return (
    <aside className="h-full overflow-y-auto border-r bg-background max-md:max-h-32 max-md:border-b max-md:border-r-0">
      <div className="p-3 max-md:py-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {title}
          </h2>
          {addChoices.length > 0 ? <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                title="新增标志"
              >
                <Plus className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {addChoices.map(choice => (
                <DropdownMenuItem
                  key={choice.value}
                  onSelect={() => onAdd(choice.value)}
                >
                  {choice.label}
                </DropdownMenuItem>
              ),
              )}
            </DropdownMenuContent>
          </DropdownMenu> : <button
            type="button"
            onClick={() => onAdd()}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            title="新增标志"
          >
            <Plus className="size-3.5" />
          </button>
          }
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
                onContextMenu={event => openEditor(event, sign)}
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
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>{deleteButton(sign)}</AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle className="text-sm font-semibold">
                        {deleteDialogTitle(sign)}
                      </AlertDialogTitle>
                      <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">
                        将删除“{signTitle(sign)}”。这个操作不能撤销。
                      </AlertDialogDescription>
                      <div className="mt-4 flex justify-end gap-2">
                        <AlertDialogCancel className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent">
                          取消
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="inline-flex h-9 items-center justify-center rounded-md bg-destructive px-3 text-sm font-medium text-white hover:bg-destructive/90"
                          onClick={() => onDelete(sign.id)}
                        >
                          删除
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
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
        {popoverSign && popoverEditor && onUpdate
          && <SignListPopoverEditor
            key={popoverSign.id}
            sign={popoverSign}
            x={popoverEditor.x}
            y={popoverEditor.y}
            onChange={updates => onUpdate(popoverSign.id, updates)}
            onClose={() => setPopoverEditor(null)}
            onOpenDialog={() => {
              setDialogEditorId(popoverSign.id)
              setPopoverEditor(null)
            }}
          />
        }
        {dialogSign && onUpdate
          && <SignListDialogEditor
            key={dialogSign.id}
            sign={dialogSign}
            open={Boolean(dialogSign)}
            onChange={updates => onUpdate(dialogSign.id, updates)}
            onClose={() => setDialogEditorId(null)}
          />
        }
      </div>
    </aside>
  )
}
