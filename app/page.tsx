'use client'

// 메인 체크리스트 페이지: 오늘 날짜 기준으로 활성/완료 목록 분리 표시
import { useRef } from 'react'
import { useChecklists } from '@/lib/hooks/useChecklists'
import ChecklistCard from '@/components/ChecklistCard'
import EmptyState from '@/components/EmptyState'
import AddChecklist, { type AddChecklistRef } from '@/components/AddChecklist'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { useMidnightRefresh } from '@/lib/hooks/useMidnightRefresh'
import { toISODate } from '@/lib/dateUtils'

export default function ChecklistPage() {
  const { data: checklists = [], isLoading } = useChecklists()
  const addRef = useRef<AddChecklistRef>(null)

  useMidnightRefresh()

  useKeyboardShortcuts((action) => {
    if (action === 'new-checklist') addRef.current?.openChecklist()
    if (action === 'new-work') addRef.current?.openWork()
  })

  if (isLoading) {
    return (
      <div className="py-4 space-y-3">
        {[1, 2, 3].map(n => (
          <div key={n} className="mx-6 h-20 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  const todayStr = toISODate(new Date())
  const active = checklists.filter(cl => !cl.isCompleted && (!cl.scheduledDate || cl.scheduledDate <= todayStr))
  const done = checklists.filter(cl => {
    if (!cl.isCompleted || !cl.completedAt) return false
    return toISODate(new Date(cl.completedAt)) === todayStr
  })

  return (
    <>
      {active.length === 0 && done.length === 0
        ? <EmptyState variant="main" />
        : (
          <div className="py-4 space-y-3">
            {active.map(cl => (
              <div key={cl.id} className="mx-6">
                <ChecklistCard checklist={cl} />
              </div>
            ))}

            {done.length > 0 && (
              <>
                {active.length > 0 && (
                  <div className="flex items-center gap-3 py-1 mx-6">
                    <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">완료됨</span>
                    <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                  </div>
                )}
                {done.map(cl => (
                  <div key={cl.id} className="mx-6">
                    <ChecklistCard checklist={cl} />
                  </div>
                ))}
              </>
            )}
          </div>
        )
      }
      <AddChecklist ref={addRef} />
    </>
  )
}
