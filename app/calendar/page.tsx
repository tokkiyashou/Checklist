'use client'

// 캘린더 페이지: 날짜별 예정/완료 항목 조회, 드래그 일정 생성, 시간 설정 지원
import dynamic from 'next/dynamic'
import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useChecklists, useCreateChecklist, useUpdateChecklistCompletedAt, useDeleteChecklist } from '@/lib/hooks/useChecklists'
import { formatDisplayDate, addDays, toISODate } from '@/lib/dateUtils'
import { getItems } from '@/lib/storage/localStorage'
import type { Checklist, Item } from '@/types'

const Calendar = dynamic(() => import('@/components/Calendar'), { ssr: false })

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

function getLocalDate(completedAt: string): string {
  if (completedAt.length <= 10) return completedAt
  return localDateStr(new Date(completedAt))
}

function hasTime(completedAt: string): boolean {
  return completedAt.length > 10
}

function isoToTimeValue(completedAt: string): string {
  if (!hasTime(completedAt)) return ''
  const d = new Date(completedAt)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function setTimeOnDate(completedAt: string, timeValue: string): string {
  const datePart = getLocalDate(completedAt)
  const d = new Date(`${datePart}T00:00:00`)
  const [h, m] = timeValue.split(':').map(Number)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

const MERIDIEM = ['오전', '오후']
const HOURS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))
const DRUM_H = 40

