import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

const directions = [
  { value: 'north', label: '北' },
  { value: 'south', label: '南' },
  { value: 'east', label: '东' },
  { value: 'west', label: '西' },
]

const arrows = [
  { value: 'up', label: '↑ 直行' },
  { value: 'up-right', label: '↗ 右前' },
  { value: 'right', label: '→ 右转' },
  { value: 'left', label: '← 左转' },
]

const signTypes = [
  { value: 'highway', label: '国家高速', color: '#111827', headerText: '国家高速' },
  { value: 'national', label: '国道编号', color: '#111827', headerText: '国道编号' },
]

export function SignSettings({ sign, onChange }) {
  const update = (key, value) => onChange({ [key]: value })

  const updateDest = (index, key, value) => {
    const next = sign.destinations.map((d, i) =>
      i === index ? { ...d, [key]: value } : d
    )
    onChange({ destinations: next })
  }

  const addDest = () => {
    const next = [...sign.destinations, { city: '', km: '', arrow: 'up' }]
    onChange({ destinations: next })
  }

  const removeDest = (index) => {
    if (sign.destinations.length <= 1) return
    const next = sign.destinations.filter((_, i) => i !== index)
    onChange({ destinations: next })
  }

  return (
    <div className="h-full border-l bg-background overflow-y-auto max-md:border-t max-md:max-h-[55vh]">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          设置
        </h2>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>编号</Label>
              <Input
                value={sign.route}
                onChange={e => update('route', e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label>名称</Label>
              <Input
                value={sign.name}
                onChange={e => update('name', e.target.value)}
                className="h-8"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>顶部标识</Label>
            <Input
              value={sign.headerText || ''}
              maxLength={4}
              onChange={e => update('headerText', e.target.value)}
              className="h-8"
            />
          </div>

          <div className="space-y-1.5">
            <Label>方向</Label>
            <Select
              value={sign.direction}
              onValueChange={v => update('direction', v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {directions.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>路牌类型</Label>
            <Select
              value={sign.type}
              onValueChange={(value) => {
                const type = signTypes.find((item) => item.value === value)
                onChange({ type: value, headerText: type?.headerText || sign.headerText })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {signTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: t.color }} />
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              目的地
            </h3>
            <Button variant="ghost" size="icon" className="size-6" onClick={addDest}>
              <Plus className="size-3.5" />
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {sign.destinations.map((dest, i) => (
              <div key={i} className="flex flex-col gap-2 bg-muted/50 rounded-lg p-3 border border-border/50 relative">
                {sign.destinations.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 size-5"
                    onClick={() => removeDest(i)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                )}
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[11px]">城市</Label>
                    <Input
                      value={dest.city}
                      onChange={e => updateDest(i, 'city', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="w-16 space-y-1">
                    <Label className="text-[11px]">km</Label>
                    <Input
                      value={dest.km}
                      onChange={e => updateDest(i, 'km', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">箭头</Label>
                  <Select
                    value={dest.arrow}
                    onValueChange={v => updateDest(i, 'arrow', v)}
                  >
                    <SelectTrigger className="w-full h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {arrows.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
