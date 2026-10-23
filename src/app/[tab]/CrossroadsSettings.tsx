import {
  Plus, Trash2,
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
  CrossroadsConfig, CrossroadsItem, IntersectionDirection, IntersectionItem, Sign,
} from '@/lib/types'

import {
  DIRECTION_OPTIONS,
} from '../lib/sign-options'

const DIRECTIONS: { value: IntersectionDirection; label: string }[] = [
  {
    value: 'straight', label: '直行方向（上方）',
  },
  {
    value: 'left', label: '左转方向',
  },
  {
    value: 'right', label: '右转方向',
  },
]

const SIDE_ROADS = [
  {
    key: 'leftSideRoads', label: '左边缘竖排道路', placeholder: '例如：上高路',
  },
  {
    key: 'rightSideRoads', label: '右边缘竖排道路', placeholder: '例如：丽花南路',
  },
] as const

const makeItem = (type: CrossroadsItem['type'], roadSignId = ''): CrossroadsItem => ({
  id: `crossroads-item-${Math.random().toString(36).slice(2, 8)}`,
  type,
  text: '',
  roadSignId,
  distance: '',
  highlighted: false,
})

function roadSignLabel(sign: Sign) {
  if (sign.template === 'urban-expressway-road-name') {
    return `${sign.urbanRoadName} 无编号快速路道路标识`
  }
  return `${sign.code}${sign.name ? ` ${sign.name}` : ''}`
}

