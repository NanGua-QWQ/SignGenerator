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
  IntersectionDirection, IntersectionItem, Sign,
} from '@/lib/types'

import {
  DIRECTION_OPTIONS,
} from '../lib/sign-options'

const DIRECTION_LABELS: Record<IntersectionDirection, string> = {
  left: '左转方向',
  straight: '直行方向',
  right: '右转方向',
}

const makeItem = (type: IntersectionItem['type'], roadSignId = ''): IntersectionItem => ({
  id: `intersection-item-${Math.random().toString(36).slice(2, 8)}`,
  type,
  text: '',
  roadSignId,
})

function numberedSignLabel(sign: Sign) {
  if (sign.template === 'urban-expressway-road-name') {
    return `${sign.urbanRoadName} 无编号快速路道路标识`
  }
  return `${sign.code}${sign.name ? ` ${sign.name}` : ''}`
}

export function IntersectionSettings({
  sign,
  roadSignList,
  onChange,
}: {
  sign: Sign
  roadSignList: Sign[]
  onChange: (updates: Partial<Sign>) => void
}) {
  const config = sign.intersectionConfig
  const numberedSigns = roadSignList.filter(item =>
    item.template === 'expressway'
    || item.template === 'ordinary-road'
    || item.template === 'urban-expressway-road-name')

  function updateDirection(
    direction: IntersectionDirection,
    update: (items: IntersectionItem[]) => IntersectionItem[],
  ) {
    onChange({
      intersectionConfig: {
        ...config,
        directions: {
          ...config.directions,
          [direction]: update(config.directions[direction]),
        },
      },
    })
  }

  return <aside className="h-full overflow-y-auto border-l bg-background max-lg:border-l-0 max-lg:border-t">
    <div className="space-y-4 p-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        交叉路口设置
      </h2>
      <div className="space-y-1.5">
        <Label htmlFor="intersection-center-road">交叉道路名称</Label>
        <Input
          id="intersection-center-road"
          value={config.centerRoadName}
          maxLength={24}
          placeholder="例如：南京路"
          onChange={event => onChange({
            intersectionConfig: {
              ...config,
              centerRoadName: Array.from(event.target.value).slice(0, 24).join(''),
            },
          })}
        />
        <p className="text-xs text-muted-foreground">长名称会自动换行和缩小。</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="intersection-cardinal-direction">左上角方位</Label>
        <Select
          value={config.cardinalDirection}
          onValueChange={cardinalDirection => onChange({
            intersectionConfig: {
              ...config,
              cardinalDirection,
            },
          })}
        >
          <SelectTrigger id="intersection-cardinal-direction">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIRECTION_OPTIONS.map(direction => <SelectItem key={direction} value={direction}>
              {direction}
            </SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {(Object.keys(DIRECTION_LABELS) as IntersectionDirection[]).map(direction => <section
        key={direction}
        className="space-y-3 rounded-lg border p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{DIRECTION_LABELS[direction]}</h3>
          <span className="text-xs text-muted-foreground">
            {config.directions[direction].length}/5 行
          </span>
        </div>
        {config.directions[direction].map((item, index) => <div
          key={item.id}
          className="space-y-2 rounded-md bg-muted/55 p-2"
        >
          <div className="flex items-center gap-2">
            <Select
              value={item.type}
              onValueChange={(value: IntersectionItem['type']) => updateDirection(
                direction,
                items => items.map(current => current.id === item.id ? {
                  ...current,
                  type: value,
                  roadSignId: value === 'road-sign'
                    ? current.roadSignId || numberedSigns[0]?.id || ''
                    : current.roadSignId,
                } : current),
              )}
            >
              <SelectTrigger className="h-8 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">道路名称</SelectItem>
                <SelectItem value="road-sign">道路编号牌</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              title={`删除第 ${index + 1} 行`}
              onClick={() => updateDirection(
                direction,
                items => items.filter(current => current.id !== item.id),
              )}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          {item.type === 'text' ? <Input
            value={item.text}
            maxLength={24}
            placeholder="道路名称（最多 24 字）"
            onChange={event => updateDirection(
              direction,
              items => items.map(current => current.id === item.id ? {
                ...current,
                text: Array.from(event.target.value).slice(0, 24).join(''),
              } : current),
            )}
          /> : <Select
            value={item.roadSignId || 'none'}
            onValueChange={roadSignId => updateDirection(
              direction,
              items => items.map(current => current.id === item.id ? {
                ...current,
                roadSignId: roadSignId === 'none' ? '' : roadSignId,
              } : current),
            )}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">请选择编号牌</SelectItem>
              {numberedSigns.map(roadSign => <SelectItem key={roadSign.id} value={roadSign.id}>
                {numberedSignLabel(roadSign)}
              </SelectItem>)}
            </SelectContent>
          </Select>}
        </div>)}
        {config.directions[direction].length < 5 && <div className="grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            className="h-8 border text-xs"
            onClick={() => updateDirection(direction, items => [...items, makeItem('text')])}
          >
            <Plus className="size-3.5" />
            道路名称
          </Button>
          <Button
            variant="ghost"
            className="h-8 border text-xs"
            onClick={() => updateDirection(
              direction,
              items => [...items, makeItem('road-sign', numberedSigns[0]?.id || '')],
            )}
          >
            <Plus className="size-3.5" />
            编号牌
          </Button>
        </div>}
        {config.directions[direction].length === 0 && <p className="text-xs text-muted-foreground">
          未填写时自动显示“此路不通”图形。
        </p>}
      </section>)}
    </div>
  </aside>
}
