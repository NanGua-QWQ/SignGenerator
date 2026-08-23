import type {
  ReactNode,
} from 'react'
import ThemeProvider from './theme-provider'
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

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