function DrumPicker({ items, selectedIndex, onSelect }: {
  items: string[]
  selectedIndex: number
  onSelect: (i: number) => void
}) {
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    e.stopPropagation()
    onSelect(Math.max(0, Math.min(items.length - 1, selectedIndex + (e.deltaY > 0 ? 1 : -1))))
  }
  return (
    <div
      className="relative overflow-hidden select-none"
      style={{
        height: DRUM_H * 5,
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 28%, black 72%, transparent 100%)',
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 28%, black 72%, transparent 100%)',
      }}
      onWheel={handleWheel}
    >
      <div
        className="absolute w-full transition-transform duration-200 ease-out"
        style={{ transform: `translateY(${(2 - selectedIndex) * DRUM_H}px)` }}
      >
        {items.map((item, i) => {
          const dist = Math.abs(i - selectedIndex)
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`w-full flex items-center justify-center transition-all duration-200 ${
                dist === 0
                  ? 'text-[17px] font-semibold text-zinc-900 dark:text-zinc-100'
                  : dist === 1
                  ? 'text-[14px] text-zinc-400 dark:text-zinc-500'
                  : 'text-[12px] text-zinc-300 dark:text-zinc-600'
              }`}
              style={{ height: DRUM_H }}
            >
              {item}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TimeEditModal({
  completedAt,
  onSave,
  onClose,
}: {
  completedAt: string | undefined
  onSave: (newValue: string) => void
  onClose: () => void
}) {
  const [allDay, setAllDay] = useState(!completedAt || !hasTime(completedAt))
  const [dateStr, setDateStr] = useState(() => completedAt ? getLocalDate(completedAt) : localDateStr())

  const [meridiemIdx, setMeridiemIdx] = useState(() => {
    const src = completedAt && hasTime(completedAt) ? isoToTimeValue(completedAt) : isoToTimeValue(new Date().toISOString())
    const h = parseInt(src.split(':')[0], 10)
    return h >= 12 ? 1 : 0
  })
  const [hourIdx, setHourIdx] = useState(() => {
    const src = completedAt && hasTime(completedAt) ? isoToTimeValue(completedAt) : isoToTimeValue(new Date().toISOString())
    const h = parseInt(src.split(':')[0], 10)
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return h12 - 1
  })
  const [minuteIdx, setMinuteIdx] = useState(() => {
    const src = completedAt && hasTime(completedAt) ? isoToTimeValue(completedAt) : isoToTimeValue(new Date().toISOString())
    return parseInt(src.split(':')[1], 10)
  })

  function shiftDate(delta: number) {
    const d = new Date(`${dateStr}T00:00:00`)
    d.setDate(d.getDate() + delta)
    setDateStr(localDateStr(d))
  }

  function get24h(): string {
    const hour12 = hourIdx + 1
    const hour24 = meridiemIdx === 0
      ? (hour12 === 12 ? 0 : hour12)
      : (hour12 === 12 ? 12 : hour12 + 12)
    return `${hour24.toString().padStart(2, '0')}:${minuteIdx.toString().padStart(2, '0')}`
  }

  function handleSave() {
    if (allDay) {
      onSave(dateStr)
    } else {
      const [h, m] = get24h().split(':').map(Number)
      const d = new Date(`${dateStr}T00:00:00`)
      d.setHours(h, m, 0, 0)
      onSave(d.toISOString())
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-5 w-80 mx-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">시간 설정</h2>

        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => shiftDate(-1)}
            className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {formatDisplayDate(dateStr)}
          </span>
          <button
            onClick={() => shiftDate(1)}
            className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">하루 종일</span>
          <button
            role="switch"
            aria-checked={allDay}
            onClick={() => setAllDay(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
              allDay ? 'bg-blue-500' : 'bg-zinc-200 dark:bg-zinc-700'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
              allDay ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {!allDay && (
          <div className="relative mb-4" style={{ height: DRUM_H * 5 }}>
            <div
              className="absolute inset-x-0 bg-zinc-100 dark:bg-zinc-800 rounded-xl pointer-events-none"
              style={{ top: DRUM_H * 2, height: DRUM_H }}
            />
            <div className="absolute inset-0 flex">
              <div className="flex-1">
                <DrumPicker items={MERIDIEM} selectedIndex={meridiemIdx} onSelect={setMeridiemIdx} />
              </div>
              <div className="w-px bg-zinc-200 dark:bg-zinc-700 my-3 self-stretch" />
              <div className="flex-1">
                <DrumPicker items={HOURS} selectedIndex={hourIdx} onSelect={setHourIdx} />
              </div>
              <div className="w-px bg-zinc-200 dark:bg-zinc-700 my-3 self-stretch" />
              <div className="flex-1">
                <DrumPicker items={MINUTES} selectedIndex={minuteIdx} onSelect={setMinuteIdx} />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-sm text-zinc-400 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">취소</button>
          <button onClick={handleSave} className="text-sm text-blue-500 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">저장</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function ScheduledRow({ cl, onDelete }: { cl: Checklist; onDelete: () => void }) {
  const isWork = cl.kind === 'work'
  const [pendingDelete, setPendingDelete] = useState(false)

  useEffect(() => {
    if (!pendingDelete) return
    const t = setTimeout(() => setPendingDelete(false), 3000)
    return () => clearTimeout(t)
  }, [pendingDelete])

  return (
    <div className="flex items-center gap-2 py-2">
      <span className="text-sm text-zinc-900 dark:text-zinc-100 font-medium truncate flex-1 min-w-0">
        {cl.title}
      </span>
      <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
        isWork
          ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-500 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800/50'
          : 'bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 border-blue-100 dark:border-blue-800/50'
      }`}>
        {isWork ? '워크' : '체크리스트'}
      </span>
      <button
        onClick={() => { if (pendingDelete) onDelete(); else setPendingDelete(true) }}
        className={`shrink-0 text-[10px] font-medium transition-colors ${
          pendingDelete
            ? 'text-red-500 dark:text-red-400'
            : 'text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400'
        }`}
        aria-label="삭제"
      >
        {pendingDelete ? '확인' : (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 3h8M5 3V2h2v1M4.5 3v6M7.5 3v6M3 3l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    </div>
  )
}

function CompletedRow({ cl }: { cl: Checklist }) {
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const update = useUpdateChecklistCompletedAt()
  const deleteChecklist = useDeleteChecklist()
  const isWork = cl.kind === 'work'

  const items = useMemo(() => {
    if (!expanded) return []
    return getItems(cl.id).sort((a, b) => a.sortOrder - b.sortOrder)
  }, [cl.id, expanded])

  useEffect(() => {
    if (!pendingDelete) return
    const t = setTimeout(() => setPendingDelete(false), 3000)
    return () => clearTimeout(t)
  }, [pendingDelete])

  const displayTime = cl.completedAt ? isoToTimeValue(cl.completedAt) : ''

  return (
    <div>
    <div className="flex items-center gap-2 py-2">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-sm text-zinc-900 dark:text-zinc-100 font-medium truncate min-w-0">
          {cl.title}
        </span>
        {!isWork && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="shrink-0 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            aria-label={expanded ? '접기' : '펼치기'}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M4 2l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
        isWork
          ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-500 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800/50'
          : 'bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 border-blue-100 dark:border-blue-800/50'
      }`}>
        {isWork ? '워크' : '체크리스트'}
      </span>

      <button
        onClick={() => setShowTimeModal(true)}
        className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0 hover:text-zinc-600 dark:hover:text-zinc-300 tabular-nums"
      >
        {displayTime || '하루 종일'}
      </button>

      {showTimeModal && (
        <TimeEditModal
          completedAt={cl.completedAt}
          onSave={(newValue) => {
            update.mutate({ id: cl.id, completedAt: newValue })
            setShowTimeModal(false)
          }}
          onClose={() => setShowTimeModal(false)}
        />
      )}

      <button
        onClick={() => {
          if (pendingDelete) {
            deleteChecklist.mutate(cl.id)
          } else {
            setPendingDelete(true)
          }
        }}
        className={`shrink-0 text-[10px] font-medium transition-colors ${
          pendingDelete
            ? 'text-red-500 dark:text-red-400'
            : 'text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400'
        }`}
        aria-label="삭제"
      >
        {pendingDelete ? '확인' : (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 3h8M5 3V2h2v1M4.5 3v6M7.5 3v6M3 3l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    </div>

    {expanded && items.length > 0 && (
      <div className="ml-4 mb-1 space-y-0.5">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2 py-1">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.isCompleted ? 'bg-zinc-300 dark:bg-zinc-600' : 'bg-blue-400'}`} />
            <span className={`text-xs ${item.isCompleted ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
              {item.content}
            </span>
          </div>
        ))}
      </div>
    )}

    {expanded && items.length === 0 && (
      <p className="ml-4 mb-1 text-xs text-zinc-400 dark:text-zinc-500">항목 없음</p>
    )}
    </div>
  )
}

interface CreateModal {
  date: string
  step: 'select' | 'form'
  kind: 'checklist' | 'work'
  title: string
}

export default function CalendarPage() {
  const { data: checklists = [] } = useChecklists()
  const deleteChecklist = useDeleteChecklist()
  const [selectedDate, setSelectedDate] = useState<string | null>(() => localDateStr())
  const createChecklist = useCreateChecklist()

  const [dragCreateRange, setDragCreateRange] = useState<{ start: string; end: string; label: string } | null>(null)
  const [showDragForm, setShowDragForm] = useState(false)
  const [dragTitle, setDragTitle] = useState('')
  const [createModal, setCreateModal] = useState<CreateModal | null>(null)
  const createInputRef = useRef<HTMLInputElement>(null)

  const { markedDates, itemsByDate } = useMemo(() => {
    const marked = new Set<string>()
    const byDate: Record<string, Item[]> = {}

    for (const cl of checklists) {
      const items = getItems(cl.id)
      for (const item of items) {
        if (item.dueDate) {
          marked.add(item.dueDate)
          if (!byDate[item.dueDate]) byDate[item.dueDate] = []
          byDate[item.dueDate].push(item)
        }
      }
    }

    for (const cl of checklists) {
      if (cl.dateRange) {
        let d = cl.dateRange.start
        while (d <= cl.dateRange.end) {
          marked.add(d)
          d = toISODate(addDays(new Date(d + 'T00:00:00'), 1))
        }
      }
    }

    return { markedDates: marked, itemsByDate: byDate }
  }, [checklists])

  const scheduledOnDate = useMemo(() => {
    const date = selectedDate ?? localDateStr()
    return checklists.filter(cl => cl.scheduledDate === date && !cl.isCompleted)
  }, [checklists, selectedDate])

  // Timed items first (ascending), then 하루 종일 items
  const completedOnDate = useMemo(() => {
    const date = selectedDate ?? localDateStr()
    return checklists
      .filter(cl => cl.isCompleted && cl.completedAt && getLocalDate(cl.completedAt) === date)
      .sort((a, b) => {
        const aHasTime = hasTime(a.completedAt!)
        const bHasTime = hasTime(b.completedAt!)
        if (aHasTime && bHasTime) return a.completedAt!.localeCompare(b.completedAt!)
        if (aHasTime) return -1
        if (bHasTime) return 1
        return 0
      })
  }, [checklists, selectedDate])

  function handleLongPress(date: string) {
    setCreateModal({ date, step: 'select', kind: 'checklist', title: '' })
  }

  function handleDragCreate(start: string, end: string) {
    const label = start === end
      ? formatDisplayDate(start)
      : `${formatDisplayDate(start)} ~ ${formatDisplayDate(end)}`
    setDragCreateRange({ start, end, label })
    setShowDragForm(true)
  }

  const effectiveDate = selectedDate ?? localDateStr()
  const selectedItems = itemsByDate[effectiveDate] ?? []

  return (
    <div>
      <Calendar
        markedDates={markedDates}
        onDateClick={setSelectedDate}
        onDragCreate={handleDragCreate}
        selectedDate={selectedDate}
        onLongPress={handleLongPress}
      />

      {showDragForm && dragCreateRange && (
        <div className="px-4 py-3 bg-white dark:bg-zinc-900 rounded-2xl mx-4 mt-2 shadow-sm">
          <p className="text-xs text-blue-400 mb-2">{dragCreateRange.label}</p>
          <input
            autoFocus
            type="text"
            value={dragTitle}
            onChange={e => setDragTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && dragTitle.trim()) {
                createChecklist.mutate({ title: dragTitle.trim(), dateRange: dragCreateRange })
                setDragTitle('')
                setShowDragForm(false)
              }
              if (e.key === 'Escape') {
                setDragTitle('')
                setShowDragForm(false)
              }
            }}
            placeholder="일정 이름..."
            className="w-full bg-transparent outline-none text-sm text-zinc-900 dark:text-zinc-100"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => { setDragTitle(''); setShowDragForm(false) }}
              className="text-sm text-zinc-400 px-3 py-1"
            >취소</button>
            <button
              disabled={!dragTitle.trim()}
              onClick={() => {
                if (dragTitle.trim()) {
                  createChecklist.mutate({ title: dragTitle.trim(), dateRange: dragCreateRange })
                  setDragTitle('')
                  setShowDragForm(false)
                }
              }}
              className="text-sm text-blue-500 font-medium px-3 py-1 disabled:text-zinc-300"
            >만들기</button>
          </div>
        </div>
      )}

      {selectedItems.length > 0 && (
        <div className="px-4 mt-3">
          <h3 className="text-sm font-medium text-zinc-500 mb-2">
            {formatDisplayDate(effectiveDate)}
          </h3>
          {selectedItems.map(item => (
            <div key={item.id} className="flex items-center gap-2 py-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${item.isCompleted ? 'bg-zinc-300' : 'bg-blue-400'}`} />
              <span className={`text-sm ${item.isCompleted ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                {item.content}
              </span>
            </div>
          ))}
        </div>
      )}

      {scheduledOnDate.length > 0 && (
        <div className="px-4 mt-4">
          <h3 className="text-xs font-medium text-zinc-400 dark:text-zinc-500 mb-1 uppercase tracking-wide">
            예정된 작업
          </h3>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {scheduledOnDate.map(cl => (
              <ScheduledRow
                key={cl.id}
                cl={cl}
                onDelete={() => deleteChecklist.mutate(cl.id)}
              />
            ))}
          </div>
        </div>
      )}

      {completedOnDate.length > 0 && (
        <div className="px-4 mt-4 pb-4">
          <h3 className="text-xs font-medium text-zinc-400 dark:text-zinc-500 mb-1 uppercase tracking-wide">
            완료된 항목
          </h3>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {completedOnDate.map(cl => (
              <CompletedRow key={cl.id} cl={cl} />
            ))}
          </div>
        </div>
      )}

      {createModal && createPortal(
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setCreateModal(null)} />
          <div
            className="absolute bottom-20 left-4 right-4 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
                {createModal.step === 'select'
                  ? '무엇을 만들까요?'
                  : createModal.kind === 'work' ? '⚡ 워크 이름' : '☑️ 체크리스트 이름'}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-400">{formatDisplayDate(createModal.date)}</span>
                <button
                  onClick={() => setCreateModal(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>

            {createModal.step === 'select' && (
              <div className="p-3 flex gap-2">
                <button
                  onClick={() => setCreateModal(m => m ? { ...m, step: 'form', kind: 'checklist' } : null)}
                  className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors active:scale-95"
                >
                  <span className="text-2xl">☑️</span>
                  <span className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">체크리스트</span>
                </button>
                <button
                  onClick={() => setCreateModal(m => m ? { ...m, step: 'form', kind: 'work' } : null)}
                  className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors active:scale-95"
                >
                  <span className="text-2xl">⚡</span>
                  <span className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">워크</span>
                </button>
              </div>
            )}

            {createModal.step === 'form' && (
              <div className="p-4">
                <input
                  ref={createInputRef}
                  autoFocus
                  type="text"
                  value={createModal.title}
                  onChange={e => setCreateModal(m => m ? { ...m, title: e.target.value } : null)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && createModal.title.trim()) {
                      createChecklist.mutate({ title: createModal.title.trim(), kind: createModal.kind, scheduledDate: createModal.date })
                      setCreateModal(null)
                    }
                    if (e.key === 'Escape') setCreateModal(null)
                  }}
                  placeholder={createModal.kind === 'work' ? '워크 이름 입력...' : '체크리스트 이름 입력...'}
                  className="w-full bg-transparent outline-none text-[17px] font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                />
                <div className="flex justify-between items-center mt-4">
                  <button
                    type="button"
                    onClick={() => setCreateModal(m => m ? { ...m, step: 'select', title: '' } : null)}
                    className="text-[13px] text-zinc-400 dark:text-zinc-500"
                  >
                    ← 뒤로
                  </button>
                  <button
                    disabled={!createModal.title.trim()}
                    onClick={() => {
                      if (!createModal.title.trim()) return
                      createChecklist.mutate({ title: createModal.title.trim(), kind: createModal.kind, scheduledDate: createModal.date })
                      setCreateModal(null)
                    }}
                    className="text-[13px] text-white font-semibold px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:text-zinc-400 dark:disabled:text-zinc-500 transition-colors"
                  >
                    만들기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
