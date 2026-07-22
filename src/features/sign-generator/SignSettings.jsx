import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignSettings({ sign, onChange }) {
  const updateDigits = event => {
    onChange({ digits: event.target.value.replace(/\D/g, '').slice(0, 4) })
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
          <div className="space-y-1.5">
            <Label htmlFor="road-digits">道路编号</Label>
            <Input id="road-digits" value={sign.digits} onChange={updateDigits} placeholder="15 或 0421" inputMode="numeric" pattern="[0-9]*" maxLength={4} className="h-9" />
            <p className="text-xs text-muted-foreground">只输入数字，支持 2 位或 4 位编号。</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="road-name">高速名称</Label>
            <Input id="road-name" value={sign.name} onChange={event => onChange({ name: event.target.value })} placeholder="例如：沈海高速" className="h-9" />
            <p className="text-xs text-muted-foreground">留空则生成不含路名的高速编号牌。</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
