// 앱 루트 레이아웃: 메타데이터, 전역 Provider, 하단 탭바 포함
import type { Metadata, Viewport } from 'next'
import Providers from '@/components/Providers'
import TabBar from '@/components/TabBar'
import './globals.css'

export const metadata: Metadata = {
  title: '체크리스트',
  description: '빠른 체크리스트 앱',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '체크리스트',
  },
}

export const viewport: Viewport = {
  themeColor: '#3b82f6',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Providers>
          <main className="pb-16 min-h-screen">
            {children}
          </main>
          <TabBar />
        </Providers>
      </body>
    </html>
  )
}
