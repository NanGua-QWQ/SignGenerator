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

  return (
    <aside className="h-full overflow-y-auto border-l bg-background max-lg:border-l-0 max-lg:border-t">
      <div className="p-4">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">编号牌设置</h2>
        <div className="flex flex-col gap-4">
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
        </div>
      </div>
    </aside>
  )
}
