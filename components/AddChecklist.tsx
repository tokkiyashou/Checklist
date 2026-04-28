'use client'

// FAB 버튼 + 하단 시트: 체크리스트/워크 타입 선택 후 제목 입력으로 생성
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { useCreateChecklist } from '@/lib/hooks/useChecklists'
import { formatDisplayDate, toISODate } from '@/lib/dateUtils'

const Calendar = dynamic(() => import('@/components/Calendar'), { ssr: false })

interface AddChecklistProps {
  onDone?: () => void
}

export interface AddChecklistRef {
  open: () => void
  openChecklist: () => void
  openWork: () => void
}

type Step = 'idle' | 'select' | 'form'

const AddChecklist = forwardRef<AddChecklistRef, AddChecklistProps>(
  function AddChecklist({ onDone }, ref) {
    const [step, setStep] = useState<Step>('idle')
    const [kind, setKind] = useState<'checklist' | 'work'>('checklist')
    const [title, setTitle] = useState('')
    const [scheduledDate, setScheduledDate] = useState<string>(toISODate(new Date()))
    const [showCalPicker, setShowCalPicker] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const create = useCreateChecklist()

    useImperativeHandle(ref, () => ({
      open: () => setStep('select'),
      openChecklist: () => { setKind('checklist'); setStep('form') },
      openWork: () => { setKind('work'); setStep('form') },
    }))

    useEffect(() => {
      if (step === 'form') {
        setScheduledDate(toISODate(new Date()))
        inputRef.current?.focus()
      }
    }, [step])

    function selectKind(k: 'checklist' | 'work') {
      setKind(k)
      setStep('form')
    }

    function handleSubmit(e: React.FormEvent) {
      e.preventDefault()
      const trimmed = title.trim()
      if (!trimmed) return
      create.mutate({ title: trimmed, kind, scheduledDate })
      setTitle('')
      setScheduledDate(toISODate(new Date()))
      setShowCalPicker(false)
      setStep('idle')
      onDone?.()
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      if (e.key === 'Escape') close()
    }

    function close() {
      setTitle('')
      setScheduledDate(toISODate(new Date()))
      setShowCalPicker(false)
      setStep('idle')
    }

    return (
      <>
        {/* Backdrop */}
        {step !== 'idle' && (
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={close}
          />
        )}

        {/* Calendar picker overlay */}
        {step === 'form' && showCalPicker && createPortal(
          <>
            <div
              className="fixed inset-0 z-[60]"
              onClick={() => setShowCalPicker(false)}
            />
            <div
              className="fixed left-4 right-4 z-[61] rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              style={{ bottom: 300, boxShadow: '0 8px 40px rgba(0,0,0,0.22)' }}
              onClick={e => e.stopPropagation()}
            >
              <Calendar
                markedDates={new Set()}
                selectedDate={scheduledDate}
                onDateClick={(date) => {
                  setScheduledDate(date)
                  setShowCalPicker(false)
                }}
              />
            </div>
          </>,
          document.body
        )}

        {/* Type selector bottom sheet */}
        {step === 'select' && (
          <div className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">무엇을 만들까요?</p>
              <button
                onClick={close}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                aria-label="닫기"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="p-3 flex gap-2">
              <button
                onClick={() => selectKind('checklist')}
                className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors active:scale-95"
              >
                <span className="text-2xl">☑️</span>
                <span className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">체크리스트</span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center leading-tight">여러 항목을 관리</span>
              </button>
              <button
                onClick={() => selectKind('work')}
                className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors active:scale-95"
              >
                <span className="text-2xl">⚡</span>
                <span className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">워크</span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center leading-tight">단일 작업 항목</span>
              </button>
            </div>
          </div>
        )}

        {/* Title form */}
        {step === 'form' && (
          <div className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
                {kind === 'work' ? '⚡ 워크 이름' : '☑️ 체크리스트 이름'}
              </p>
              <button
                onClick={close}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                aria-label="닫기"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4">
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={kind === 'work' ? '워크 이름 입력...' : '체크리스트 이름 입력...'}
                className="w-full bg-transparent outline-none text-[17px] font-medium
                           text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
              />
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowCalPicker(v => !v)}
                  className={`flex items-center gap-1.5 text-xs transition-colors rounded-lg px-2 py-1 -ml-2 ${
                    showCalPicker
                      ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-zinc-400 hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="2" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M1 5h12" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M4 1v2M10 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    <circle cx="4.5" cy="8.5" r="0.8" fill="currentColor"/>
                    <circle cx="7" cy="8.5" r="0.8" fill="currentColor"/>
                    <circle cx="9.5" cy="8.5" r="0.8" fill="currentColor"/>
                  </svg>
                  {formatDisplayDate(scheduledDate)}
                </button>
              </div>
              <div className="flex justify-between items-center mt-4">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="text-[13px] text-zinc-400 dark:text-zinc-500"
                >
                  ← 뒤로
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="text-[13px] text-white font-semibold px-5 py-2 rounded-xl
                             bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:text-zinc-400 dark:disabled:text-zinc-500
                             transition-colors"
                >
                  만들기
                </button>
              </div>
            </form>
          </div>
        )}

        {/* FAB */}
        <button
          onClick={() => setStep(s => s === 'idle' ? 'select' : 'idle')}
          aria-label="새 항목 만들기"
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full text-white text-2xl
                     shadow-xl active:scale-95 transition-all flex items-center justify-center z-40"
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            boxShadow: '0 4px 24px rgba(59,130,246,0.4)',
          }}
        >
          <svg
            width="20" height="20" viewBox="0 0 20 20" fill="none"
            style={{ transform: step !== 'idle' ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </>
    )
  }
)

export default AddChecklist
