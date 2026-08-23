import type {
  ReactNode,
} from 'react'
import './globals.css'
import type {
  Metadata, Viewport,
} from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://sign-generator.example.com'),
  title: {
    default: '道路标牌生成器',
    template: '生成%s - 道路标牌生成器',
  },
  description: '生成道路标牌',
  applicationName: '道路标牌生成器',
  authors: [
    {
      name: 'Itz_NanGua',
    },
    {
      name: 'Neila',
      url: 'https://neila.top',
    },
  ],
  keywords: ['道路标牌', '标牌生成器', '交通标志', '路牌'],
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: '道路标牌生成器',
    title: '道路标牌生成器',
    description: '生成道路标牌',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: '道路标牌生成器',
    description: '生成道路标牌',
  },
}
export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

import {
  PreviewToolbar,
} from './PreviewToolbar'
import {
  SignPreview,
} from './SignPreview'
import {
  FontsProvider,
} from './fonts/FontsProvider'

import {
  Theme,
} from '@radix-ui/themes'
import {
  ThemeProvider as NextThemesProvider,
} from 'next-themes'

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <NextThemesProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
        >
          <Theme
            accentColor="gray"
            grayColor="slate"
            radius="medium">
            <main style={{
              height: '100vh',
            }} className="grid min-h-0 flex-1 grid-cols-[75vw_1fr] max-lg:grid-cols-[70vh_1fr] max-md:grid-cols-1 max-md:grid-rows-[50vh_1fr]">
              <FontsProvider>
                <SignPreview />
              </FontsProvider>
              <aside className="max-lg:col-span-2 max-lg:max-h-72 max-md:col-span-1 max-md:max-h-none h-full overflow-y-auto border-l bg-background max-lg:border-l-0 max-lg:border-t">
                <PreviewToolbar />
                {children}
              </aside>
            </main>
          </Theme>
        </NextThemesProvider>
      </body>
    </html>
  )
}