export function CrossroadsSettings({
  sign, roadSignList, onChange,
}: { sign: Sign; roadSignList: Sign[]; onChange: (updates: Partial<Sign>) => void }) {
  const config = sign.crossroadsConfig
  const numberedSigns = roadSignList.filter(item =>
    item.template === 'expressway'
    || item.template === 'ordinary-road'
    || item.template === 'urban-expressway-road-name')
  const update = (changes: Partial<CrossroadsConfig>) => onChange({
    crossroadsConfig: {
      ...config, ...changes,
    },
  })
  const updateDirection = (
    direction: IntersectionDirection,
    change: (items: CrossroadsItem[]) => CrossroadsItem[],
  ) => update({
    directions: {
      ...config.directions,
      [direction]: change(config.directions[direction]),
    },
  })
  const updateItem = (
    direction: IntersectionDirection,
    id: string,
    changes: Partial<CrossroadsItem>,
  ) => updateDirection(direction, items => items.map(item => item.id === id ? {
    ...item, ...changes,
  } : item))
  const updateSideRoads = (
    key: 'leftSideRoads' | 'rightSideRoads', roads: IntersectionItem[],
  ) => update({
    [key]: roads,
  })

  return <aside className="h-full overflow-y-auto border-l bg-background max-lg:border-l-0 max-lg:border-t">
    <div className="space-y-4 p-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        十字路口图形式设置
      </h2>
      <div className="space-y-1.5">
        <Label htmlFor="crossroads-direction">左上角方位</Label>
        <Select value={config.cardinalDirection || 'none'} onValueChange={value => update({
          cardinalDirection: value === 'none' ? '' : value,
        })}>
          <SelectTrigger id="crossroads-direction"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">不显示</SelectItem>
            {DIRECTION_OPTIONS.map(direction => <SelectItem key={direction} value={direction}>
              {direction}
            </SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {DIRECTIONS.map(({
        value: direction, label,
      }) => <section
        key={direction}
        className="space-y-3 rounded-lg border p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{label}</h3>
          {direction === 'straight' && <span className="text-xs text-muted-foreground">
            {config.directions[direction].length}/5 行
          </span>}
        </div>
        {(direction === 'straight' ? config.directions[direction] : config.directions[direction].slice(0, 1)).map((item, index) => <div
          key={item.id}
          className="space-y-2 rounded-md bg-muted/55 p-2"
        >
          <div className="flex items-center gap-2">
            <Select value={item.type} onValueChange={(type: CrossroadsItem['type']) => updateItem(
              direction, item.id, {
                type,
                roadSignId: type === 'road-sign' ? item.roadSignId || numberedSigns[0]?.id || '' : '',
              },
            )}>
              <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">道路名称</SelectItem>
                <SelectItem value="road-sign">道路编号牌</SelectItem>
              </SelectContent>
            </Select>
            {direction === 'straight' && <Button
              variant="ghost" size="icon" className="size-8 shrink-0"
              title={`删除第 ${index + 1} 行`}
              onClick={() => updateDirection(
                direction, items => items.filter(current => current.id !== item.id),
              )}
            >
              <Trash2 className="size-3.5" />
            </Button>}
          </div>
          {item.type === 'text' ? <Input
            aria-label={`${label}第 ${index + 1} 行道路名称`}
            value={item.text}
            maxLength={24}
            placeholder="道路名称（最多 24 字）"
            onChange={event => updateItem(direction, item.id, {
              text: event.target.value,
            })}
          /> : <Select
            value={item.roadSignId || 'none'}
            onValueChange={roadSignId => updateItem(direction, item.id, {
              roadSignId: roadSignId === 'none' ? '' : roadSignId,
            })}
          >
            <SelectTrigger aria-label={`${label}第 ${index + 1} 行道路编号牌`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">请选择编号牌</SelectItem>
              {numberedSigns.map(roadSign => <SelectItem key={roadSign.id} value={roadSign.id}>
                {roadSignLabel(roadSign)}
              </SelectItem>)}
            </SelectContent>
          </Select>}
          {direction === 'straight' && <Input
            aria-label={`${label}第 ${index + 1} 行距离`}
            value={item.distance}
            maxLength={8}
            placeholder="距离（可留空，如 250m）"
            onChange={event => updateItem(direction, item.id, {
              distance: event.target.value,
            })}
          />}
          {item.type === 'text' && <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={item.highlighted}
              onChange={event => updateItem(direction, item.id, {
                highlighted: event.target.checked,
              })}
            />
            绿色道路名底牌
          </label>}
        </div>)}
        {direction === 'straight' && config.directions[direction].length < 5 && <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" className="h-8 border text-xs" onClick={() => updateDirection(
            direction, items => [...items, makeItem('text')],
          )}>
            <Plus className="size-3.5" />道路名称
          </Button>
          <Button variant="ghost" className="h-8 border text-xs" onClick={() => updateDirection(
            direction, items => [...items, makeItem('road-sign', numberedSigns[0]?.id || '')],
          )}>
            <Plus className="size-3.5" />编号牌
          </Button>
        </div>}
      </section>)}
      <div className="space-y-1.5">
        <Label htmlFor="crossroads-centerRoad">中央竖排道路</Label>
        <Input id="crossroads-centerRoad" value={config.centerRoad} maxLength={16}
          placeholder="例如：宏运大道" onChange={event => update({
            centerRoad: event.target.value,
          })} />
      </div>
      {SIDE_ROADS.map(({
        key, label, placeholder,
      }, sideIndex) => <section key={key} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{label}</Label>
          <span className="text-xs text-muted-foreground">{config[key].length}/3 条</span>
        </div>
        {config[key].map((road, index) => <div key={road.id} className="space-y-2 rounded-md bg-muted/55 p-2">
          <div className="flex gap-2">
            <Select value={road.type} onValueChange={(type: IntersectionItem['type']) =>
              updateSideRoads(key, config[key].map(current => current.id === road.id ? {
                ...current,
                type,
                roadSignId: type === 'road-sign'
                  ? current.roadSignId || numberedSigns[0]?.id || '' : '',
              } : current))}>
              <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">道路名称</SelectItem>
                <SelectItem value="road-sign">道路编号牌</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="size-8 shrink-0"
              title={`删除${label}第 ${index + 1} 条`}
              onClick={() => updateSideRoads(key,
                config[key].filter(current => current.id !== road.id))}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          {road.type === 'text' ? <Input aria-label={`${label}第 ${index + 1} 条道路名称`}
            value={road.text} maxLength={16} placeholder={placeholder}
            onChange={event => updateSideRoads(key, config[key].map(current =>
              current.id === road.id ? {
                ...current, text: event.target.value,
              } : current))} /> : <Select value={road.roadSignId || 'none'}
            onValueChange={roadSignId => updateSideRoads(key, config[key].map(current =>
              current.id === road.id ? {
                ...current, roadSignId: roadSignId === 'none' ? '' : roadSignId,
              } : current))}>
            <SelectTrigger aria-label={`${label}第 ${index + 1} 条道路编号牌`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">请选择编号牌</SelectItem>
              {numberedSigns.map(roadSign => <SelectItem key={roadSign.id} value={roadSign.id}>
                {roadSignLabel(roadSign)}
              </SelectItem>)}
            </SelectContent>
          </Select>}
        </div>)}
        {config[key].length < 3 && <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" className="h-8 border text-xs"
            onClick={() => updateSideRoads(key, [...config[key], makeItem('text')])}>
            <Plus className="size-3.5" />道路名称
          </Button>
          <Button variant="ghost" className="h-8 border text-xs"
            onClick={() => updateSideRoads(key,
              [...config[key], makeItem('road-sign', numberedSigns[0]?.id || '')])}>
            <Plus className="size-3.5" />编号牌
          </Button>
        </div>}
        <div className="space-y-1.5">
          <Label htmlFor={`crossroads-${sideIndex === 0 ? 'left' : 'right'}SideDistance`}>
            {sideIndex === 0 ? '左' : '右'}边缘距离
          </Label>
          <Input id={`crossroads-${sideIndex === 0 ? 'left' : 'right'}SideDistance`}
            value={sideIndex === 0 ? config.leftSideDistance : config.rightSideDistance}
            maxLength={8} placeholder="例如：240m"
            onChange={event => update(sideIndex === 0
              ? {
                leftSideDistance: event.target.value,
              }
              : {
                rightSideDistance: event.target.value,
              })} />
        </div>
      </section>)}
    </div>
  </aside>
}
