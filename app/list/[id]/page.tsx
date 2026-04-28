'use client'

// 체크리스트 상세 페이지: 항목 추가/완료/삭제/순서 변경(드래그) 지원
import { useState, useRef } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import {
  useItems, useCreateItem, useToggleItem,
  useDeleteItem, useUpdateItemOrder,
} from '@/lib/hooks/useItems'
import { useChecklists } from '@/lib/hooks/useChecklists'
import { updateItem } from '@/lib/storage/localStorage'
import { useQueryClient } from '@tanstack/react-query'
import ChecklistItem from '@/components/ChecklistItem'
import EmptyState from '@/components/EmptyState'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Item } from '@/types'

function SortableItem({
  item,
  onToggle,
  onDelete,
  onContentChange,
  onDateChange,
}: {
  item: Item
  onToggle: (id: string, isCompleted: boolean) => void
  onDelete: (id: string) => void
  onContentChange: (id: string, content: string) => void
  onDateChange?: (id: string, dueDate: string | undefined) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing p-1 touch-none"
      aria-label="순서 변경"
    >
      ⠿
    </button>
  )

  return (
    <div ref={setNodeRef} style={style}>
      <ChecklistItem
        item={item}
        onToggle={onToggle}
        onDelete={onDelete}
        onContentChange={onContentChange}
        onDateChange={onDateChange}
        dragHandle={dragHandle}
      />
    </div>
  )
}

interface Props {
  params: Promise<{ id: string }>
}

export default function ChecklistDetailPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: checklists = [] } = useChecklists()
  const { data: items = [] } = useItems(id)
  const createItem = useCreateItem(id)
  const toggleItem = useToggleItem(id)
  const deleteItemMutation = useDeleteItem(id)
  const updateOrder = useUpdateItemOrder(id)

  const [newContent, setNewContent] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const checklist = checklists.find(c => c.id === id)
  const activeItems = items.filter(i => !i.isCompleted)
  const completedItems = items
    .filter(i => i.isCompleted)
    .sort((a, b) => (a.completedAt ?? a.createdAt).localeCompare(b.completedAt ?? b.createdAt))

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newContent.trim()
    if (!trimmed) return
    createItem.mutate(trimmed)
    setNewContent('')
    inputRef.current?.focus()
  }

  function handleContentChange(itemId: string, content: string) {
    updateItem(itemId, { content })
    queryClient.invalidateQueries({ queryKey: ['items', id] })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = activeItems.findIndex(i => i.id === String(active.id))
    const newIdx = activeItems.findIndex(i => i.id === String(over.id))
    const reordered = arrayMove(activeItems, oldIdx, newIdx).map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }))
    updateOrder.mutate(reordered)
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 bg-[rgb(var(--background))] px-4 pt-4 pb-2 z-10">
        <button
          onClick={() => router.back()}
          className="text-blue-500 text-sm mb-2"
        >
          ← 뒤로
        </button>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {checklist?.title ?? '체크리스트'}
        </h1>
      </div>

      {/* Active items */}
      {activeItems.length === 0 && completedItems.length === 0 && (
        <EmptyState variant="inner" />
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={activeItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {activeItems.map(item => (
              <SortableItem
                key={item.id}
                item={item}
                onToggle={(itemId, val) => toggleItem.mutate({ id: itemId, isCompleted: val })}
                onDelete={itemId => deleteItemMutation.mutate(itemId)}
                onContentChange={handleContentChange}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Completed items — always visible, sorted by completedAt */}
      {completedItems.length > 0 && (
        <div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">완료됨 {completedItems.length}</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {completedItems.map(item => (
              <ChecklistItem
                key={item.id}
                item={item}
                onToggle={(itemId, val) => toggleItem.mutate({ id: itemId, isCompleted: val })}
                onDelete={itemId => deleteItemMutation.mutate(itemId)}
                onContentChange={handleContentChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* New item input — 워크 타입에서는 숨김 */}
      {checklist?.kind !== 'work' && (
        <form
          onSubmit={handleAddItem}
          className="sticky bottom-16 bg-[rgb(var(--card))] border-t border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              type="submit"
              disabled={!newContent.trim()}
              aria-label="항목 추가"
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors
                         bg-blue-500 disabled:bg-zinc-200 dark:disabled:bg-zinc-700"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
            <input
              ref={inputRef}
              type="text"
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setNewContent('') }}
              placeholder="항목 추가..."
              className="flex-1 bg-transparent outline-none text-[15px]
                         text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
            />
          </div>
        </form>
      )}
    </div>
  )
}
