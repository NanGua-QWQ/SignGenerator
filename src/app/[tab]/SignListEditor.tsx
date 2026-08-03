import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'

import {
  ExternalLink, GripHorizontal, X,
} from 'lucide-react'

import {
  Badge,
} from '@/components/badge'
import {
  Button,
} from '@/components/button'
import {
  Input,
} from '@/components/input'
import {
  Label,
} from '@/components/label'

import {
  POPOVER_COLOR_OPTIONS,
} from '../lib/popover-options'
import {
  defaultSignBadgeVariant,
} from '../lib/sign-display'
import {
  defaultOptionName,
} from '../lib/sign-model'

import type {
  Sign,
} from '../lib/types'

interface EditorProps {
  sign: Sign
  onChange: (updates: Partial<Sign>) => void
}

interface SignListPopoverEditorProps extends EditorProps {
  x: number
  y: number
  onClose: () => void
  onOpenDialog: () => void
}

interface SignListDialogEditorProps extends EditorProps {
  open: boolean
  onClose: () => void
}

export function SignListPopoverEditor({
  sign,
  x,
  y,
  onChange,
  onClose,
  onOpenDialog,
}: SignListPopoverEditorProps) {
  const [position, setPosition] = useState({
    x,
    y,
  })
  const panelRef = useRef<HTMLDivElement>(null)
  const dragOffset = useRef({
    x: 0,
    y: 0,
  })
  const closeEditor = () => {
    restoreShortNameBeforeClose(sign, onChange)
    onClose()
  }

  useEffect(() => {
    const close = (event: globalThis.PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) {return}
      if (panelRef.current && event.composedPath().includes(panelRef.current)) {return}
      if (target.closest('[data-slot="select-content"], [data-radix-popper-content-wrapper]')) {return}
      closeEditor()
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {closeEditor()}
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [closeEditor])

  const startMove = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragOffset.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    }
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {return}
    setPosition({
      x: Math.min(Math.max(8, event.clientX - dragOffset.current.x), window.innerWidth - 328),
      y: Math.min(Math.max(8, event.clientY - dragOffset.current.y), window.innerHeight - 80),
    })
  }

  return (
    <div
      ref={panelRef}
      className="fixed z-50 w-80 rounded-md border bg-background p-3 text-foreground shadow-xl"
      style={{
        left: position.x,
        top: position.y,
      }}
      onClick={event => event.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between gap-2 rounded-sm px-1 py-0.5">
        <div
          className="flex min-w-0 flex-1 cursor-move touch-none items-center gap-1.5"
          onPointerDown={startMove}
          onPointerMove={move}
        >
          <GripHorizontal className="size-3.5 shrink-0 text-muted-foreground" />
          <h3 className="truncate text-sm font-semibold">Popover 编辑</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onOpenDialog}
            title="打开 Dialog 编辑"
          >
            <ExternalLink className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={closeEditor} title="关闭">
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
      <QuickSignEditFields key={sign.id} sign={sign} onChange={onChange} compact />
    </div>
  )
}

export function SignListDialogEditor({
  sign, open, onChange, onClose,
}: SignListDialogEditorProps) {
  const closeEditor = () => {
    restoreShortNameBeforeClose(sign, onChange)
    onClose()
  }

  useEffect(() => {
    if (!open) {return}
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {closeEditor()}
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [closeEditor, open])

  if (!open) {return null}

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={closeEditor}
    >
      <div
        className="w-full max-w-md rounded-md border bg-background p-4 text-foreground shadow-xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold">Dialog 编辑</h3>
          <Button variant="ghost" size="icon" className="size-7" onClick={closeEditor} title="关闭">
            <X className="size-3.5" />
          </Button>
        </div>
        <QuickSignEditFields key={sign.id} sign={sign} onChange={onChange} />
        <div className="mt-4 flex justify-end">
          <Button onClick={closeEditor}>完成</Button>
        </div>
      </div>
    </div>
  )
}

function restoreShortNameBeforeClose(sign: Sign, onChange: (updates: Partial<Sign>) => void) {
  if (Array.from(sign.name.trim()).length <= 1) {onChange({
    name: defaultOptionName(sign),
  })}
}

function ColorBadgePicker({
  sign,
  onValueChange,
}: {
  sign: Sign
  onValueChange: (value: Sign['popoverColor']) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {POPOVER_COLOR_OPTIONS.map((option) => {
        const active = sign.popoverColor === option.value
        const variant = option.value === 'slate' ? defaultSignBadgeVariant(sign) : option.value
        return (
          <button
            key={option.value}
            type="button"
            className="rounded p-0"
            onClick={() => onValueChange(option.value)}
          >
            <Badge
              variant={variant}
              className={`pointer-events-none ${active ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : 'opacity-80'}`}
            >
              {option.label}
            </Badge>
          </button>
        )
      })}
    </div>
  )
}

function QuickSignEditFields({
  sign,
  onChange,
  compact = false,
}: EditorProps & { compact?: boolean }) {
  const [nameInput, setNameInput] = useState(sign.name)
  const composingName = useRef(false)
  const gapClass = compact ? 'gap-2' : 'gap-3'
  const nameLimit = sign.template === 'expressway' ? sign.digits.length === 4 ? 6 : 4 : 10

  const update = (updates: Partial<Sign>) => {
    onChange(updates)
  }
  const updatePopoverColor = (value: Sign['popoverColor']) => {
    update({
      popoverColor: value,
    })
  }
  const updateName = (event: ChangeEvent<HTMLInputElement>) => {
    setNameInput(event.target.value)
    if (composingName.current) {return}
    update({
      name: Array.from(event.target.value).slice(0, nameLimit).join(''),
    })
  }
  const finishNameComposition = (event: CompositionEvent<HTMLInputElement>) => {
    composingName.current = false
    const value = Array.from(event.currentTarget.value).slice(0, nameLimit).join('')
    setNameInput(value)
    update({
      name: value,
    })
  }

  return (
    <div className={`grid ${gapClass}`}>
      <Field label="选项名称">
        <Input
          value={nameInput}
          onChange={updateName}
          onCompositionStart={() => {
            composingName.current = true
          }}
          onCompositionEnd={finishNameComposition}
          maxLength={nameLimit}
          className="h-9"
        />
      </Field>
      <Field label="颜色">
        <ColorBadgePicker sign={sign} onValueChange={updatePopoverColor} />
      </Field>
    </div>
  )
}

function Field({
  label, children,
}: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
