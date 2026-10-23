import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, Plus, Trash2,
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/select'
import type {
  FreeCardinalDirection, FreeSignConfig, FreeSignElement, FreeSignRow, Sign,
} from '@/lib/types'

interface FreeModeSettingsProps {
  sign: Sign
  roadSignList: Sign[]
  onChange: (updates: Partial<Sign>) => void
}

const VARIANTS: { value: FreeSignConfig['variant']; label: string }[] = [
  {
    value: 'custom',
    label: '自由模式',
  },
  {
    value: 'left-exit-down',
    label: '左出口 ↙',
  },
  {
    value: 'left-exit-up',
    label: '左出口 ↖',
  },
  {
    value: 'straight',
    label: '直行 ↑',
  },
  {
    value: 'lane-guidance',
    label: '车道指引 ↓',
  },
  {
    value: 'right-exit-down',
    label: '右出口 ↘',
  },
  {
    value: 'right-exit-up',
    label: '右出口 ↗',
  },
]

const BACKGROUNDS: { value: FreeSignConfig['background']; label: string; color: string }[] = [
  {
    value: 'green',
    label: '绿色',
    color: '#359b47',
  },
  {
    value: 'blue',
    label: '蓝色',
    color: '#1769aa',
  },
  {
    value: 'brown',
    label: '棕色',
    color: '#8a5a36',
  },
]

const ARROWS: { value: FreeSignElement['arrowDirection']; label: string }[] = [
  {
    value: 'front',
    label: '直行 ↑',
  },
  {
    value: 'down',
    label: '向下 ↓',
  },
  {
    value: 'left-up',
    label: '左上 ↖',
  },
  {
    value: 'left-down',
    label: '左下 ↙',
  },
  {
    value: 'right-up',
    label: '右上 ↗',
  },
  {
    value: 'right-down',
    label: '右下 ↘',
  },
]

const CARDINAL_DIRECTIONS: { value: FreeCardinalDirection | 'none'; label: string }[] = [
  {
    value: 'none', label: '无方位',
  },
  {
    value: '东', label: '东',
  },
  {
    value: '南', label: '南',
  },
  {
    value: '西', label: '西',
  },
  {
    value: '北', label: '北',
  },
]

const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

function createElement(): FreeSignElement {
  return {
    id: makeId('element'),
    type: 'text',
    text: '目的地',
    english: 'DESTINATION',
    englishEnabled: false,
    leadingIcon: false,
    trailingIcon: false,
    roadSignId: '',
    cardinalDirection: '',
    arrowDirection: 'right-up',
  }
}

function createRow(): FreeSignRow {
  return {
    id: makeId('row'),
    elements: [createElement()],
    showDividerAfter: true,
    showCenterDivider: false,
  }
}

function roadSignLabel(sign: Sign) {
  if (sign.template === 'urban-expressway-road-name' || sign.template === 'urban-road-name') {
    return sign.urbanRoadName
  }
  return `${sign.code}${sign.name ? ` · ${sign.name}` : ''}`
}

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: React.ReactNode
}) {
  return <Label className="flex cursor-pointer items-center gap-2 text-xs font-normal text-muted-foreground">
    <input
      type="checkbox"
      checked={checked}
      onChange={event => onChange(event.target.checked)}
      className="size-3.5 accent-primary"
    />
    {children}
  </Label>
}

