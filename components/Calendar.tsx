'use client'

// 월별 캘린더 컴포넌트: 날짜 선택, hover 파동 효과, 마감일 점(dot) 표시
import { useState, useCallback, useRef } from 'react'
import type React from 'react'
import { toISODate, addDays } from '@/lib/dateUtils'

interface CalendarDay {
  date: string
  hasDot: boolean
  isToday: boolean
  isCurrentMonth: boolean
}

interface CalendarProps {
  markedDates: Set<string>
  onDateClick: (date: string) => void
  onDragCreate?: (start: string, end: string) => void
  selectedDate?: string | null
  onLongPress?: (date: string) => void
}

function buildMonthDays(year: number, month: number) {
  const today = toISODate(new Date())
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = (firstDay.getDay() + 6) % 7
  const days: Omit<CalendarDay, 'hasDot'>[] = []

  for (let i = startPad - 1; i >= 0; i--) {
    const d = addDays(firstDay, -(i + 1))
    const iso = toISODate(d)
    days.push({ date: iso, isToday: iso === today, isCurrentMonth: false })
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ date: iso, isToday: iso === today, isCurrentMonth: true })
  }
  while (days.length < 42) {
    const last = days[days.length - 1]
    const d = addDays(new Date(last.date + 'T00:00:00'), 1)
    const iso = toISODate(d)
    days.push({ date: iso, isToday: iso === today, isCurrentMonth: false })
  }
  return days
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']
const DRAG_CREATE_ENABLED = false

export default function Calendar({ markedDates, onDateClick, onDragCreate, selectedDate, onLongPress }: CalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [dragStart, setDragStart] = useState<string | null>(null)
  const [dragEnd, setDragEnd] = useState<string | null>(null)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [pressedIdx, setPressedIdx] = useState<number | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getWaveStyle = useCallback((idx: number): React.CSSProperties => {
    const base: React.CSSProperties = {
      transition: 'transform 0.26s ease-out, box-shadow 0.26s ease-out, background-color 0.15s',
      willChange: 'transform',
      position: 'relative',
    }

    if (pressedIdx !== null) {
      const pr = Math.floor(pressedIdx / 7), pc = pressedIdx % 7
      const r = Math.floor(idx / 7), c = idx % 7
      const dist = Math.sqrt((r - pr) ** 2 + (c - pc) ** 2)
      const factor = Math.max(0, 1 - dist / 6.5)
      if (factor > 0) {
        const push = factor * 18
        const scale = 1 - factor * 0.18
        const delay = (dist * 0.04).toFixed(2)
        return {
          ...base,
          transform: `translateY(${push.toFixed(1)}px) scale(${scale.toFixed(3)})`,
          boxShadow: 'none',
          transition: `transform 0.09s ease-in ${delay}s, box-shadow 0.06s ease-in, background-color 0.15s`,
          zIndex: 0,
        }
      }
      return base
    }

    // Hover wave
    const radius = 2.8
    if (hoveredIdx === null) return base
    const hr = Math.floor(hoveredIdx / 7), hc = hoveredIdx % 7
    const r = Math.floor(idx / 7), c = idx % 7
    const dist = Math.sqrt((r - hr) ** 2 + (c - hc) ** 2)
    const factor = Math.max(0, 1 - dist / radius)
    if (factor === 0) return base
    const lift = factor * 9
    const scale = 1 + factor * 0.16
    const shadow = `0 ${Math.round(factor * 8)}px ${Math.round(factor * 18)}px rgba(0,0,0,${(factor * 0.13).toFixed(2)})`
    return {
      ...base,
      transform: `translateY(-${lift.toFixed(1)}px) scale(${scale.toFixed(3)})`,
      boxShadow: shadow,
      zIndex: Math.round(factor * 20),
    }
  }, [hoveredIdx, pressedIdx])

  const days: CalendarDay[] = buildMonthDays(year, month).map(d => ({
    ...d,
    hasDot: markedDates.has(d.date),
  }))

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  function isDragHighlighted(date: string): boolean {
    if (!dragStart || !dragEnd) return false
    const [start, end] = dragStart <= dragEnd ? [dragStart, dragEnd] : [dragEnd, dragStart]
    return date >= start && date <= end
  }

  return (
    <div className="p-4 select-none">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">‹</button>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          {year}년 {month + 1}월
        </span>
        <button onClick={nextMonth} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">›</button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-xs text-zinc-400 py-1">{d}</div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-y-1"
        onMouseLeave={() => { setHoveredIdx(null) }}
      >
        {days.map((day, idx) => (
          <button
            key={day.date}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              setPressedIdx(idx)
              onDateClick(day.date)
              if (DRAG_CREATE_ENABLED) setDragStart(day.date)
              if (onLongPress) {
                longPressTimer.current = setTimeout(() => {
                  longPressTimer.current = null
                  onLongPress(day.date)
                }, 1000)
              }
            }}
            onPointerEnter={() => { if (DRAG_CREATE_ENABLED && dragStart) setDragEnd(day.date) }}
            onPointerUp={() => {
              if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
              setPressedIdx(null)
              if (DRAG_CREATE_ENABLED && dragStart && dragEnd && dragStart !== dragEnd && onDragCreate) {
                const [start, end] = dragStart <= dragEnd ? [dragStart, dragEnd] : [dragEnd, dragStart]
                onDragCreate(start, end)
              }
              setDragStart(null)
              setDragEnd(null)
            }}
            onPointerLeave={() => {
              if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
              setPressedIdx(null)
            }}
            onMouseEnter={() => setHoveredIdx(idx)}
            style={getWaveStyle(idx)}
            className={`flex flex-col items-center py-1.5 rounded-xl text-sm touch-none
              ${isDragHighlighted(day.date)
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                : day.isToday
                  ? 'bg-blue-500 text-white hover:bg-blue-400'
                  : selectedDate === day.date
                    ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold'
                    : day.isCurrentMonth
                      ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                      : 'text-zinc-300 dark:text-zinc-700'
              }
            `}
          >
            {day.date.split('-')[2].replace(/^0/, '')}
            {day.hasDot && (
              <span className={`w-1 h-1 rounded-full mt-0.5 ${day.isToday ? 'bg-white' : 'bg-blue-400'}`} />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
