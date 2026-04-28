'use client'

// 체크리스트 개별 항목: 완료 토글, 인라인 텍스트 편집, 날짜 설정, 드래그 핸들 지원
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Item } from '@/types'
import { formatDisplayDate } from '@/lib/dateUtils'
import DatePicker from '@/components/DatePicker'

interface ChecklistItemProps {
  item: Item
  onToggle: (id: string, isCompleted: boolean) => void
  onDelete: (id: string) => void
  onContentChange: (id: string, content: string) => void
  onDateChange?: (id: string, dueDate: string | undefined) => void
  dragHandle?: React.ReactNode
}

export default function ChecklistItem({
  item, onToggle, onDelete, onContentChange, onDateChange, dragHandle,
}: ChecklistItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.content)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dateButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function handleBlur() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== item.content) {
      onContentChange(item.id, trimmed)
    } else {
      setDraft(item.content)
    }
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === 'Escape') {
      inputRef.current?.blur()
    }
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3
      ${item.isCompleted ? 'opacity-60' : ''}`}
    >
      {dragHandle}

      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id, !item.isCompleted)}
        aria-label={item.isCompleted ? '완료 취소' : '완료'}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
          shrink-0 transition-colors
          ${item.isCompleted
            ? 'bg-blue-500 border-blue-500'
            : 'border-zinc-300 dark:border-zinc-600 hover:border-blue-400'
          }`}
      >
        {item.isCompleted && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent outline-none text-sm
                       text-zinc-900 dark:text-zinc-100"
          />
        ) : (
          <button
            onClick={() => { setDraft(item.content); setEditing(true) }}
            className={`text-sm text-left w-full
              ${item.isCompleted
                ? 'line-through text-zinc-400'
                : 'text-zinc-900 dark:text-zinc-100'
              }`}
          >
            {item.content}
          </button>
        )}
        {item.dueDate && !item.isCompleted && (
          <span className="text-xs text-blue-400 mt-0.5 block">
            {formatDisplayDate(item.dueDate)}
          </span>
        )}
        {/* Date picker trigger */}
        {!item.isCompleted && onDateChange && (
          <div>
            <button
              ref={dateButtonRef}
              onClick={() => setShowDatePicker(s => !s)}
              className="text-xs text-zinc-300 hover:text-blue-400 mt-0.5"
            >
              {item.dueDate ? '📅' : '+ 날짜'}
            </button>
            {showDatePicker && createPortal(
              <div style={{
                position: 'fixed',
                top: (dateButtonRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                left: dateButtonRef.current?.getBoundingClientRect().left ?? 0,
                zIndex: 9999,
              }}>
                <DatePicker
                  value={item.dueDate}
                  onChange={(date) => onDateChange(item.id, date)}
                  onClose={() => setShowDatePicker(false)}
                />
              </div>,
              document.body
            )}
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        aria-label="삭제"
        className="text-zinc-300 dark:text-zinc-600 hover:text-red-400 active:text-red-500
                   transition-colors p-1 shrink-0"
      >
        ×
      </button>
    </div>
  )
}
