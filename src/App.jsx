import { useCallback, useMemo, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { SignList } from '@/features/sign-generator/SignList'
import { SignPreview } from '@/features/sign-generator/SignPreview'
import { SignSettings } from '@/features/sign-generator/SignSettings'

function cleanDigits(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 4)
}

function cleanProvinceLabel(value) {
  return Array.from(String(value || '').trim()).slice(0, 4).join('')
}

function nameLimitForDigits(digits) {
  return digits.length === 4 ? 6 : 4
}

function cleanName(value, digits) {
  return Array.from(String(value || '')).slice(0, nameLimitForDigits(digits)).join('')
}

function buildSignCode(kind, digits) {
  return `${kind === 'provincial' ? 'S' : 'G'}${digits}`
}

function parseSignCode(value) {
  const code = String(value || '').trim().toUpperCase()
  const national = /^G(\d{1,2}|\d{4})$/.exec(code)
  if (national) return { kind: 'national', digits: national[1] }

  const provincial = /^S(\d{1,2}|\d{4})$/.exec(code)
  if (provincial) return { kind: 'provincial', digits: provincial[1], provinceLabel: '粤高速' }

  const legacyProvincial = /^(.)(S(\d{1,2}|\d{4}))$/u.exec(code)
  if (legacyProvincial) return { kind: 'provincial', digits: legacyProvincial[3], provinceLabel: `${legacyProvincial[1]}高速` }

  return { kind: 'national', digits: cleanDigits(code) || '15' }
}

function normalizeSign(overrides = {}) {
  const parsed = overrides.kind
    ? { kind: overrides.kind, digits: cleanDigits(overrides.digits), provinceLabel: overrides.provinceLabel }
    : parseSignCode(overrides.code || 'G15')
  return {
    kind: parsed.kind,
    digits: parsed.digits,
    provinceLabel: parsed.kind === 'provincial' ? cleanProvinceLabel(parsed.provinceLabel) || '粤高速' : '',
    code: buildSignCode(parsed.kind, parsed.digits),
  }
}

function createSign(overrides = {}) {
  const sign = normalizeSign(overrides)
  return {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    ...sign,
    name: cleanName(overrides.name ?? '沈海高速', sign.digits),
  }
}

function createInitialSigns() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code') || 'G15'
  const name = params.has('name') ? params.get('name') : '沈海高速'
  return [
    createSign({ code, name }),
    createSign({ code: 'G0421', name: '许广高速' }),
  ]
}

export default function App() {
  const [signs, setSigns] = useState(createInitialSigns)
  const [selectedId, setSelectedId] = useState(() => signs[0].id)
  const selectedSign = useMemo(
    () => signs.find(sign => sign.id === selectedId) || signs[0],
    [selectedId, signs],
  )

  const addSign = useCallback(() => {
    const sign = createSign()
    setSigns(current => [...current, sign])
    setSelectedId(sign.id)
  }, [])

  const updateSign = useCallback((updates) => {
    setSigns(current => current.map(sign => {
      if (sign.id !== selectedId) return sign
      const next = { ...sign, ...updates }
      const normalized = normalizeSign(next)
      return { ...next, ...normalized, name: cleanName(next.name, normalized.digits) }
    }))
  }, [selectedId])

  const deleteSign = useCallback((id) => {
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