export function FreeModeSettings({
  sign,
  roadSignList,
  onChange,
}: FreeModeSettingsProps) {
  const config = sign.freeConfig
  const updateConfig = (updates: Partial<FreeSignConfig>) => onChange({
    freeConfig: {
      ...config,
      ...updates,
    },
  })
  const updateRows = (rows: FreeSignRow[]) => updateConfig({
    rows,
  })
  const updateElement = (rowId: string, elementId: string, updates: Partial<FreeSignElement>) => {
    updateRows(config.rows.map(row => row.id === rowId ? {
      ...row,
      elements: row.elements.map(element => element.id === elementId ? {
        ...element,
        ...updates,
      } : element),
    } : row))
  }
  const moveElement = (rowId: string, elementIndex: number, offset: number) => {
    updateRows(config.rows.map((row) => {
      if (row.id !== rowId) {return row}
      const target = elementIndex + offset
      if (target < 0 || target >= row.elements.length) {return row}
      const elements = [...row.elements]
      const [moved] = elements.splice(elementIndex, 1)
      elements.splice(target, 0, moved)
      return {
        ...row,
        elements,
      }
    }))
  }
  const moveRow = (rowIndex: number, offset: number) => {
    const target = rowIndex + offset
    if (target < 0 || target >= config.rows.length) {return}
    const rows = [...config.rows]
    const [moved] = rows.splice(rowIndex, 1)
    rows.splice(target, 0, moved)
    updateRows(rows)
  }

  return (
    <aside className="h-full overflow-y-auto border-l bg-background max-lg:border-l-0 max-lg:border-t">
      <div className="space-y-5 p-4">
        <section className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="free-sign-name">标志名称</Label>
            <Input
              id="free-sign-name"
              value={sign.name}
              maxLength={10}
              onChange={event => onChange({
                name: event.target.value,
              })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>标志类型</Label>
            <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
              {VARIANTS.map(variant => <Button
                key={variant.value}
                variant={config.variant === variant.value ? 'default' : 'ghost'}
                className="h-8 px-2 text-xs"
                onClick={() => updateConfig({
                  variant: variant.value,
                })}
              >
                {variant.label}
              </Button>)}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>背景颜色</Label>
            <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
              {BACKGROUNDS.map(background => <Button
                key={background.value}
                variant={config.background === background.value ? 'default' : 'ghost'}
                className="h-8 px-2 text-xs"
                onClick={() => updateConfig({
                  background: background.value,
                })}
              >
                <span className="size-2.5 rounded-full border border-white/50" style={{
                  background: background.color,
                }} />
                {background.label}
              </Button>)}
            </div>
          </div>
          <Toggle
            checked={config.showExitNumberSign}
            onChange={showExitNumberSign => updateConfig({
              showExitNumberSign,
            })}
          >显示出口编号牌</Toggle>
          {config.showExitNumberSign && <>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="free-exit-number">出口编号</Label>
                <Input
                  id="free-exit-number"
                  inputMode="numeric"
                  value={config.exitNumber}
                  maxLength={4}
                  placeholder="数字部分"
                  onChange={event => updateConfig({
                    exitNumber: event.target.value,
                  })}
                />
              </div>
              <Toggle
                checked={config.exitSuffixEnabled}
                onChange={exitSuffixEnabled => updateConfig({
                  exitSuffixEnabled,
                })}
              >添加字母编号</Toggle>
            </div>
            {config.exitSuffixEnabled && <Input
              aria-label="出口字母编号"
              value={config.exitSuffix}
              maxLength={3}
              placeholder="A-B"
              onChange={event => updateConfig({
                exitSuffix: event.target.value,
              })}
            />}
          </>}
          <Toggle
            checked={config.customExitNameEnabled}
            onChange={customExitNameEnabled => updateConfig({
              customExitNameEnabled,
            })}
          >自定义出口名称</Toggle>
          {config.customExitNameEnabled && <Input
            value={config.customExitName}
            maxLength={8}
            placeholder="出口名称"
            onChange={event => updateConfig({
              customExitName: event.target.value,
            })}
          />}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="free-opacity">不透明度</Label>
              <output className="text-xs tabular-nums text-muted-foreground">
                {Math.round(config.opacity * 100)}%
              </output>
            </div>
            <input
              id="free-opacity"
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={config.opacity}
              onChange={event => updateConfig({
                opacity: Number(event.target.value),
              })}
              className="w-full accent-primary"
            />
          </div>
          <Toggle checked={config.showExitDistance} onChange={showExitDistance => updateConfig({
            showExitDistance,
          })}>出口距离</Toggle>
          {config.showExitDistance && <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
            <Input
              aria-label="出口距离数值"
              value={config.exitDistance}
              inputMode="numeric"
              maxLength={5}
              placeholder="500"
              onChange={event => updateConfig({
                exitDistance: event.target.value,
              })}
            />
            <Select
              value={config.exitDistanceUnit}
              onValueChange={exitDistanceUnit => updateConfig({
                exitDistanceUnit: exitDistanceUnit as FreeSignConfig['exitDistanceUnit'],
              })}
            >
              <SelectTrigger aria-label="出口距离单位">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="m">m</SelectItem>
                <SelectItem value="km">km</SelectItem>
              </SelectContent>
            </Select>
          </div>}
          <Toggle checked={config.showTopBar} onChange={showTopBar => updateConfig({
            showTopBar,
          })}>添加顶部自定义信息栏</Toggle>
          {config.showTopBar && <Input
            value={config.topBarText}
            maxLength={12}
            placeholder="顶部信息"
            onChange={event => updateConfig({
              topBarText: event.target.value,
            })}
          />}
        </section>

        <section className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              正文信息栏
            </h2>
            <span className="text-[11px] text-muted-foreground">最多 5 行</span>
          </div>
          {config.rows.map((row, rowIndex) => <div key={row.id} className="space-y-2 rounded-lg border bg-muted/30 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">第 {rowIndex + 1} 行</span>
              <div className="flex gap-0.5">
                <Button variant="ghost" size="icon" className="size-7" disabled={rowIndex === 0} onClick={() => moveRow(rowIndex, -1)} title="上移">
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7" disabled={rowIndex === config.rows.length - 1} onClick={() => moveRow(rowIndex, 1)} title="下移">
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7" disabled={config.rows.length >= 5} onClick={() => updateRows([
                  ...config.rows.slice(0, rowIndex + 1),
                  {
                    ...row,
                    id: makeId('row'),
                    elements: row.elements.map(element => ({
                      ...element,
                      id: makeId('element'),
                    })),
                  },
                  ...config.rows.slice(rowIndex + 1),
                ])} title="复制该行">
                  <Copy className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7 text-destructive" disabled={config.rows.length === 1} onClick={() => updateRows(config.rows.filter(item => item.id !== row.id))} title="删除该行">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-md bg-background px-2 py-1.5">
              {rowIndex < config.rows.length - 1 && <Toggle
                checked={row.showDividerAfter}
                onChange={showDividerAfter => updateRows(config.rows.map(item => item.id === row.id
                  ? {
                    ...item,
                    showDividerAfter,
                  }
                  : item))}
              >下方分割线</Toggle>}
              <Toggle
                checked={row.showCenterDivider}
                onChange={showCenterDivider => updateRows(config.rows.map(item => item.id === row.id
                  ? {
                    ...item,
                    showCenterDivider,
                  }
                  : item))}
              >中心分割线</Toggle>
            </div>
            {row.elements.map((element, elementIndex) => <div key={element.id} className="space-y-2 rounded-md border bg-background p-2">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-7" disabled={elementIndex === 0} onClick={() => moveElement(row.id, elementIndex, -1)} title="左移">
                  <ArrowLeft className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7" disabled={elementIndex === row.elements.length - 1} onClick={() => moveElement(row.id, elementIndex, 1)} title="右移">
                  <ArrowRight className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7" disabled={row.elements.length >= 4} onClick={() => updateRows(config.rows.map(item => item.id === row.id ? {
                  ...item,
                  elements: [
                    ...item.elements.slice(0, elementIndex + 1),
                    {
                      ...element,
                      id: makeId('element'),
                    },
                    ...item.elements.slice(elementIndex + 1),
                  ],
                } : item))} title="复制元素">
                  <Copy className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7 text-destructive" disabled={row.elements.length === 1} onClick={() => updateRows(config.rows.map(item => item.id === row.id ? {
                  ...item,
                  elements: item.elements.filter(entry => entry.id !== element.id),
                } : item))} title="删除元素">
                  <Trash2 className="size-3.5" />
                </Button>
                <Select
                  value={element.type}
                  onValueChange={value => updateElement(row.id, element.id, {
                    type: value as FreeSignElement['type'],
                  })}
                >
                  <SelectTrigger className="ml-auto h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">文本</SelectItem>
                    <SelectItem value="road-sign">道路标识</SelectItem>
                    <SelectItem value="arrow">箭头</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {element.type === 'text' ? <>
                <Input
                  value={element.text}
                  maxLength={16}
                  placeholder="主文本"
                  onChange={event => updateElement(row.id, element.id, {
                    text: event.target.value,
                  })}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Toggle
                    checked={element.englishEnabled}
                    onChange={englishEnabled => updateElement(row.id, element.id, {
                      englishEnabled,
                    })}
                  >英文行</Toggle>
                  <Toggle
                    checked={element.leadingIcon}
                    onChange={leadingIcon => updateElement(row.id, element.id, {
                      leadingIcon,
                    })}
                  >前缀图标</Toggle>
                  <Toggle
                    checked={element.trailingIcon}
                    onChange={trailingIcon => updateElement(row.id, element.id, {
                      trailingIcon,
                    })}
                  >后缀图标</Toggle>
                </div>
                {element.englishEnabled && <Input
                  value={element.english}
                  maxLength={32}
                  placeholder="English text"
                  onChange={event => updateElement(row.id, element.id, {
                    english: event.target.value,
                  })}
                />}
              </> : element.type === 'road-sign' ? <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
                <Select
                  value={roadSignList.some(item => item.id === element.roadSignId)
                    ? element.roadSignId
                    : ''}
                  onValueChange={roadSignId => updateElement(row.id, element.id, {
                    roadSignId,
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择已有道路名称标识" />
                  </SelectTrigger>
                  <SelectContent>
                    {roadSignList.map(roadSign => <SelectItem key={roadSign.id} value={roadSign.id}>
                      {roadSignLabel(roadSign)}
                    </SelectItem>)}
                  </SelectContent>
                </Select>
                <Select
                  value={element.cardinalDirection || 'none'}
                  onValueChange={value => updateElement(row.id, element.id, {
                    cardinalDirection: value === 'none' ? '' : value as FreeCardinalDirection,
                  })}
                >
                  <SelectTrigger aria-label="道路标识方位">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARDINAL_DIRECTIONS.map(direction => <SelectItem
                      key={direction.value}
                      value={direction.value}
                    >
                      {direction.label}
                    </SelectItem>)}
                  </SelectContent>
                </Select>
              </div> : <Select
                value={element.arrowDirection}
                onValueChange={arrowDirection => updateElement(row.id, element.id, {
                  arrowDirection: arrowDirection as FreeSignElement['arrowDirection'],
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARROWS.map(arrow => <SelectItem key={arrow.value} value={arrow.value}>
                    {arrow.label}
                  </SelectItem>)}
                </SelectContent>
              </Select>}
            </div>)}
            <Button variant="ghost" className="h-8 w-full border border-dashed text-xs" disabled={row.elements.length >= 4} onClick={() => updateRows(config.rows.map(item => item.id === row.id ? {
              ...item,
              elements: [...item.elements, createElement()],
            } : item))}>
              <Plus className="size-3.5" /> 添加元素
            </Button>
          </div>)}
          <Button variant="ghost" className="w-full border border-dashed" disabled={config.rows.length >= 5} onClick={() => updateRows([...config.rows, createRow()])}>
            <Plus className="size-4" /> 添加正文行
          </Button>
        </section>
      </div>
    </aside>
  )
}
