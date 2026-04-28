'use client'

// 자정 리프레시 훅: 날짜가 바뀌면 컴포넌트를 자동으로 리렌더링
import { useEffect, useState } from 'react'

export function useMidnightRefresh() {
  const [, setTick] = useState(0)

  useEffect(() => {
    function scheduleNext(): ReturnType<typeof setTimeout> {
      const now = new Date()
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      const ms = midnight.getTime() - now.getTime()
      return setTimeout(() => {
        setTick(t => t + 1)
        scheduleNext()
      }, ms)
    }
    const timer = scheduleNext()
    return () => clearTimeout(timer)
  }, [])
}
