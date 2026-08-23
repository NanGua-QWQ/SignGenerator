'use client'

import {
  Theme,
} from '@radix-ui/themes'
import {
  ThemeProvider as NextThemesProvider, useTheme,
} from 'next-themes'
import {
  useEffect, useState,
} from 'react'

import WorkspacePage from './WorkspacePage'

function ThemedRoot({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { resolvedTheme } = useTheme()
  const [appearance, setAppearance] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAppearance(resolvedTheme === 'dark' ? 'dark' : 'light')
  }, [resolvedTheme])

  return (
    <Theme
      appearance={appearance}
      accentColor="gray"
      grayColor="slate"
      radius="medium"
    >
      <WorkspacePage>
        {children}
      </WorkspacePage>
    </Theme>
  )
}

export default function ThemeProvider({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
    >
      <ThemedRoot>
        {children}
      </ThemedRoot>
    </NextThemesProvider>
  )
}
