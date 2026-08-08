'use client'
import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import {
  FontProvider,
} from './FontContext'
import {
  loadFontBuffers,
  type FontBuffers,
} from './loadFontBuffers'

export function FontsProvider({
  children,
}: { children: ReactNode }) {
  const [buffers, setBuffers] = useState<FontBuffers | null>(null)

  useEffect(() => {
    let cancelled = false
    loadFontBuffers()
      .then((next) => {
        if (!cancelled) { setBuffers(next) }
      })
      .catch((error) => {
        console.error(error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!buffers) {
    return null
  }

  return (
    <FontProvider buffers={buffers}>
      {children}
    </FontProvider>
  )
}
