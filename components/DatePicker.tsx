'use client'

// 날짜 선택기: 오늘/내일/이번 주 프리셋 + 직접 날짜 입력 팝오버
import { getQuickDate, toISODate } from '@/lib/dateUtils'

interface DatePickerProps {
  value?: string     // ISO date YYYY-MM-DD
  onChange: (date: string | undefined) => void
  onClose: () => void
}

export default function DatePicker({ value, onChange, onClose }: DatePickerProps) {
  const presets = [
    { label: '오늘', value: getQuickDate('today') },
    { label: '내일', value: getQuickDate('tomorrow') },
    { label: '이번 주', value: getQuickDate('this-week') },
  ]

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl
                    border border-zinc-100 dark:border-zinc-800 p-3 min-w-48">
      <div className="space-y-1 mb-3">
        {presets.map(p => (
          <button
            key={p.value}
            onClick={() => { onChange(p.value); onClose() }}
            className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-opacity
              ${value === p.value
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:opacity-70'
                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <input
        type="date"
        value={value ?? ''}
        min={toISODate(new Date())}
        onChange={e => { onChange(e.target.value || undefined); onClose() }}
        className="w-full text-sm text-zinc-700 dark:text-zinc-300 bg-transparent
                   border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2"
      />

      {value && (
        <button
          onClick={() => { onChange(undefined); onClose() }}
          className="w-full text-sm text-red-400 mt-2 py-1"
        >
          날짜 제거
        </button>
      )}
    </div>
  )
}
