import type {
  Metadata,
} from 'next'

import './globals.css'
// @ts-expect-error 导入它本身而不是作为模块
import applyDarkmode from './applyDarkmode.raw.ts'

import {
  FontsProvider,
} from '@/fonts/FontsProvider'

export const metadata: Metadata = {
  title: {
    default: '道路标牌生成器',
    template: '生成%s - 道路标牌生成器',
  },
  description: '生成道路标牌',
}

export default function RootLayout({
  children,
}: Readonly<{
    children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: applyDarkmode,
          }}
        />
      </head>
      <body className="flex h-dvh flex-col bg-background">
        <FontsProvider>
          {children}
        </FontsProvider>
      </body>
    </html>
  )
}
