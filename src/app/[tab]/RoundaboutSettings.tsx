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
  RoundaboutDirection, RoundaboutRoadClass, Sign,
} from '@/lib/types'

import {
  DIRECTION_OPTIONS,
} from '../lib/sign-options'

const DIRECTION_LABELS: Record<RoundaboutDirection, string> = {
  right: '向右',
  'right-forward': '右前方',
  straight: '直行',
  'left-forward': '左前方',
  left: '向左',
}

const DIRECTION_ORDER: RoundaboutDirection[] = [
  'left',
  'left-forward',
  'straight',
  'right-forward',
  'right',
]

const ROAD_CLASSES: { value: RoundaboutRoadClass; label: string }[] = [
  {
    value: 'major', label: '干线道路（粗）',
  },
  {
    value: 'numbered', label: '编号集散道路（中）',
  },
  {
    value: 'local', label: '无编号本地道路（细）',
  },
]

function roadSignLabel(sign: Sign) {
  if (sign.template === 'urban-expressway-road-name') {
    return `${sign.urbanRoadName} · 无编号快速路`
  }
  if (sign.template === 'urban-road-name') {
    return `${sign.urbanRoadName} · 城市道路`
  }
  return `${sign.code}${sign.name ? ` · ${sign.name}` : ''}`
}

export function RoundaboutSettings({
  sign,
  roadSignList,
  onChange,
}: {
  sign: Sign
  roadSignList: Sign[]
  onChange: (updates: Partial<Sign>) => void
}) {
  const config = sign.roundaboutConfig

  function updateConfig(updates: Partial<Sign['roundaboutConfig']>) {
    onChange({
      roundaboutConfig: {
        ...config,
        ...updates,
      },
    })
  }

  function updateExit(
    direction: RoundaboutDirection,
    updates: Partial<Sign['roundaboutConfig']['exits'][RoundaboutDirection]>,
  ) {
    updateConfig({
      exits: {
        ...config.exits,
        [direction]: {
          ...config.exits[direction],
          ...updates,
        },
      },
    })
  }

  return <aside className="h-full overflow-y-auto border-l bg-background max-lg:border-l-0 max-lg:border-t">
    <div className="space-y-4 p-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        环岛图形式设置
      </h2>

      <div className="space-y-1.5">
        <Label>版面形式</Label>
        <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
          <Button
            variant={config.layout === 'square' ? 'default' : 'ghost'}
            className="h-8 rounded-sm"
            onClick={() => updateConfig({
              layout: 'square',
            })}
          >
            方形版面
          </Button>
          <Button
            variant={config.layout === 'wide' ? 'default' : 'ghost'}
            className="h-8 rounded-sm"
            onClick={() => updateConfig({
              layout: 'wide',
            })}
          >
            横向版面
          </Button>
        </div>
      </div>

      <div className="space-y-1.5 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-2">
          <Label>地理方向</Label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={config.cardinalDirectionVisible}
              onChange={event => updateConfig({
                cardinalDirectionVisible: event.target.checked,
              })}
              className="size-3.5 accent-primary"
            />
            显示
          </label>
        </div>
        {config.cardinalDirectionVisible && <Select
          value={config.cardinalDirection}
          onValueChange={cardinalDirection => updateConfig({
            cardinalDirection,
          })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {DIRECTION_OPTIONS.map(direction => <SelectItem key={direction} value={direction}>
              {direction}
            </SelectItem>)}
          </SelectContent>
        </Select>}
      </div>

      <div className="space-y-1.5">
        <Label>当前驶入道路</Label>
        <Select
          value={config.approachRoadClass}
          onValueChange={(approachRoadClass: RoundaboutRoadClass) => updateConfig({
            approachRoadClass,
          })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROAD_CLASSES.map(roadClass => <SelectItem
              key={roadClass.value}
              value={roadClass.value}
            >
              {roadClass.label}
            </SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>环岛出口</Label>
          <span className="text-xs text-muted-foreground">
            {Object.values(config.exits).filter(exit => exit.enabled).length}/5 个
          </span>
        </div>
        {DIRECTION_ORDER.map((direction) => {
          const exit = config.exits[direction]
          return <div key={direction} className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">{DIRECTION_LABELS[direction]}</h3>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={exit.enabled}
                  onChange={event => updateExit(direction, {
                    enabled: event.target.checked,
                  })}
                  className="size-3.5 accent-primary"
                />
                启用出口
              </label>
            </div>
            {exit.enabled && <>
              <Input
                value={exit.destination}
                maxLength={12}
                placeholder="通往地点，例如：三河"
                onChange={event => updateExit(direction, {
                  destination: Array.from(event.target.value).slice(0, 12).join(''),
                })}
              />
              <Select
                value={exit.roadSignId || 'none'}
                onValueChange={roadSignId => updateExit(direction, {
                  roadSignId: roadSignId === 'none' ? '' : roadSignId,
                })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不显示道路标牌</SelectItem>
                  {roadSignList.map(roadSign => <SelectItem key={roadSign.id} value={roadSign.id}>
                    {roadSignLabel(roadSign)}
                  </SelectItem>)}
                </SelectContent>
              </Select>
              <Select
                value={exit.roadClass}
                onValueChange={(roadClass: RoundaboutRoadClass) => updateExit(direction, {
                  roadClass,
                })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROAD_CLASSES.map(roadClass => <SelectItem
                    key={roadClass.value}
                    value={roadClass.value}
                  >
                    {roadClass.label}
                  </SelectItem>)}
                </SelectContent>
              </Select>
            </>}
          </div>
        })}
        <p className="text-xs leading-relaxed text-muted-foreground">
          线宽按标准区分：粗线表示干线道路，中线表示有编号的集散道路，细线表示无编号的本地道路。
        </p>
      </section>
    </div>
  </aside>
}
