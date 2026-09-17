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
  DestinationDistanceItem, FreeSignBackground, Sign,
} from '@/lib/types'

const BACKGROUNDS: { value: FreeSignBackground; label: string }[] = [
  {
    value: 'green', label: '绿底',
  },
  {
    value: 'blue', label: '蓝底',
  },
  {
    value: 'brown', label: '棕底',
  },
]

function makeItem(type: DestinationDistanceItem['type'], roadSignId = ''): DestinationDistanceItem {
  return {
    id: `destination-${Math.random().toString(36).slice(2, 8)}`,
    type,
    text: '',
    english: '',
    englishEnabled: false,
    roadSignId,
    distance: '',
    unit: 'km',
  }
}

function roadSignLabel(sign: Sign) {
  if (sign.template === 'urban-expressway-road-name') {
    return `${sign.urbanRoadName} · 无编号快速路`
  }
  if (sign.template === 'urban-road-name') {
    return `${sign.urbanRoadName} · 城市道路`
  }
  return `${sign.code}${sign.name ? ` · ${sign.name}` : ''}`
}

export function DestinationDistanceSettings({
  sign,
  roadSignList,
  onChange,
}: {
  sign: Sign
  roadSignList: Sign[]
  onChange: (updates: Partial<Sign>) => void
}) {
  const config = sign.destinationDistanceConfig

  function updateItems(update: (items: DestinationDistanceItem[]) => DestinationDistanceItem[]) {
    onChange({
      destinationDistanceConfig: {
        ...config,
        items: update(config.items),
      },
    })
  }

  function updateItem(id: string, updates: Partial<DestinationDistanceItem>) {
    updateItems(items => items.map(item => item.id === id ? {
      ...item, ...updates,
    } : item))
  }

  return <aside className="h-full overflow-y-auto border-l bg-background max-lg:border-l-0 max-lg:border-t">
    <div className="space-y-4 p-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        地点距离标识设置
      </h2>
      <div className="space-y-1.5">
        <Label>标牌底色</Label>
        <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
          {BACKGROUNDS.map(background => <Button
            key={background.value}
            variant={config.background === background.value ? 'default' : 'ghost'}
            className="h-8 rounded-sm"
            onClick={() => onChange({
              destinationDistanceConfig: {
                ...config,
                background: background.value,
              },
            })}
          >
            {background.label}
          </Button>)}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>目的地与距离</Label>
          <span className="text-xs text-muted-foreground">{config.items.length}/5 行</span>
        </div>
        {config.items.map((item, index) => <div
          key={item.id}
          className="space-y-2 rounded-lg border bg-muted/30 p-3"
        >
          <div className="flex items-center gap-2">
            <span className="w-5 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
            <Select
              value={item.type}
              onValueChange={(type: DestinationDistanceItem['type']) => updateItem(item.id, {
                type,
                roadSignId: type === 'road-sign'
                  ? item.roadSignId || roadSignList[0]?.id || ''
                  : item.roadSignId,
              })}
            >
              <SelectTrigger className="h-8 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">纯文字</SelectItem>
                <SelectItem value="road-sign">道路编号标牌</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              title={`删除第 ${index + 1} 行`}
              disabled={config.items.length <= 1}
              onClick={() => updateItems(items => items.filter(current => current.id !== item.id))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>

          {item.type === 'text' ? <Input
            value={item.text}
            maxLength={16}
            placeholder="目的地，例如：天津"
            onChange={event => updateItem(item.id, {
              text: Array.from(event.target.value).slice(0, 16).join(''),
            })}
          /> : <Select
            value={item.roadSignId || 'none'}
            onValueChange={roadSignId => updateItem(item.id, {
              roadSignId: roadSignId === 'none' ? '' : roadSignId,
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">请选择道路名称标识</SelectItem>
              {roadSignList.map(roadSign => <SelectItem key={roadSign.id} value={roadSign.id}>
                {roadSignLabel(roadSign)}
              </SelectItem>)}
            </SelectContent>
          </Select>}

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={item.englishEnabled}
              onChange={event => updateItem(item.id, {
                englishEnabled: event.target.checked,
              })}
              className="size-3.5 accent-primary"
            />
            显示英文行（默认不显示）
          </label>
          {item.englishEnabled && <Input
            value={item.english}
            maxLength={32}
            placeholder="英文，例如：TIANJIN"
            onChange={event => updateItem(item.id, {
              english: Array.from(event.target.value).slice(0, 32).join(''),
            })}
          />}

          <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
            <div className="space-y-1">
              <Label htmlFor={`destination-distance-${item.id}`}>距离</Label>
              <Input
                id={`destination-distance-${item.id}`}
                value={item.distance}
                inputMode="decimal"
                placeholder="例如：25"
                onChange={event => updateItem(item.id, {
                  distance: event.target.value
                    .replace(/[^\d.]/g, '')
                    .replace(/(\..*)\./g, '$1')
                    .slice(0, 6),
                })}
              />
            </div>
            <div className="space-y-1">
              <Label>单位</Label>
              <Select
                value={item.unit}
                onValueChange={(unit: DestinationDistanceItem['unit']) => updateItem(item.id, {
                  unit,
                })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="km">km</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>)}

        {config.items.length < 5 && <div className="grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            className="h-8 border text-xs"
            onClick={() => updateItems(items => [...items, makeItem('text')])}
          >
            <Plus className="size-3.5" />
            纯文字行
          </Button>
          <Button
            variant="ghost"
            className="h-8 border text-xs"
            disabled={roadSignList.length === 0}
            onClick={() => updateItems(items => [
              ...items,
              makeItem('road-sign', roadSignList[0]?.id || ''),
            ])}
          >
            <Plus className="size-3.5" />
            道路标牌行
          </Button>
        </div>}
        <p className="text-xs text-muted-foreground">
          道路标牌行可使用“道路名称标识”模块中的任意已有标牌。
        </p>
      </section>
    </div>
  </aside>
}
