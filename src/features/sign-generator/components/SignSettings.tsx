import { useEffect, useRef, useState, type ChangeEvent, type CompositionEvent } from 'react'
import type { ExpresswayKind, Sign } from '@/features/sign-generator/types'
import { DIRECTION_OPTIONS, ENTRANCE_ARROW_DIRECTION_OPTIONS, ORDINARY_KIND_OPTIONS } from '../lib/sign-options'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SignSettingsProps {
  sign: Sign
  onChange: (updates: Partial<Sign>) => void
  expresswaySignList?: Sign[]
}

function DirectionSelect({ id, value, onValueChange }: { id: string; value: string; onValueChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DIRECTION_OPTIONS.map(direction => (
          <SelectItem key={direction} value={direction}>{direction}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function InlineSwitch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`relative h-5 w-9 rounded-full border transition-colors ${checked ? 'border-primary bg-primary' : 'border-input bg-muted'}`}
    >
      <span className={`absolute top-0.5 size-3.5 rounded-full bg-background shadow-sm transition-transform ${checked ? 'left-4.5' : 'left-0.5'}`} />
    </button>
  )
}

function RouteSelect({ id, value, selectedSignId, onValueChange, signs }: { id: string; value: string; selectedSignId: string; onValueChange: (sign: Sign) => void; signs: Sign[] }) {
  const selectedSign = signs.find(s => s.id === selectedSignId) ?? signs.find(s => s.code === value)
  const selectValue = selectedSign?.id ?? `custom:${value || id}`
  return (
    <Select value={selectValue} onValueChange={signId => {
      const selected = signs.find(s => s.id === signId)
      if (selected) onValueChange(selected)
    }}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {!selectedSign && <SelectItem value={selectValue}>{value}</SelectItem>}
        {signs.map(s => (
          <SelectItem key={s.id} value={s.id}>
            {s.code}{s.name ? ` ${s.name}` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function routeMetadata(sign: Sign | undefined): { kind?: ExpresswayKind; provinceLabel?: string; threeDigitDescend?: boolean } {
  if (!sign) return {}
  return {
    kind: sign.kind as ExpresswayKind,
    provinceLabel: sign.provinceLabel,
    threeDigitDescend: sign.threeDigitDescend,
  }
}

export function SignSettings({ sign, onChange, expresswaySignList = [] }: SignSettingsProps) {
  const nameLimit = sign.digits.length === 4 ? 6 : 4
  const composingRoadName = useRef(false)
  const composingExitField = useRef<'name' | 'destination' | null>(null)
  const [roadNameInput, setRoadNameInput] = useState(sign.name)
  const [exitNameInput, setExitNameInput] = useState(sign.exitName)
  const [exitDestinationInput, setExitDestinationInput] = useState(sign.exitDestination)

  useEffect(() => {
    if (!composingRoadName.current) setRoadNameInput(sign.name)
    if (composingExitField.current !== 'name') setExitNameInput(sign.exitName)
    if (composingExitField.current !== 'destination') setExitDestinationInput(sign.exitDestination)
  }, [sign.exitDestination, sign.exitName, sign.name])

  const updateDigits = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ digits: event.target.value.replace(/\D/g, '').slice(0, 4) })
  }

  const updateName = (event: ChangeEvent<HTMLInputElement>) => {
    setRoadNameInput(event.target.value)
    if (composingRoadName.current) return
    onChange({ name: Array.from(event.target.value).slice(0, nameLimit).join('') })
  }

  const finishRoadNameComposition = (event: CompositionEvent<HTMLInputElement>) => {
    composingRoadName.current = false
    const value = Array.from(event.currentTarget.value).slice(0, nameLimit).join('')
    setRoadNameInput(value)
    onChange({ name: value })
  }

  const updateProvinceLabel = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ provinceLabel: Array.from(event.target.value.trim()).slice(0, 1).join('') })
  }

  const updateExitNumber = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ exitNumber: event.target.value.replace(/\D/g, '').slice(0, 4) })
  }

  const updateExitDistance = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ exitDistance: event.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 5) })
  }

  const updateEntranceDistance = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ exitDistance: event.target.value.replace(/\D/g, '').slice(0, 4) })
  }

  const updateExitName = (event: ChangeEvent<HTMLInputElement>) => {
    setExitNameInput(event.target.value)
    if (composingExitField.current === 'name') return
    onChange({ exitName: Array.from(event.target.value).slice(0, 6).join('') })
  }

  const updateExitDestination = (event: ChangeEvent<HTMLInputElement>) => {
    setExitDestinationInput(event.target.value)
    if (composingExitField.current === 'destination') return
    onChange({ exitDestination: Array.from(event.target.value).slice(0, 8).join('') })
  }

  const finishExitNameComposition = (event: CompositionEvent<HTMLInputElement>) => {
    composingExitField.current = null
    const value = Array.from(event.currentTarget.value).slice(0, 6).join('')
    setExitNameInput(value)
    onChange({ exitName: value })
  }

  const finishExitDestinationComposition = (event: CompositionEvent<HTMLInputElement>) => {
    composingExitField.current = null
    const value = Array.from(event.currentTarget.value).slice(0, 8).join('')
    setExitDestinationInput(value)
    onChange({ exitDestination: value })
  }

  const updateLeftRoute = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({
      leftRoute: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5),
      leftRouteSignId: '',
      leftRouteKind: undefined,
      leftRouteProvinceLabel: undefined,
      leftRouteThreeDigitDescend: undefined,
    })
  }

  const updateRightRoute = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({
      rightRoute: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5),
      rightRouteSignId: '',
      rightRouteKind: undefined,
      rightRouteProvinceLabel: undefined,
      rightRouteThreeDigitDescend: undefined,
    })
  }

  const selectLeftRoute = (selected: Sign) => {
    const metadata = routeMetadata(selected)
    onChange({
      leftRoute: selected.code,
      leftRouteSignId: selected.id,
      leftRouteKind: metadata.kind,
      leftRouteProvinceLabel: metadata.provinceLabel,
      leftRouteThreeDigitDescend: metadata.threeDigitDescend,
    })
  }

  const selectRightRoute = (selected: Sign) => {
    const metadata = routeMetadata(selected)
    onChange({
      rightRoute: selected.code,
      rightRouteSignId: selected.id,
      rightRouteKind: metadata.kind,
      rightRouteProvinceLabel: metadata.provinceLabel,
      rightRouteThreeDigitDescend: metadata.threeDigitDescend,
    })
  }

  return (
    <aside className="h-full overflow-y-auto border-l bg-background max-lg:border-l-0 max-lg:border-t">
      <div className="p-4">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">{sign.template === 'entrance-preview-two-directions' ? '出入口指引设置' : sign.template === 'direction-guidance' || sign.template === 'road-fork-preview' || sign.template === 'two-lane-interchange-exit' ? '立交枢纽指引设置' : '道路名称标识设置'}</h2>
        <div className="flex flex-col gap-4">
          {sign.template === 'expressway' ? (
            <>
              <div className="space-y-1.5">
                <Label>高速类型</Label>
                <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
                  <Button variant={sign.kind === 'national' ? 'default' : 'ghost'} className="h-8 rounded-sm" onClick={() => onChange({ kind: 'national' })}>国家高速</Button>
                  <Button variant={sign.kind === 'provincial' ? 'default' : 'ghost'} className="h-8 rounded-sm" onClick={() => onChange({ kind: 'provincial', provinceLabel: sign.provinceLabel || '粤' })}>省高速</Button>
                  <Button variant={sign.kind === 'beijing-tianjin-hebei' ? 'default' : 'ghost'} className="col-span-2 h-8 rounded-sm px-1 text-xs whitespace-nowrap" onClick={() => onChange({ kind: 'beijing-tianjin-hebei', provinceLabel: '' })}>京津冀高速</Button>
                </div>
              </div>
              <div className={`grid gap-3 ${sign.kind === 'provincial' ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : 'grid-cols-1'}`}>
                {sign.kind === 'provincial' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="province-label">省高速简称</Label>
                    <Input id="province-label" value={sign.provinceLabel} onChange={updateProvinceLabel} placeholder="粤" maxLength={1} className="h-9" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="road-digits">道路编号</Label>
                    {sign.digits.length === 3 && (
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input type="checkbox" checked={sign.threeDigitDescend} onChange={event => onChange({ threeDigitDescend: event.target.checked })} className="size-3.5 accent-primary" />
                        下沉
                      </label>
                    )}
                  </div>
                  <Input id="road-digits" value={sign.digits} onChange={updateDigits} placeholder="1、15、105 或 0421" inputMode="numeric" pattern="[0-9]*" maxLength={4} className="h-9" />
                </div>
                <p className={`${sign.kind === 'provincial' ? 'col-span-2' : ''} text-xs text-muted-foreground`}>只输入数字，支持 1-4 位编号。</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="road-name">高速名称</Label>
                <Input id="road-name" value={roadNameInput} onChange={updateName} onCompositionStart={() => { composingRoadName.current = true }} onCompositionEnd={finishRoadNameComposition} placeholder="例如：沈海高速" className="h-9" />
                <p className="text-xs text-muted-foreground">当前最多 {nameLimit} 个字，留空则生成不含路名的编号牌。</p>
              </div>
            </>
          ) : sign.template === 'ordinary-road' ? (
            <>
              <div className="space-y-1.5">
                <Label>道路类型</Label>
                <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
                  {ORDINARY_KIND_OPTIONS.map(option => (
                    <Button key={option.value} variant={sign.kind === option.value ? 'default' : 'ghost'} className="h-8 rounded-sm" onClick={() => onChange({ kind: option.value })}>{option.label}</Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ordinary-road-digits">道路编号</Label>
                <Input id="ordinary-road-digits" value={sign.digits} onChange={updateDigits} placeholder="例如：105" inputMode="numeric" pattern="[0-9]*" maxLength={3} className="h-9" />
                <p className="text-xs text-muted-foreground">自动加前缀：{ORDINARY_KIND_OPTIONS.find(option => option.value === sign.kind)?.prefix ?? 'G'}{sign.digits || '105'}</p>
              </div>
            </>
          ) : sign.template === 'direction-guidance' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="left-direction">左区方向</Label>
                  <DirectionSelect id="left-direction" value={sign.leftDirection} onValueChange={value => onChange({ leftDirection: value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="right-direction">右区方向</Label>
                  <DirectionSelect id="right-direction" value={sign.rightDirection} onValueChange={value => onChange({ rightDirection: value })} />
                </div>
              </div>
              <div className="grid grid-cols-1">
                <div className="space-y-1.5">
                  <Label htmlFor="left-route">左侧编号</Label>
                  {expresswaySignList.length > 0
                    ? <RouteSelect id="left-route" value={sign.leftRoute} selectedSignId={sign.leftRouteSignId} onValueChange={selectLeftRoute} signs={expresswaySignList} />
                    : <Input id="left-route" value={sign.leftRoute} onChange={updateLeftRoute} placeholder="G78" maxLength={5} className="h-9" />
                  }
                </div>
              </div>
            </>
          ) : sign.template === 'entrance-preview-two-directions' ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="right-route">高速编号</Label>
                {expresswaySignList.length > 0
                  ? <RouteSelect id="right-route" value={sign.rightRoute} selectedSignId={sign.rightRouteSignId} onValueChange={selectRightRoute} signs={expresswaySignList} />
                  : <Input id="right-route" value={sign.rightRoute} onChange={updateRightRoute} placeholder="G15" maxLength={5} className="h-9" />
                }
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exit-name">方向一</Label>
                <Input id="exit-name" value={exitNameInput} onChange={updateExitName} onCompositionStart={() => { composingExitField.current = 'name' }} onCompositionEnd={finishExitNameComposition} placeholder="汕头" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="exit-destination">方向二</Label>
                  <InlineSwitch checked={sign.entranceSecondDirectionEnabled} onCheckedChange={checked => onChange({ entranceSecondDirectionEnabled: checked })} />
                </div>
                {sign.entranceSecondDirectionEnabled ? (
                  <Input id="exit-destination" value={exitDestinationInput} onChange={updateExitDestination} onCompositionStart={() => { composingExitField.current = 'destination' }} onCompositionEnd={finishExitDestinationComposition} placeholder="深圳" className="h-9" />
                ) : (
                  <DirectionSelect id="entrance-cardinal-direction" value={sign.entranceCardinalDirection} onValueChange={value => onChange({ entranceCardinalDirection: value })} />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>入口方向</Label>
                <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
                  {ENTRANCE_ARROW_DIRECTION_OPTIONS.map(option => (
                    <Button key={option.value} variant={sign.entranceArrowDirection === option.value ? 'default' : 'ghost'} className="h-8 rounded-sm" onClick={() => onChange({ entranceArrowDirection: option.value })}>{option.label}</Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exit-distance">入口距离 m</Label>
                <Input id="exit-distance" value={sign.exitDistance} onChange={updateEntranceDistance} placeholder="500" inputMode="numeric" maxLength={4} className="h-9" />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="exit-number">出口编号</Label>
                  <Input id="exit-number" value={sign.exitNumber} onChange={updateExitNumber} placeholder="360" inputMode="numeric" maxLength={4} className="h-9" />
                </div>
                {sign.template === 'road-fork-preview' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="exit-distance">距离 km</Label>
                    <Input id="exit-distance" value={sign.exitDistance} onChange={updateExitDistance} placeholder="2" inputMode="decimal" maxLength={5} className="h-9" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="left-route">左侧高速编号</Label>
                  {expresswaySignList.length > 0
                    ? <RouteSelect id="left-route" value={sign.leftRoute} selectedSignId={sign.leftRouteSignId} onValueChange={selectLeftRoute} signs={expresswaySignList} />
                    : <Input id="left-route" value={sign.leftRoute} onChange={updateLeftRoute} placeholder="G72" maxLength={5} className="h-9" />
                  }
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="left-direction">方向</Label>
                  <DirectionSelect id="left-direction" value={sign.leftDirection} onValueChange={value => onChange({ leftDirection: value })} />
                </div>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="right-route">右侧高速编号</Label>
                  {expresswaySignList.length > 0
                    ? <RouteSelect id="right-route" value={sign.rightRoute} selectedSignId={sign.rightRouteSignId} onValueChange={selectRightRoute} signs={expresswaySignList} />
                    : <Input id="right-route" value={sign.rightRoute} onChange={updateRightRoute} placeholder="G80" maxLength={5} className="h-9" />
                  }
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="right-direction">方向</Label>
                  <DirectionSelect id="right-direction" value={sign.rightDirection} onValueChange={value => onChange({ rightDirection: value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exit-name">出口名称</Label>
                <Input id="exit-name" value={exitNameInput} onChange={updateExitName} onCompositionStart={() => { composingExitField.current = 'name' }} onCompositionEnd={finishExitNameComposition} placeholder="柳州" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exit-destination">目的地</Label>
                <Input id="exit-destination" value={exitDestinationInput} onChange={updateExitDestination} onCompositionStart={() => { composingExitField.current = 'destination' }} onCompositionEnd={finishExitDestinationComposition} placeholder="玉林" className="h-9" />
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
