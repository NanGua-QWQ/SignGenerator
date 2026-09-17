import {
  useEffect, useRef, useState, type ChangeEvent, type CompositionEvent,
} from 'react'

import {
  CircleQuestionMark,
} from 'lucide-react'

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select'
import {
  expresswayNameLimit,
} from '@/lib/expressway-name'
import type {
  ExpresswayKind, Sign, SignKind,
} from '@/lib/types'

import {
  DIRECTION_OPTIONS,
  ENTRANCE_ARROW_DIRECTION_OPTIONS,
  ORDINARY_KIND_OPTIONS,
} from '../lib/sign-options'

interface SignSettingsProps {
  sign: Sign
  onChange: (updates: Partial<Sign>) => void
  expresswaySignList?: Sign[]
  ordinaryExitRoadSignList?: Sign[]
}

function DirectionSelect({
  id,
  value,
  onValueChange,
}: {
  id: string
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DIRECTION_OPTIONS.map(direction => <SelectItem key={direction} value={direction}>
          {direction}
        </SelectItem>,
        )}
      </SelectContent>
    </Select>
  )
}

function InlineSwitch({
  checked,
  onCheckedChange,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={event => onCheckedChange(event.target.checked)}
      className="size-3.5 accent-primary"
    />
  )
}

function RouteSelect({
  id,
  value,
  selectedSignId,
  onValueChange,
  signs,
}: {
  id: string
  value: string
  selectedSignId: string
  onValueChange: (sign: Sign) => void
  signs: Sign[]
}) {
  const selectedSign = signs.find(s => s.id === selectedSignId) ?? signs.find(s => s.code === value)
  const selectValue = selectedSign?.id ?? `custom:${value || id}`
  return (
    <Select
      value={selectValue}
      onValueChange={(signId) => {
        const selected = signs.find(s => s.id === signId)
        if (selected) { onValueChange(selected) }
      }}
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {!selectedSign && <SelectItem value={selectValue}>{value}</SelectItem>}
        {signs.map(s => <SelectItem key={s.id} value={s.id}>
          {s.template === 'urban-expressway-road-name' || s.template === 'urban-road-name' ? s.urbanRoadName : s.code}
          {s.template === 'urban-expressway-road-name'
            ? ' 无编号快速路'
            : s.template === 'urban-road-name' ? ' 城市道路' : s.name ? ` ${s.name}` : ''}
        </SelectItem>,
        )}
      </SelectContent>
    </Select>
  )
}

function routeMetadata(sign: Sign | undefined) {
  if (!sign) {
    return {
    }
  }
  return {
    kind: sign.template === 'urban-expressway-road-name'
      ? 'urban-expressway'
      : sign.template === 'urban-road-name' ? 'urban-road' : sign.kind as SignKind,
    provinceLabel: sign.provinceLabel,
    threeDigitDescend: sign.threeDigitDescend,
  }
}

