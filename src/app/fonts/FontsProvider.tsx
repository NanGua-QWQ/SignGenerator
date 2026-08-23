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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadFontBuffers()
      .then(next => {
        if (!cancelled)  setBuffers(next)
      })
      .catch(error => {
        console.error(error)
        if (!cancelled)
          setError(error instanceof Error ? error.message : '字体加载失败')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <FontProvider buffers={buffers} error={error}>
      {children}
    </FontProvider>
  )
}
