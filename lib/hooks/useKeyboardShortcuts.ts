'use client'

// 키보드 단축키 훅: Ctrl+N (체크리스트 생성), Ctrl+Shift+N (워크 생성)
import { useEffect } from 'react'
import type { ShortcutAction } from '@/lib/shortcuts'

type Handler = (action: ShortcutAction) => void

export function useKeyboardShortcuts(handler: Handler) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      const key = e.key.toLowerCase()

      if (e.ctrlKey && e.shiftKey && key === 'n') {
        e.preventDefault()
        handler('new-work')
      } else if (e.ctrlKey && !e.shiftKey && key === 'n') {
        e.preventDefault()
        handler('new-checklist')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handler])
}
