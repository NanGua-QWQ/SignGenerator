import {
  ThemeProvider as NextThemesProvider,
} from 'next-themes'
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
  description: '可视化导入方块模型与贴图，摆放文本，一键生成 Minecraft 模组 Java 与资源文件',
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
  keywords: ['道路标牌', '标牌生成器', '交通标志', '路牌', 'Minecraft 模组', '方块模型'],
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: '道路标牌生成器',
    title: '道路标牌生成器',
    description: '可视化导入方块模型与贴图，摆放文本，一键生成 Java 与资源文件',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: '道路标牌生成器',
    description: '可视化导入方块模型与贴图，摆放文本，一键生成 Java 与资源文件',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#141218' },
  ],
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
        {/* 主题类（light / dark）由 next-themes 打在 <html> 上，
            globals.css 里的 --md-sys-color-* 两套常量据此切换 */}
        <NextThemesProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          {children}
        </NextThemesProvider>
      </body>
    </html>
  )
}
