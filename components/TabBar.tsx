'use client'

// 하단 탭 내비게이션: 체크리스트/캘린더 탭 + 다크모드 토글 버튼
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'

export default function TabBar() {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const tabs = [
    {
      href: '/',
      label: '체크리스트',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="3" y="3" width="16" height="16" rx="4" stroke={active ? '#0064FF' : '#A1A1AA'} strokeWidth="1.5"/>
          <path d="M7 11l3 3 5-5" stroke={active ? '#0064FF' : '#A1A1AA'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      href: '/calendar',
      label: '캘린더',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="3" y="5" width="16" height="14" rx="3" stroke={active ? '#0064FF' : '#A1A1AA'} strokeWidth="1.5"/>
          <path d="M3 9h16" stroke={active ? '#0064FF' : '#A1A1AA'} strokeWidth="1.5"/>
          <path d="M7 3v4M15 3v4" stroke={active ? '#0064FF' : '#A1A1AA'} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex z-50 pb-safe"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      {tabs.map(tab => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center py-2.5 gap-0.5"
          >
            {tab.icon(active)}
            <span
              className="text-[10px] font-medium"
              style={{ color: active ? '#0064FF' : '#A1A1AA' }}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="px-3 flex items-center justify-center"
        aria-label="테마 전환"
        style={{ color: '#A1A1AA' }}
      >
        <span className="text-lg">
          {mounted ? (resolvedTheme === 'dark' ? '☀️' : '🌙') : '🌙'}
        </span>
      </button>
    </nav>
  )
}
