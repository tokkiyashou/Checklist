'use client'

// 전역 Provider 래퍼: React Query 클라이언트, 테마, 오프라인 배너 제공
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState, useEffect } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 60 } },
  }))
  const [isOffline, setIsOffline] = useState(
    typeof window !== 'undefined' ? !navigator.onLine : false
  )

  useEffect(() => {
    const onOnline = () => setIsOffline(false)
    const onOffline = () => setIsOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {isOffline && (
          <div className="fixed top-0 left-0 right-0 bg-yellow-400 text-yellow-900 text-xs text-center py-1 z-50">
            오프라인 — 변경 사항이 저장됩니다
          </div>
        )}
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
