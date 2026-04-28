'use client'

// 체크리스트/워크 카드: 진행 바, 항목 순차 체크, 이름 편집, 삭제 지원
import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useItems } from '@/lib/hooks/useItems'
import { useDeleteChecklist } from '@/lib/hooks/useChecklists'
import { useCheckNextItem } from '@/lib/hooks/useItems'
import { useToggleWork, useRenameChecklist } from '@/lib/hooks/useChecklists'
import type { Checklist } from '@/types'

interface ChecklistCardProps {
  checklist: Checklist
}

export default function ChecklistCard({ checklist }: ChecklistCardProps) {
  const router = useRouter()
  const isWork = checklist.kind === 'work'
  const { data: items = [] } = useItems(checklist.id)
  const deleteChecklist = useDeleteChecklist()
  const checkNext = useCheckNextItem(checklist.id)
  const toggleWork = useToggleWork()

  const [pendingDone, setPendingDone] = useState(false)
  const [animatingItemId, setAnimatingItemId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const renameChecklist = useRenameChecklist()
  const titleInputRef = useRef<HTMLInputElement>(null)

  const total = items.length
  const completed = items.filter(i => i.isCompleted).length
  const progressPct = isWork
    ? (checklist.isCompleted ? 100 : 0)
    : total > 0 ? Math.round((completed / total) * 100) : 0
  const allDone = isWork ? !!checklist.isCompleted : (total > 0 && completed === total)
  const visuallyDone = (isWork && pendingDone) || allDone
  // 마지막 항목 애니메이션 중에는 완료 상태로 전환하지 않음
  const cardAllDone = isWork ? visuallyDone : (allDone && !animatingItemId)

  function confirmReset() {
    setShowResetModal(false)
    toggleWork.mutate({ id: checklist.id, isCompleted: false })
  }

  function toggleWorkDone() {
    if (checklist.isCompleted) {
      setShowResetModal(true)
    } else {
      setPendingDone(true)
      setTimeout(() => {
        setPendingDone(false)
        toggleWork.mutate({ id: checklist.id, isCompleted: true })
      }, 500)
    }
  }

  function handleCardClick() {
    if (isWork) {
      toggleWorkDone()
      return
    }
    router.push(`/list/${checklist.id}`)
  }

  function handleCheck(e: React.MouseEvent) {
    e.stopPropagation()
    if (isWork) {
      toggleWorkDone()
    } else {
      if (!allDone && !animatingItemId) {
        const sorted = [...items].sort((a, b) =>
          a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)
        )
        const uncompleted = sorted.filter(i => !i.isCompleted)
        if (uncompleted.length === 0) return
        if (uncompleted.length === 1) {
          // 마지막 항목 — 바 애니메이션(550ms) 후 뮤테이션
          setAnimatingItemId(uncompleted[0].id)
          setTimeout(() => {
            setAnimatingItemId(null)
            checkNext.mutate()
          }, 550)
        } else {
          checkNext.mutate()
        }
      }
    }
  }

  function startEditTitle(e: React.MouseEvent) {
    e.stopPropagation()
    setTitleValue(checklist.title)
    setEditingTitle(true)
  }

  function commitTitle() {
    const trimmed = titleValue.trim()
    if (trimmed && trimmed !== checklist.title) {
      renameChecklist.mutate({ id: checklist.id, title: trimmed })
    }
    setEditingTitle(false)
  }

  function cancelTitle() {
    setEditingTitle(false)
  }

  function confirmDelete() {
    setShowDeleteModal(false)
    deleteChecklist.mutate(checklist.id)
  }

  const sortedItems = [...items].sort((a, b) =>
    a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)
  )

  const deleteModal = showDeleteModal ? createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={() => setShowDeleteModal(false)}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl"
        style={{ width: 270 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 text-center">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-[16px] mb-1.5">
            삭제하시겠습니까?
          </p>
          <p className="text-[13px] text-zinc-400 dark:text-zinc-500 truncate px-2">
            "{checklist.title}"
          </p>
        </div>
        <div className="flex border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setShowDeleteModal(false)}
            className="flex-1 py-3.5 text-[15px] font-medium text-zinc-500 dark:text-zinc-400
                       border-r border-zinc-200 dark:border-zinc-700
                       active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors"
          >
            취소
          </button>
          <button
            onClick={confirmDelete}
            className="flex-1 py-3.5 text-[15px] font-semibold text-red-500
                       active:bg-red-50 dark:active:bg-red-900/20 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  const resetModal = showResetModal ? createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={() => setShowResetModal(false)}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl"
        style={{ width: 270 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 text-center">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-[16px] mb-1.5">
            진행을 초기화할까요?
          </p>
          <p className="text-[13px] text-zinc-400 dark:text-zinc-500 truncate px-2">
            "{checklist.title}"
          </p>
        </div>
        <div className="flex border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setShowResetModal(false)}
            className="flex-1 py-3.5 text-[15px] font-medium text-zinc-500 dark:text-zinc-400
                       border-r border-zinc-200 dark:border-zinc-700
                       active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors"
          >
            취소
          </button>
          <button
            onClick={confirmReset}
            className="flex-1 py-3.5 text-[15px] font-semibold text-orange-500
                       active:bg-orange-50 dark:active:bg-orange-900/20 transition-colors"
          >
            초기화
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      {deleteModal}
      {resetModal}

      {/* X 버튼 + 카드를 relative 래퍼로 감싸 버블링 차단 */}
      <div className="relative">
        {/* 연필/체크 버튼 */}
        <button
          onPointerDown={e => {
            e.stopPropagation()
            if (editingTitle) e.preventDefault() // input blur 방지 → commitTitle이 먼저 실행됨
          }}
          onClick={editingTitle
            ? (e) => { e.stopPropagation(); commitTitle() }
            : startEditTitle
          }
          className={`absolute top-3 right-11 z-10 w-7 h-7 flex items-center justify-center rounded-full
                     transition-all active:scale-90 ${
                       editingTitle
                         ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                         : 'text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                     }`}
          style={{ touchAction: 'manipulation' }}
          aria-label={editingTitle ? '이름 저장' : '이름 수정'}
        >
          {editingTitle ? (
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        {/* X 버튼 — 카드 div 바깥에 위치, 이벤트 전파 없음 */}
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setShowDeleteModal(true)}
          className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full
                     text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400
                     hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-90"
          style={{ touchAction: 'manipulation' }}
          aria-label="삭제"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* 카드 */}
        <div
          onClick={handleCardClick}
          role="link"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter') handleCardClick() }}
          className={`block rounded-2xl p-4 transition-all active:scale-[0.98] border cursor-pointer ${
            cardAllDone
              ? 'bg-[rgb(var(--card-done))] border-zinc-200 dark:border-zinc-700/50'
              : 'bg-[rgb(var(--card))] border-zinc-200/80 dark:border-zinc-700/30'
          }`}
          style={{ boxShadow: cardAllDone ? 'none' : '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          {/* 헤더 — 연필+X 버튼 영역(오른쪽 56px) 확보 */}
          <div className="flex items-start gap-2 mb-3 pr-14">
            <div className="flex items-center gap-2 min-w-0">
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  autoFocus
                  value={titleValue}
                  onChange={e => setTitleValue(e.target.value)}
                  onBlur={cancelTitle}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); commitTitle() }
                    if (e.key === 'Escape') { e.preventDefault(); cancelTitle() }
                  }}
                  onClick={e => e.stopPropagation()}
                  className="font-semibold text-[17px] leading-tight bg-transparent outline-none
                             border-b border-zinc-300 dark:border-zinc-600
                             text-zinc-900 dark:text-zinc-100 w-full"
                />
              ) : (
                <h2 className={`font-semibold text-[17px] leading-tight truncate ${
                  cardAllDone
                    ? 'text-zinc-400 dark:text-zinc-500 line-through'
                    : 'text-zinc-900 dark:text-zinc-100'
                }`}>
                  {checklist.title}
                </h2>
              )}
              {isWork ? (
                <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-900/30 text-yellow-500 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-800/50">
                  워크
                </span>
              ) : (
                <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                  체크리스트
                </span>
              )}
            </div>
          </div>

        {/* 진행 바 */}
        <div className="mb-3">
          {isWork ? (
            <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pendingDone ? 100 : progressPct}%`,
                  background: '#16a34a',
                }}
              />
            </div>
          ) : total > 0 ? (
            <div>
              <div className="flex gap-1 mb-1.5">
                {sortedItems.map(item => (
                  <div key={item.id} className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: (item.isCompleted || item.id === animatingItemId) ? '100%' : '0%', background: '#16a34a' }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                {sortedItems.map(item => (
                  <div key={item.id} className="flex-1 min-w-0 text-center">
                    <span className={`block text-[10px] leading-tight truncate ${
                      (item.isCompleted || item.id === animatingItemId) ? 'text-zinc-400 dark:text-zinc-500' : 'text-white'
                    }`}>
                      {item.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
            {isWork
              ? (cardAllDone ? '완료' : '미완료')
              : total > 0 ? `${completed}/${total}` : '항목 없음'
            }
          </span>
          <button
            onClick={handleCheck}
            disabled={!isWork && (cardAllDone || !!animatingItemId)}
            aria-label={isWork ? (cardAllDone ? '완료 취소' : '워크 완료') : '다음 항목'}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
              cardAllDone
                ? 'bg-green-50 dark:bg-green-900/20 text-green-500 border border-green-200 dark:border-green-800/50'
                : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800/50'
            }`}
          >
            {isWork ? (
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          </div>
        </div>
      </div>
    </>
  )
}
