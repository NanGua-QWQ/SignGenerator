import type { ChangeEvent } from 'react'
import type { Sign } from '@/features/sign-generator/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SignSettingsProps {
  sign: Sign
  onChange: (updates: Partial<Sign>) => void
}

export function SignSettings({ sign, onChange }: SignSettingsProps) {
  const nameLimit = sign.digits.length === 4 ? 6 : 4

  const updateDigits = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ digits: event.target.value.replace(/\D/g, '').slice(0, 4) })
  }

  const updateName = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ name: Array.from(event.target.value).slice(0, nameLimit).join('') })
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

  const updateExitName = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ exitName: Array.from(event.target.value).slice(0, 6).join('') })
  }

  const updateExitDestination = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ exitDestination: Array.from(event.target.value).slice(0, 8).join('') })
  }

  const updateLeftRoute = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ leftRoute: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) })
  }

  const updateRightRoute = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ rightRoute: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) })
  }

  const updateLeftDirection = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ leftDirection: Array.from(event.target.value.trim()).slice(0, 1).join('') })
  }

  const updateRightDirection = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ rightDirection: Array.from(event.target.value.trim()).slice(0, 1).join('') })
  }

  return (
    <aside className="h-full overflow-y-auto border-l bg-background max-lg:border-l-0 max-lg:border-t">
      <div className="p-4">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">标志设置</h2>
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label>模板类型</Label>
            <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
              <Button variant={sign.template === 'expressway' ? 'default' : 'ghost'} className="h-8 rounded-sm" onClick={() => onChange({ template: 'expressway' })}>高速编号牌</Button>
              <Button variant={sign.template === 'exit-location' ? 'default' : 'ghost'} className="h-8 rounded-sm" onClick={() => onChange({ template: 'exit-location' })}>出口定位</Button>
            </div>
          </div>

          {sign.template === 'expressway' ? (
            <>
              <div className="space-y-1.5">
                <Label>高速类型</Label>
                <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
                  <Button variant={sign.kind === 'national' ? 'default' : 'ghost'} className="h-8 rounded-sm" onClick={() => onChange({ kind: 'national' })}>国家高速</Button>
                  <Button variant={sign.kind === 'provincial' ? 'default' : 'ghost'} className="h-8 rounded-sm" onClick={() => onChange({ kind: 'provincial' })}>省高速</Button>
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
                  <Label htmlFor="road-digits">道路编号</Label>
                  <Input id="road-digits" value={sign.digits} onChange={updateDigits} placeholder="1、15 或 0421" inputMode="numeric" pattern="[0-9]*" maxLength={4} className="h-9" />
                </div>
                <p className={`${sign.kind === 'provincial' ? 'col-span-2' : ''} text-xs text-muted-foreground`}>只输入数字，支持 1 位、2 位或 4 位编号。</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="road-name">高速名称</Label>
                <Input id="road-name" value={sign.name} onChange={updateName} placeholder="例如：沈海高速" maxLength={nameLimit} className="h-9" />
                <p className="text-xs text-muted-foreground">当前最多 {nameLimit} 个字，留空则生成不含路名的编号牌。</p>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="exit-number">出口编号</Label>
                  <Input id="exit-number" value={sign.exitNumber} onChange={updateExitNumber} placeholder="360" inputMode="numeric" maxLength={4} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exit-distance">距离 km</Label>
                  <Input id="exit-distance" value={sign.exitDistance} onChange={updateExitDistance} placeholder="2" inputMode="decimal" maxLength={5} className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="left-route">左侧高速编号</Label>
                  <Input id="left-route" value={sign.leftRoute} onChange={updateLeftRoute} placeholder="G72" maxLength={5} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="left-direction">方向</Label>
                  <Input id="left-direction" value={sign.leftDirection} onChange={updateLeftDirection} placeholder="北" maxLength={1} className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="right-route">右侧高速编号</Label>
                  <Input id="right-route" value={sign.rightRoute} onChange={updateRightRoute} placeholder="G80" maxLength={5} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="right-direction">方向</Label>
                  <Input id="right-direction" value={sign.rightDirection} onChange={updateRightDirection} placeholder="东" maxLength={1} className="h-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exit-name">出口名称</Label>
                <Input id="exit-name" value={sign.exitName} onChange={updateExitName} placeholder="柳州" maxLength={6} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exit-destination">目的地</Label>
                <Input id="exit-destination" value={sign.exitDestination} onChange={updateExitDestination} placeholder="玉林" maxLength={8} className="h-9" />
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
