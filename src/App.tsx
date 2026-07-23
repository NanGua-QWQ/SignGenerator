import { useCallback, useMemo, useState } from 'react'
import type { Sign } from '@/features/sign-generator/types'
import { Header } from '@/components/layout/Header'
import { SignList } from '@/features/sign-generator/SignList'
import { SignPreview } from '@/features/sign-generator/SignPreview'
import { SignSettings } from '@/features/sign-generator/SignSettings'

function cleanDigits(value: string): string {
  return String(value || '').replace(/\D/g, '').slice(0, 4)
}

function cleanProvinceLabel(value: string): string {
  return Array.from(String(value || '').trim()).slice(0, 1).join('')
}

function nameLimitForDigits(digits: string): number {
  return digits.length === 4 ? 6 : 4
}

function cleanName(value: string, digits: string): string {
  return Array.from(String(value || '')).slice(0, nameLimitForDigits(digits)).join('')
}

function buildSignCode(kind: Sign['kind'], digits: string): string {
  return `${kind === 'provincial' ? 'S' : 'G'}${digits}`
}

function parseSignCode(value: string): { kind: Sign['kind']; digits: string; provinceLabel?: string } {
  const code = String(value || '').trim().toUpperCase()
  const national = /^G(\d{1,2}|\d{4})$/.exec(code)
  if (national) return { kind: 'national', digits: national[1] }

  const provincial = /^S(\d{1,2}|\d{4})$/.exec(code)
  if (provincial) return { kind: 'provincial', digits: provincial[1], provinceLabel: '粤' }

  const legacyProvincial = /^(.)(S(\d{1,2}|\d{4}))$/u.exec(code)
  if (legacyProvincial) return { kind: 'provincial', digits: legacyProvincial[3], provinceLabel: legacyProvincial[1] }

  return { kind: 'national', digits: cleanDigits(code) || '15' }
}

function normalizeSign(overrides: Partial<Sign> = {}): Omit<Sign, 'id' | 'name'> {
  const parsed = overrides.kind
    ? { kind: overrides.kind, digits: cleanDigits(overrides.digits ?? ''), provinceLabel: overrides.provinceLabel }
    : parseSignCode(overrides.code ?? 'G15')
  return {
    kind: parsed.kind,
    digits: parsed.digits,
    provinceLabel: parsed.kind === 'provincial' ? (parsed.provinceLabel === undefined ? '粤' : cleanProvinceLabel(parsed.provinceLabel)) : '',
    code: buildSignCode(parsed.kind, parsed.digits),
  }
}

function createSign(overrides: Partial<Sign> = {}): Sign {
  const sign = normalizeSign(overrides)
  return {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    ...sign,
    name: cleanName(overrides.name ?? '沈海高速', sign.digits),
  }
}

function createInitialSigns(): Sign[] {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code') ?? 'G15'
  const name = params.get('name') ?? '沈海高速'
  return [
    createSign({ code, name }),
    createSign({ code: 'G0421', name: '许广高速' }),
  ]
}

export default function App() {
  const [signs, setSigns] = useState<Sign[]>(createInitialSigns)
  const [selectedId, setSelectedId] = useState<string>(() => signs[0].id)
  const selectedSign = useMemo<Sign>(
    () => signs.find(sign => sign.id === selectedId) ?? signs[0],
    [selectedId, signs],
  )

  const addSign = useCallback(() => {
    const sign = createSign()
    setSigns(current => [...current, sign])
    setSelectedId(sign.id)
  }, [])

  const updateSign = useCallback((updates: Partial<Sign>) => {
    setSigns(current => current.map(sign => {
      if (sign.id !== selectedId) return sign
      const next = { ...sign, ...updates }
      const normalized = normalizeSign(next)
      return { ...next, ...normalized, name: cleanName(next.name, normalized.digits) }
    }))
  }, [selectedId])

  const deleteSign = useCallback((id: string) => {
    setSigns(current => {
      if (current.length === 1) return current
      const next = current.filter(sign => sign.id !== id)
      if (id === selectedId) setSelectedId(next[0].id)
      return next
    })
  }, [selectedId])

  return (
    <div className="flex h-dvh flex-col bg-background">
      <Header />
      <main className="grid min-h-0 flex-1 grid-cols-[14rem_minmax(0,1fr)_20rem] max-lg:grid-cols-[12rem_minmax(0,1fr)] max-md:grid-cols-1 max-md:grid-rows-[auto_minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
        <div>
          <SignList signs={signs} selectedId={selectedId} onSelect={setSelectedId} onAdd={addSign} onDelete={deleteSign} />
        </div>
        <SignPreview sign={selectedSign} />
        <div className="max-lg:col-span-2 max-lg:max-h-72 max-md:col-span-1 max-md:max-h-none">
          <SignSettings sign={selectedSign} onChange={updateSign} />
        </div>
      </main>
    </div>
  )
}