export function SignSettings({
  sign, onChange, expresswaySignList = [], ordinaryExitRoadSignList = [],
}: SignSettingsProps) {
  const nameLimit = expresswayNameLimit(sign.kind as ExpresswayKind, sign.digits)
  const exitNameLimit = sign.template === 'dual-direction-exit-preview'
    || sign.template === 'ordinary-road-exit' ? 12 : 6
  const exitDestinationLimit = sign.template === 'dual-direction-exit-preview'
    || sign.template === 'urban-expressway-exit-preview' ? 12 : 8
  const composingRoadName = useRef(false)
  const composingExitField = useRef<'name' | 'destination' | null>(null)
  const [roadDigitsInput, setRoadDigitsInput] = useState(sign.digits)
  const [roadDigitsError, setRoadDigitsError] = useState('')
  const [roadNameInput, setRoadNameInput] = useState(sign.name)
  const [exitNameInput, setExitNameInput] = useState(sign.exitName)
  const [exitDestinationInput, setExitDestinationInput] = useState(sign.exitDestination)
  const [urbanRoadNameInput, setUrbanRoadNameInput] = useState(sign.urbanRoadName)
  const [urbanDestinationInput, setUrbanDestinationInput] = useState(sign.urbanDestination)

  // Keep local drafts synchronized with external sign changes, including IME composition.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    switch (sign.template) {
      case 'expressway':
      case 'ordinary-road':
      case 'ordinary-road-exit':
        setRoadDigitsInput(sign.digits)
        setRoadDigitsError('')
        break
    }
    if (!composingRoadName.current) { setRoadNameInput(sign.name) }
    if (composingExitField.current !== 'name') { setExitNameInput(sign.exitName) }
    if (composingExitField.current !== 'destination') { setExitDestinationInput(sign.exitDestination) }
    setUrbanRoadNameInput(sign.urbanRoadName)
    setUrbanDestinationInput(sign.urbanDestination)
  }, [
    sign.digits,
    sign.exitDestination,
    sign.exitName,
    sign.id,
    sign.name,
    sign.template,
    sign.urbanDestination,
    sign.urbanRoadName,
  ])
  /* eslint-enable react-hooks/set-state-in-effect */

  function updateDigits(event: ChangeEvent<HTMLInputElement>) {
    const maxLength = sign.template === 'ordinary-road'
      || sign.template === 'ordinary-road-exit' && (
        sign.kind === 'ordinary-national'
        || sign.kind === 'ordinary-provincial'
        || sign.kind === 'ordinary-county'
        || sign.kind === 'ordinary-township'
      ) ? 3 : 4
    const digits = event.target.value.replace(/\D/g, '').slice(0, maxLength)
    setRoadDigitsInput(digits)
    switch (sign.template) {
      case 'expressway':
      case 'ordinary-road':
      case 'ordinary-road-exit':
        if (!digits) {
          setRoadDigitsError('不能为空')
          return
        }
        break
    }
    setRoadDigitsError('')
    onChange({
      digits,
      ordinaryExitRoadSignId: sign.template === 'ordinary-road-exit' ? '' : undefined,
    })
  }

  function updateName(event: ChangeEvent<HTMLInputElement>) {
    setRoadNameInput(event.target.value)
    if (composingRoadName.current) { return }
    onChange({
      name: Array.from(event.target.value).slice(0, nameLimit).join(''),
    })
  }

  function updateUrbanRoadName(event: ChangeEvent<HTMLInputElement>) {
    const value = Array.from(event.target.value).slice(0, 24).join('')
    setUrbanRoadNameInput(value)
    onChange({
      urbanRoadName: value,
      ordinaryExitRoadSignId: sign.template === 'ordinary-road-exit' ? '' : undefined,
    })
  }

  function updateUrbanDestination(event: ChangeEvent<HTMLInputElement>) {
    const limit = sign.template === 'urban-expressway-exit-preview' ? 12 : 10
    const value = Array.from(event.target.value).slice(0, limit).join('')
    setUrbanDestinationInput(value)
    onChange({
      urbanDestination: value,
    })
  }

  function finishRoadNameComposition(event: CompositionEvent<HTMLInputElement>) {
    composingRoadName.current = false
    const value = Array.from(event.currentTarget.value).slice(0, nameLimit).join('')
    setRoadNameInput(value)
    onChange({
      name: value,
    })
  }

  function updateProvinceLabel(event: ChangeEvent<HTMLInputElement>) {
    onChange({
      provinceLabel: Array.from(event.target.value.trim()).slice(0, 1).join(''),
    })
  }

  function updateExitNumber(event: ChangeEvent<HTMLInputElement>) {
    onChange({
      exitNumber: event.target.value.replace(/\D/g, '').slice(0, 4),
    })
  }

  function updateExitDistance(event: ChangeEvent<HTMLInputElement>) {
    onChange({
      exitDistance: event.target.value
        .replace(/[^\d.]/g, '')
        .replace(/(\..*)\./g, '$1')
        .slice(0, 5),
    })
  }

  function updateEntranceDistance(event: ChangeEvent<HTMLInputElement>) {
    onChange({
      exitDistance: event.target.value.replace(/\D/g, '').slice(0, 4),
    })
  }

  function updateExitName(event: ChangeEvent<HTMLInputElement>) {
    setExitNameInput(event.target.value)
    if (composingExitField.current === 'name') { return }
    onChange({
      exitName: Array.from(event.target.value).slice(0, exitNameLimit).join(''),
    })
  }

  function updateExitDestination(event: ChangeEvent<HTMLInputElement>) {
    setExitDestinationInput(event.target.value)
    if (composingExitField.current === 'destination') { return }
    onChange({
      exitDestination: Array.from(event.target.value).slice(0, exitDestinationLimit).join(''),
    })
  }

  function finishExitNameComposition(event: CompositionEvent<HTMLInputElement>) {
    composingExitField.current = null
    const value = Array.from(event.currentTarget.value).slice(0, exitNameLimit).join('')
    setExitNameInput(value)
    onChange({
      exitName: value,
    })
  }

  function finishExitDestinationComposition(event: CompositionEvent<HTMLInputElement>) {
    composingExitField.current = null
    const value = Array.from(event.currentTarget.value).slice(0, exitDestinationLimit).join('')
    setExitDestinationInput(value)
    onChange({
      exitDestination: value,
    })
  }

  function updateLeftRoute(event: ChangeEvent<HTMLInputElement>) {
    onChange({
      leftRoute: event.target.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 5),
      leftRouteSignId: '',
      leftRouteKind: undefined,
      leftRouteProvinceLabel: undefined,
      leftRouteThreeDigitDescend: undefined,
    })
  }

  function updateRightRoute(event: ChangeEvent<HTMLInputElement>) {
    onChange({
      rightRoute: event.target.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 5),
      rightRouteSignId: '',
      rightRouteKind: undefined,
      rightRouteProvinceLabel: undefined,
      rightRouteThreeDigitDescend: undefined,
    })
  }

  function selectLeftRoute(selected: Sign) {
    const metadata = routeMetadata(selected)
    onChange({
      leftRoute: selected.template === 'urban-expressway-road-name' ? selected.urbanRoadName : selected.code,
      leftRouteSignId: selected.id,
      leftRouteKind: metadata.kind,
      leftRouteProvinceLabel: metadata.provinceLabel,
      leftRouteThreeDigitDescend: metadata.threeDigitDescend,
    })
  }

  function selectRightRoute(selected: Sign) {
    const metadata = routeMetadata(selected)
    onChange({
      rightRoute: selected.template === 'urban-expressway-road-name' ? selected.urbanRoadName : selected.code,
      rightRouteSignId: selected.id,
      rightRouteKind: metadata.kind,
      rightRouteProvinceLabel: metadata.provinceLabel,
      rightRouteThreeDigitDescend: metadata.threeDigitDescend,
    })
  }

  function updateExpresswayKind(kind: ExpresswayKind) {
    const prefix = kind === 'national' ? 'G' : 'S'
    onChange({
      kind,
      code: `${prefix}${sign.digits}`,
      provinceLabel: kind === 'provincial' ? sign.provinceLabel || '粤' : '',
    })
  }

  function selectOrdinaryExitRouteKind(kind: 'expressway' | 'urban-expressway' | 'urban-road') {
    if (kind === 'expressway') {
      onChange({
        kind: 'national',
        ordinaryExitRoadSignId: '',
      })
      return
    }
    onChange({
      kind,
      ordinaryExitRoadSignId: '',
    })
  }

  function selectOrdinaryExitRoadSign(selected: Sign) {
    const metadata = routeMetadata(selected)
    onChange({
      kind: metadata.kind,
      code: selected.code,
      digits: selected.digits,
      provinceLabel: metadata.provinceLabel,
      threeDigitDescend: metadata.threeDigitDescend,
      urbanRoadName: selected.urbanRoadName,
      ordinaryExitRoadSignId: selected.id,
    })
  }

  let settingName: string
  switch (sign.template) {
    case 'entrance-preview-two-directions':
    case 'standard-exit-sign':
    case 'ordinary-road-exit':
      settingName = '出入口指引设置'
      break
    case 'direction-guidance':
    case 'road-fork-preview':
    case 'two-lane-interchange-exit':
    case 'dual-exit-interchange-preview':
    case 'dual-direction-exit-preview':
      settingName = '立交枢纽指引设置'
      break
    case 'urban-expressway-exit-preview':
    case 'urban-expressway-entrance-preview':
      settingName = '出入口指引设置'
      break
    default:
      settingName = '道路名称标识设置'
      break
  }
  return (
    <aside className="h-full overflow-y-auto border-l bg-background max-lg:border-l-0 max-lg:border-t">
      <div className="p-4">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {settingName}
        </h2>
        <div className="flex flex-col gap-4">
          {sign.template === 'expressway' ? <>
            <div className="space-y-1.5">
              <Label>高速类型</Label>
              <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
                <Button
                  variant={sign.kind === 'national' ? 'default' : 'ghost'}
                  className="h-8 rounded-sm"
                  onClick={() => updateExpresswayKind('national')}
                >
                  国家高速
                </Button>
                <Button
                  variant={sign.kind === 'provincial' ? 'default' : 'ghost'}
                  className="h-8 rounded-sm"
                  onClick={() => updateExpresswayKind('provincial')}
                >
                  省高速
                </Button>
                <Button
                  variant={sign.kind === 'beijing-tianjin-hebei' ? 'default' : 'ghost'}
                  className="col-span-2 h-8 rounded-sm px-1 text-xs whitespace-nowrap"
                  onClick={() => updateExpresswayKind('beijing-tianjin-hebei')}
                >
                  京津冀高速
                </Button>
              </div>
            </div>
            <div
              className={`grid gap-3 ${sign.kind === 'provincial' ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : 'grid-cols-1'}`}
            >
              {sign.kind === 'provincial'
                && <div className="space-y-1.5">
                  <Label htmlFor="province-label">省高速简称</Label>
                  <Input
                    id="province-label"
                    value={sign.provinceLabel}
                    onChange={updateProvinceLabel}
                    placeholder="粤"
                    maxLength={1}
                    className="h-9"
                  />
                </div>
              }
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="road-digits">道路编号</Label>
                  {sign.digits.length === 3
                    && <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={sign.threeDigitDescend}
                        onChange={event => onChange({
                          threeDigitDescend: event.target.checked,
                        })}
                        className="size-3.5 accent-primary"
                      />
                      下沉
                    </label>
                  }
                </div>
                <Input
                  id="road-digits"
                  value={roadDigitsInput}
                  onChange={updateDigits}
                  placeholder="1、15、105 或 0421"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  aria-invalid={Boolean(roadDigitsError)}
                  aria-describedby="road-digits-message"
                  className="h-9"
                />
              </div>
              <p
                id="road-digits-message"
                className={`${sign.kind === 'provincial' ? 'col-span-2' : ''} text-xs text-muted-foreground`}
              >
                {roadDigitsError ? <span className="text-destructive">{roadDigitsError}</span> : '只输入数字，支持 1-4 位编号。'
                }
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="road-name">高速名称</Label>
              <Input
                id="road-name"
                value={roadNameInput}
                onChange={updateName}
                onCompositionStart={() => {
                  composingRoadName.current = true
                }}
                onCompositionEnd={finishRoadNameComposition}
                placeholder="例如：沈海高速"
                maxLength={nameLimit}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                当前最多 {nameLimit} 个字，留空则生成不含路名的编号牌。
              </p>
            </div>
          </> : sign.template === 'urban-expressway-road-name' || sign.template === 'urban-road-name' ? <>
            <div className="space-y-1.5">
              <Label htmlFor="urban-road-name">道路名称</Label>
              <Input
                id="urban-road-name"
                value={urbanRoadNameInput}
                onChange={updateUrbanRoadName}
                placeholder={sign.template === 'urban-road-name' ? '南京路' : '北四环'}
                maxLength={24}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                {sign.template === 'urban-road-name'
                  ? '最多 24 个字；长路名自动缩小并按两行排版。'
                  : '最多 24 个字；长路名自动缩小。'}
              </p>
            </div>
            {sign.template === 'urban-road-name' && <>
              <div className="space-y-1.5">
                <Label>标志样式</Label>
                <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
                  {([
                    ['plain', '无图形'],
                    ['right-chevron', '右向尖角'],
                    ['bidirectional', '双向尖角'],
                    ['straight-text', '直行＋路名'],
                    ['straight-route', '直行＋编号牌'],
                  ] as const).map(([value, label]) => <Button
                    key={value}
                    variant={sign.urbanRoadStyle === value ? 'default' : 'ghost'}
                    className="h-8 rounded-sm text-xs"
                    onClick={() => onChange({
                      urbanRoadStyle: value,
                    })}
                  >
                    {label}
                  </Button>)}
                </div>
              </div>
              {sign.urbanRoadStyle === 'straight-route' && <div className="space-y-1.5">
                <Label htmlFor="urban-road-route-sign">道路编号牌</Label>
                <Select
                  value={sign.urbanRoadRouteSignId || 'reference-s206'}
                  onValueChange={value => onChange({
                    urbanRoadRouteSignId: value === 'reference-s206' ? '' : value,
                  })}
                >
                  <SelectTrigger id="urban-road-route-sign">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reference-s206">S206（参考样式）</SelectItem>
                    {ordinaryExitRoadSignList
                      .filter(item => item.template === 'expressway' || item.template === 'ordinary-road')
                      .map(item => <SelectItem key={item.id} value={item.id}>
                        {item.code}{item.name ? ` ${item.name}` : ''}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  支持高速、国道、省道、县道和乡道编号牌。
                </p>
              </div>}
            </>}
          </> : sign.template === 'ordinary-road' ? <>
            <div className="space-y-1.5">
              <Label>道路类型</Label>
              <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
                {ORDINARY_KIND_OPTIONS.map(option => <Button
                  key={option.value}
                  variant={sign.kind === option.value ? 'default' : 'ghost'}
                  className="h-8 rounded-sm"
                  onClick={() => onChange({
                    kind: option.value,
                  })}
                >
                  {option.label}
                </Button>,
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ordinary-road-digits">道路编号</Label>
              <Input
                id="ordinary-road-digits"
                value={roadDigitsInput}
                onChange={updateDigits}
                placeholder="例如：105"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                aria-invalid={Boolean(roadDigitsError)}
                aria-describedby="ordinary-road-digits-message"
                className="h-9"
              />
              <p id="ordinary-road-digits-message" className="text-xs text-muted-foreground">
                {roadDigitsError ? <span className="text-destructive">{roadDigitsError}</span> : <>
                  自动加前缀：
                  {ORDINARY_KIND_OPTIONS.find(option => option.value === sign.kind)?.prefix
                    ?? 'G'}
                  {sign.digits || '105'}
                </>
                }
              </p>
            </div>
          </> : sign.template === 'direction-guidance' ? <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="left-direction">左区方向</Label>
                <DirectionSelect
                  id="left-direction"
                  value={sign.leftDirection}
                  onValueChange={value => onChange({
                    leftDirection: value,
                  })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="right-direction">右区方向</Label>
                <DirectionSelect
                  id="right-direction"
                  value={sign.rightDirection}
                  onValueChange={value => onChange({
                    rightDirection: value,
                  })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1">
              <div className="space-y-1.5">
                <Label htmlFor="left-route">左侧编号</Label>
                {expresswaySignList.length > 0 ? <RouteSelect
                  id="left-route"
                  value={sign.leftRoute}
                  selectedSignId={sign.leftRouteSignId}
                  onValueChange={selectLeftRoute}
                  signs={expresswaySignList}
                /> : <Input
                  id="left-route"
                  value={sign.leftRoute}
                  onChange={updateLeftRoute}
                  placeholder="G78"
                  maxLength={5}
                  className="h-9"
                />
                }
              </div>
            </div>
          </> : sign.template === 'urban-expressway-exit-preview' ? <>
            <div className="space-y-1.5">
              <Label htmlFor="urban-road-name">道路名称</Label>
              <Input
                id="urban-road-name"
                value={urbanRoadNameInput}
                onChange={updateUrbanRoadName}
                placeholder="南北高架路"
                maxLength={12}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="urban-direction">方向标识</Label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <InlineSwitch
                    checked={sign.urbanExitDirectionVisible}
                    onCheckedChange={checked => onChange({
                      urbanExitDirectionVisible: checked,
                    })}
                  />
                  显示
                </label>
              </div>
              {sign.urbanExitDirectionVisible && <DirectionSelect
                id="urban-direction"
                value={sign.urbanDirection}
                onValueChange={value => onChange({
                  urbanDirection: value,
                })}
              />}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="urban-destination">目标道路</Label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <InlineSwitch
                    checked={sign.urbanExitDestinationDirectionVisible}
                    onCheckedChange={checked => onChange({
                      urbanExitDestinationDirectionVisible: checked,
                    })}
                  />
                  显示“方向”
                </label>
              </div>
              <Input
                id="urban-destination"
                value={urbanDestinationInput}
                onChange={updateUrbanDestination}
                placeholder="共和新路立交"
                maxLength={12}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="urban-exit-second-destination">目标道路二</Label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <InlineSwitch
                    checked={sign.urbanExitSecondDestinationVisible}
                    onCheckedChange={checked => onChange({
                      urbanExitSecondDestinationVisible: checked,
                    })}
                  />
                  显示
                </label>
              </div>
              {sign.urbanExitSecondDestinationVisible && <Input
                id="urban-exit-second-destination"
                value={exitDestinationInput}
                onChange={updateExitDestination}
                onCompositionStart={() => {
                  composingExitField.current = 'destination'
                }}
                onCompositionEnd={finishExitDestinationComposition}
                placeholder="沪太路"
                maxLength={12}
                className="h-9"
              />}
            </div>
            <div className="space-y-1.5">
              <Label>出口箭头</Label>
              <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
                {ENTRANCE_ARROW_DIRECTION_OPTIONS.map(option => <Button
                  key={option.value}
                  variant={sign.entranceArrowDirection === option.value ? 'default' : 'ghost'}
                  className="h-8 rounded-sm"
                  onClick={() => onChange({
                    entranceArrowDirection: option.value,
                  })}
                >
                  {option.label === '前' ? '向前' : option.label === '右' ? '右出' : '左出'}
                </Button>,
                )}
              </div>
            </div>
          </> : sign.template === 'urban-expressway-entrance-preview' ? <>
            <div className="space-y-1.5">
              <Label htmlFor="urban-road-name">道路名称</Label>
              <Input
                id="urban-road-name"
                value={urbanRoadNameInput}
                onChange={updateUrbanRoadName}
                placeholder="九水路"
                maxLength={12}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="urban-destination">目的地一</Label>
              <Input
                id="urban-destination"
                value={urbanDestinationInput}
                onChange={updateUrbanDestination}
                placeholder="李沧"
                maxLength={10}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exit-destination">目的地二</Label>
              <Input
                id="exit-destination"
                value={exitDestinationInput}
                onChange={updateExitDestination}
                onCompositionStart={() => {
                  composingExitField.current = 'destination'
                }}
                onCompositionEnd={finishExitDestinationComposition}
                placeholder="崂山"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exit-distance">入口距离 m</Label>
              <Input
                id="exit-distance"
                value={sign.exitDistance}
                onChange={updateEntranceDistance}
                placeholder="500"
                inputMode="numeric"
                maxLength={4}
                className="h-9"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <InlineSwitch
                checked={sign.urbanEntranceDistanceVisible}
                onCheckedChange={checked => onChange({
                  urbanEntranceDistanceVisible: checked,
                })}
              />
              显示入口距离
            </label>
          </> : sign.template === 'ordinary-road-exit' ? <>
            <div className="space-y-1.5">
              <Label>内容类型</Label>
              <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
                <Button variant={sign.ordinaryExitContentMode === 'text' ? 'default' : 'ghost'} className="h-8 rounded-sm" onClick={() => onChange({
                  ordinaryExitContentMode: 'text',
                })}>
                  纯文字
                </Button>
                <Button variant={sign.ordinaryExitContentMode === 'road-code' ? 'default' : 'ghost'} className="h-8 rounded-sm" onClick={() => onChange({
                  ordinaryExitContentMode: 'road-code',
                })}>
                  普通道路编号
                </Button>
              </div>
            </div>
            {sign.ordinaryExitContentMode === 'text' ? <div className="space-y-1.5">
              <Label htmlFor="exit-name">道路名称</Label>
              <Input
                id="exit-name"
                value={exitNameInput}
                onChange={updateExitName}
                onCompositionStart={() => {
                  composingExitField.current = 'name'
                }}
                onCompositionEnd={finishExitNameComposition}
                placeholder="宝杨路"
                maxLength={exitNameLimit}
                className="h-9"
              />
            </div> : <>
              {ordinaryExitRoadSignList.length > 0 && <div className="space-y-1.5">
                <Label htmlFor="ordinary-exit-road-source">沿用道路名称标识</Label>
                <RouteSelect
                  id="ordinary-exit-road-source"
                  value={sign.kind === 'urban-expressway' || sign.kind === 'urban-road' ? sign.urbanRoadName : sign.code}
                  selectedSignId={sign.ordinaryExitRoadSignId}
                  onValueChange={selectOrdinaryExitRoadSign}
                  signs={ordinaryExitRoadSignList}
                />
              </div>}
              <div className="space-y-1.5">
                <Label>道路类型</Label>
                <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
                  {ORDINARY_KIND_OPTIONS.map(option => <Button
                    key={option.value}
                    variant={sign.kind === option.value ? 'default' : 'ghost'}
                    className="h-8 rounded-sm"
                    onClick={() => onChange({
                      kind: option.value,
                      ordinaryExitRoadSignId: '',
                    })}
                  >
                    {option.label}
                  </Button>,
                  )}
                  <Button
                    variant={sign.kind === 'national' || sign.kind === 'provincial' || sign.kind === 'beijing-tianjin-hebei' ? 'default' : 'ghost'}
                    className="h-8 rounded-sm"
                    onClick={() => selectOrdinaryExitRouteKind('expressway')}
                  >
                    高速
                  </Button>
                  <Button
                    variant={sign.kind === 'urban-expressway' ? 'default' : 'ghost'}
                    className="h-8 rounded-sm"
                    onClick={() => selectOrdinaryExitRouteKind('urban-expressway')}
                  >
                    快速路
                  </Button>
                  <Button
                    variant={sign.kind === 'urban-road' ? 'default' : 'ghost'}
                    className="h-8 rounded-sm"
                    onClick={() => selectOrdinaryExitRouteKind('urban-road')}
                  >
                    城市道路
                  </Button>
                </div>
              </div>
              {sign.kind === 'urban-expressway' || sign.kind === 'urban-road' ? <div className="space-y-1.5">
                <Label htmlFor="ordinary-exit-urban-road-name">道路名称</Label>
                <Input
                  id="ordinary-exit-urban-road-name"
                  value={urbanRoadNameInput}
                  onChange={updateUrbanRoadName}
                  placeholder={sign.kind === 'urban-road' ? '南京路' : '北四环'}
                  maxLength={sign.kind === 'urban-road' ? 10 : 12}
                  className="h-9"
                />
              </div> : <div className="space-y-1.5">
                <Label htmlFor="ordinary-exit-digits">道路编号</Label>
                <Input
                  id="ordinary-exit-digits"
                  value={roadDigitsInput}
                  onChange={updateDigits}
                  placeholder={sign.kind === 'ordinary-national' || sign.kind === 'ordinary-provincial' || sign.kind === 'ordinary-county' || sign.kind === 'ordinary-township' ? '例如：105' : '例如：15 或 0421'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={sign.kind === 'ordinary-national' || sign.kind === 'ordinary-provincial' || sign.kind === 'ordinary-county' || sign.kind === 'ordinary-township' ? 3 : 4}
                  aria-invalid={Boolean(roadDigitsError)}
                  className="h-9"
                />
              </div>}
            </>}
            <div className="space-y-1.5">
              <Label>背景颜色</Label>
              <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
                <Button variant={sign.ordinaryExitBackground === 'blue' ? 'default' : 'ghost'} className="h-8 rounded-sm" onClick={() => onChange({
                  ordinaryExitBackground: 'blue',
                })}>
                  蓝色
                </Button>
                <Button variant={sign.ordinaryExitBackground === 'green' ? 'default' : 'ghost'} className="h-8 rounded-sm" onClick={() => onChange({
                  ordinaryExitBackground: 'green',
                })}>
                  绿色
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>出口方向</Label>
              <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
                {ENTRANCE_ARROW_DIRECTION_OPTIONS.map(option => <Button
                  key={option.value}
                  variant={sign.entranceArrowDirection === option.value ? 'default' : 'ghost'}
                  className="h-8 rounded-sm"
                  onClick={() => onChange({
                    entranceArrowDirection: option.value,
                  })}
                >
                  {option.label}
                </Button>,
                )}
              </div>
            </div>
          </> : sign.template === 'standard-exit-sign' ? <>
            <div className="space-y-1.5">
              <Label htmlFor="exit-number">出口编号</Label>
              <Input
                id="exit-number"
                value={sign.exitNumber}
                onChange={updateExitNumber}
                placeholder="50"
                inputMode="numeric"
                maxLength={4}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="right-route">道路编号</Label>
              {expresswaySignList.length > 0 ? <RouteSelect
                id="right-route"
                value={sign.rightRoute}
                selectedSignId={sign.rightRouteSignId}
                onValueChange={selectRightRoute}
                signs={expresswaySignList}
              /> : <Input
                id="right-route"
                value={sign.rightRoute}
                onChange={updateRightRoute}
                placeholder="G15"
                maxLength={12}
                className="h-9"
              />
              }
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exit-name">目的地一</Label>
              <Input
                id="exit-name"
                value={exitNameInput}
                onChange={updateExitName}
                onCompositionStart={() => {
                  composingExitField.current = 'name'
                }}
                onCompositionEnd={finishExitNameComposition}
                placeholder="日照"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exit-destination">目的地二</Label>
              <Input
                id="exit-destination"
                value={exitDestinationInput}
                onChange={updateExitDestination}
                onCompositionStart={() => {
                  composingExitField.current = 'destination'
                }}
                onCompositionEnd={finishExitDestinationComposition}
                placeholder="济宁"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label>出口方向</Label>
              <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
                {ENTRANCE_ARROW_DIRECTION_OPTIONS.map(option => <Button
                  key={option.value}
                  variant={sign.entranceArrowDirection === option.value ? 'default' : 'ghost'}
                  className="h-8 rounded-sm"
                  onClick={() => onChange({
                    entranceArrowDirection: option.value,
                  })}
                >
                  {option.label}
                </Button>,
                )}
              </div>
            </div>
          </> : sign.template === 'entrance-preview-two-directions' ? <>
            <div className="space-y-1.5">
              <Label htmlFor="right-route">高速编号</Label>
              {expresswaySignList.length > 0 ? <RouteSelect
                id="right-route"
                value={sign.rightRoute}
                selectedSignId={sign.rightRouteSignId}
                onValueChange={selectRightRoute}
                signs={expresswaySignList}
              /> : <Input
                id="right-route"
                value={sign.rightRoute}
                onChange={updateRightRoute}
                placeholder="G15"
                maxLength={5}
                className="h-9"
              />
              }
            </div>
            {sign.entranceSecondDirectionEnabled && <div className="space-y-1.5">
              <Label>高速方位角标</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2 rounded-md border p-2">
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <InlineSwitch
                      checked={sign.entranceLeftCardinalDirectionVisible}
                      onCheckedChange={entranceLeftCardinalDirectionVisible => onChange({
                        entranceLeftCardinalDirectionVisible,
                      })}
                    />
                    左侧
                  </Label>
                  {sign.entranceLeftCardinalDirectionVisible && <DirectionSelect
                    id="entrance-left-cardinal-direction"
                    value={sign.entranceLeftCardinalDirection}
                    onValueChange={entranceLeftCardinalDirection => onChange({
                      entranceLeftCardinalDirection,
                    })}
                  />}
                </div>
                <div className="space-y-2 rounded-md border p-2">
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <InlineSwitch
                      checked={sign.entranceRightCardinalDirectionVisible}
                      onCheckedChange={entranceRightCardinalDirectionVisible => onChange({
                        entranceRightCardinalDirectionVisible,
                      })}
                    />
                    右侧
                  </Label>
                  {sign.entranceRightCardinalDirectionVisible && <DirectionSelect
                    id="entrance-right-cardinal-direction"
                    value={sign.entranceRightCardinalDirection}
                    onValueChange={entranceRightCardinalDirection => onChange({
                      entranceRightCardinalDirection,
                    })}
                  />}
                </div>
              </div>
            </div>}
            <div className="space-y-1.5">
              <Label htmlFor="exit-name">方向一</Label>
              <Input
                id="exit-name"
                value={exitNameInput}
                onChange={updateExitName}
                onCompositionStart={() => {
                  composingExitField.current = 'name'
                }}
                onCompositionEnd={finishExitNameComposition}
                placeholder="汕头"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="exit-destination">方向二</Label>
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <InlineSwitch
                    checked={sign.entranceSecondDirectionEnabled}
                    onCheckedChange={checked => onChange({
                      entranceSecondDirectionEnabled: checked,
                    })
                    }
                  />
                  单方向
                  <CircleQuestionMark style={{
                    width: 12,
                    height: 12,
                  }} />
                </Label>
              </div>
              {sign.entranceSecondDirectionEnabled ? <Input
                id="exit-destination"
                value={exitDestinationInput}
                onChange={updateExitDestination}
                onCompositionStart={() => {
                  composingExitField.current = 'destination'
                }}
                onCompositionEnd={finishExitDestinationComposition}
                placeholder="深圳"
                className="h-9"
              /> : <DirectionSelect
                id="entrance-cardinal-direction"
                value={sign.entranceCardinalDirection}
                onValueChange={value => onChange({
                  entranceCardinalDirection: value,
                })}
              />
              }
            </div>
            <div className="space-y-1.5">
              <Label>入口方向</Label>
              <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
                {ENTRANCE_ARROW_DIRECTION_OPTIONS.map(option => <Button
                  key={option.value}
                  variant={sign.entranceArrowDirection === option.value ? 'default' : 'ghost'}
                  className="h-8 rounded-sm"
                  onClick={() => onChange({
                    entranceArrowDirection: option.value,
                  })}
                >
                  {option.label}
                </Button>,
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="exit-distance">入口距离</Label>
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <InlineSwitch
                    checked={sign.entranceDistanceVisible}
                    onCheckedChange={entranceDistanceVisible => onChange({
                      entranceDistanceVisible,
                    })}
                  />
                  显示距离
                </Label>
              </div>
              {sign.entranceDistanceVisible && <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-2">
                <Input
                  id="exit-distance"
                  value={sign.exitDistance}
                  onChange={updateEntranceDistance}
                  placeholder="500"
                  inputMode="numeric"
                  maxLength={4}
                  className="h-9"
                />
                <Select
                  value={sign.entranceDistanceUnit}
                  onValueChange={(entranceDistanceUnit: Sign['entranceDistanceUnit']) => onChange({
                    entranceDistanceUnit,
                  })}
                >
                  <SelectTrigger aria-label="入口距离单位" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m">m</SelectItem>
                    <SelectItem value="km">km</SelectItem>
                  </SelectContent>
                </Select>
              </div>}
            </div>
          </> : sign.template === 'dual-exit-interchange-preview' ? <>
            <div className="space-y-1.5">
              <Label htmlFor="left-route">上方高速编号</Label>
              {expresswaySignList.length > 0 ? <RouteSelect
                id="left-route"
                value={sign.leftRoute}
                selectedSignId={sign.leftRouteSignId}
                onValueChange={selectLeftRoute}
                signs={expresswaySignList}
              /> : <Input
                id="left-route"
                value={sign.leftRoute}
                onChange={updateLeftRoute}
                placeholder="G55"
                maxLength={5}
                className="h-9"
              />
              }
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exit-name">上方目的地</Label>
              <Input
                id="exit-name"
                value={exitNameInput}
                onChange={updateExitName}
                onCompositionStart={() => {
                  composingExitField.current = 'name'
                }}
                onCompositionEnd={finishExitNameComposition}
                placeholder="永州"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="right-route">下方高速编号</Label>
              {expresswaySignList.length > 0 ? <RouteSelect
                id="right-route"
                value={sign.rightRoute}
                selectedSignId={sign.rightRouteSignId}
                onValueChange={selectRightRoute}
                signs={expresswaySignList}
              /> : <Input
                id="right-route"
                value={sign.rightRoute}
                onChange={updateRightRoute}
                placeholder="G55"
                maxLength={5}
                className="h-9"
              />
              }
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exit-destination">下方目的地</Label>
              <Input
                id="exit-destination"
                value={exitDestinationInput}
                onChange={updateExitDestination}
                onCompositionStart={() => {
                  composingExitField.current = 'destination'
                }}
                onCompositionEnd={finishExitDestinationComposition}
                placeholder="广州"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exit-distance">距离 km</Label>
              <Input
                id="exit-distance"
                value={sign.exitDistance}
                onChange={updateExitDistance}
                placeholder="3"
                inputMode="decimal"
                maxLength={5}
                className="h-9"
              />
            </div>
          </> : <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exit-number">出口编号</Label>
                <Input
                  id="exit-number"
                  value={sign.exitNumber}
                  onChange={updateExitNumber}
                  placeholder="360"
                  inputMode="numeric"
                  maxLength={4}
                  className="h-9"
                />
              </div>
              {sign.template === 'road-fork-preview'
                && <div className="space-y-1.5">
                  <Label htmlFor="exit-distance">距离 km</Label>
                  <Input
                    id="exit-distance"
                    value={sign.exitDistance}
                    onChange={updateExitDistance}
                    placeholder="2"
                    inputMode="decimal"
                    maxLength={5}
                    className="h-9"
                  />
                </div>
              }
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="left-route">左侧高速编号</Label>
                {expresswaySignList.length > 0 ? <RouteSelect
                  id="left-route"
                  value={sign.leftRoute}
                  selectedSignId={sign.leftRouteSignId}
                  onValueChange={selectLeftRoute}
                  signs={expresswaySignList}
                /> : <Input
                  id="left-route"
                  value={sign.leftRoute}
                  onChange={updateLeftRoute}
                  placeholder="G72"
                  maxLength={5}
                  className="h-9"
                />
                }
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="left-direction">方向</Label>
                <DirectionSelect
                  id="left-direction"
                  value={sign.leftDirection}
                  onValueChange={value => onChange({
                    leftDirection: value,
                  })}
                />
              </div>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="right-route">右侧高速编号</Label>
                {expresswaySignList.length > 0 ? <RouteSelect
                  id="right-route"
                  value={sign.rightRoute}
                  selectedSignId={sign.rightRouteSignId}
                  onValueChange={selectRightRoute}
                  signs={expresswaySignList}
                /> : <Input
                  id="right-route"
                  value={sign.rightRoute}
                  onChange={updateRightRoute}
                  placeholder="G80"
                  maxLength={5}
                  className="h-9"
                />
                }
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="right-direction">方向</Label>
                <DirectionSelect
                  id="right-direction"
                  value={sign.rightDirection}
                  onValueChange={value => onChange({
                    rightDirection: value,
                  })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exit-name">出口名称</Label>
              <Input
                id="exit-name"
                value={exitNameInput}
                onChange={updateExitName}
                onCompositionStart={() => {
                  composingExitField.current = 'name'
                }}
                onCompositionEnd={finishExitNameComposition}
                placeholder="柳州"
                maxLength={exitNameLimit}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exit-destination">目的地</Label>
              <Input
                id="exit-destination"
                value={exitDestinationInput}
                onChange={updateExitDestination}
                onCompositionStart={() => {
                  composingExitField.current = 'destination'
                }}
                onCompositionEnd={finishExitDestinationComposition}
                placeholder="玉林"
                maxLength={exitDestinationLimit}
                className="h-9"
              />
            </div>
          </>
          }
        </div>
      </div>
    </aside>
  )
}
