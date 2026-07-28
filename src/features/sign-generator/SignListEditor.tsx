import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent, type ReactNode } from 'react'
import { GripHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ExpresswayKind, OrdinaryRoadKind, Sign } from './types'

interface EditorProps {
  sign: Sign
  onChange: (updates: Partial<Sign>) => void
}

interface SignListPopoverEditorProps extends EditorProps {
  x: number
  y: number
  onClose: () => void
}

const DIRECTION_OPTIONS = ['东', '南', '西', '北']
const EXPRESSWAY_KIND_OPTIONS: Array<{ value: ExpresswayKind; label: string }> = [
  { value: 'national', label: '国家高速' },
  { value: 'provincial', label: '省高速' },
  { value: 'beijing-tianjin-hebei', label: '京津冀高速' },
]
const ORDINARY_KIND_OPTIONS: Array<{ value: OrdinaryRoadKind; label: string }> = [
  { value: 'ordinary-national', label: '国道' },
  { value: 'ordinary-provincial', label: '省道' },
  { value: 'ordinary-county', label: '县道' },
  { value: 'ordinary-township', label: '乡道' },
]

export function SignListPopoverEditor({ sign, x, y, onChange, onClose }: SignListPopoverEditorProps) {
  const [position, setPosition] = useState({ x, y })
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    setPosition({ x, y })
  }, [x, y])

  useEffect(() => {
    const close = () => onClose()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('click', close)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  const startMove = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragOffset.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    }
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    setPosition({
      x: Math.min(Math.max(8, event.clientX - dragOffset.current.x), window.innerWidth - 328),
      y: Math.min(Math.max(8, event.clientY - dragOffset.current.y), window.innerHeight - 80),
    })
  }

  return (
    <div className="fixed z-50 w-80 rounded-md border bg-background p-3 text-foreground shadow-xl" style={{ left: position.x, top: position.y }} onClick={event => event.stopPropagation()}>
      <div className="mb-3 flex cursor-move touch-none items-center justify-between gap-2 rounded-sm px-1 py-0.5" onPointerDown={startMove} onPointerMove={move}>
        <div className="flex min-w-0 items-center gap-1.5">
          <GripHorizontal className="size-3.5 shrink-0 text-muted-foreground" />
          <h3 className="truncate text-sm font-semibold">Popover 编辑</h3>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose} title="关闭"><X className="size-3.5" /></Button>
      </div>
      <QuickSignEditFields sign={sign} onChange={onChange} compact />
    </div>
  )
}

function QuickSignEditFields({ sign, onChange, compact = false }: EditorProps & { compact?: boolean }) {
  const [draft, setDraft] = useState(sign)
  const gapClass = compact ? 'gap-2' : 'gap-3'

  useEffect(() => {
    setDraft(sign)
  }, [sign])

  const update = (updates: Partial<Sign>) => {
    setDraft(current => ({ ...current, ...updates }))
    onChange(updates)
  }
  const updateText = (key: keyof Pick<Sign, 'name' | 'exitName' | 'exitDestination'>, limit: number) => (event: ChangeEvent<HTMLInputElement>) => {
    update({ [key]: Array.from(event.target.value).slice(0, limit).join('') })
  }
  const updateDigits = (event: ChangeEvent<HTMLInputElement>) => {
    update({ digits: event.target.value.replace(/\D/g, '').slice(0, 4) })
  }
  const updateExitNumber = (event: ChangeEvent<HTMLInputElement>) => {
    update({ exitNumber: event.target.value.replace(/\D/g, '').slice(0, 4) })
  }
  const updateExitDistance = (event: ChangeEvent<HTMLInputElement>) => {
    update({ exitDistance: event.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 5) })
  }
  const updateRoute = (key: 'leftRoute' | 'rightRoute') => (event: ChangeEvent<HTMLInputElement>) => {
    update(
      key === 'leftRoute'
        ? { leftRoute: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5), leftRouteSignId: '' }
        : { rightRoute: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5), rightRouteSignId: '' },
    )
  }

  if (sign.template === 'expressway') {
    return (
      <div className={`grid ${gapClass}`}>
        <Field label="高速类型">
          <Select value={draft.kind} onValueChange={value => update({ kind: value as ExpresswayKind, provinceLabel: value === 'provincial' ? draft.provinceLabel || '粤' : '' })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EXPRESSWAY_KIND_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <div className={draft.kind === 'provincial' ? 'grid grid-cols-[minmax(0,1fr)_4rem] gap-2' : 'grid'}>
          <Field label="道路编号"><Input value={draft.digits} onChange={updateDigits} inputMode="numeric" maxLength={4} /></Field>
          {draft.kind === 'provincial' && <Field label="简称"><Input value={draft.provinceLabel} onChange={event => update({ provinceLabel: Array.from(event.target.value.trim()).slice(0, 1).join('') })} maxLength={1} /></Field>}
        </div>
        <Field label="高速名称"><Input value={draft.name} onChange={updateText('name', draft.digits.length === 4 ? 6 : 4)} /></Field>
      </div>
    )
  }

  if (sign.template === 'ordinary-road') {
    return (
      <div className={`grid ${gapClass}`}>
        <Field label="道路类型">
          <Select value={draft.kind} onValueChange={value => update({ kind: value as OrdinaryRoadKind })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ORDINARY_KIND_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="道路编号"><Input value={draft.digits} onChange={updateDigits} inputMode="numeric" maxLength={4} /></Field>
      </div>
    )
  }

  return (
    <div className={`grid ${gapClass}`}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="出口编号"><Input value={draft.exitNumber} onChange={updateExitNumber} inputMode="numeric" maxLength={4} /></Field>
        {sign.template === 'road-fork-preview' && <Field label="距离 km"><Input value={draft.exitDistance} onChange={updateExitDistance} inputMode="decimal" maxLength={5} /></Field>}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_4rem] gap-2">
        <Field label="左侧路线"><Input value={draft.leftRoute} onChange={updateRoute('leftRoute')} maxLength={5} /></Field>
        <Field label="方向"><DirectionSelect value={draft.leftDirection} onValueChange={value => update({ leftDirection: value })} /></Field>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_4rem] gap-2">
        <Field label="右侧路线"><Input value={draft.rightRoute} onChange={updateRoute('rightRoute')} maxLength={5} /></Field>
        <Field label="方向"><DirectionSelect value={draft.rightDirection} onValueChange={value => update({ rightDirection: value })} /></Field>
      </div>
      <Field label="出口名称"><Input value={draft.exitName} onChange={updateText('exitName', 6)} /></Field>
      <Field label="目的地"><Input value={draft.exitDestination} onChange={updateText('exitDestination', 8)} /></Field>
    </div>
  )
}

function DirectionSelect({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>{DIRECTION_OPTIONS.map(direction => <SelectItem key={direction} value={direction}>{direction}</SelectItem>)}</SelectContent>
    </Select>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
