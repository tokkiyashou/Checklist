// 항목 CRUD React Query 훅: 추가/완료 토글/삭제/순서 변경/날짜 설정 + 체크리스트 완료 동기화
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getItems, saveItem, updateItem, deleteItem, updateChecklist } from '@/lib/storage/localStorage'
import type { Item } from '@/types'
import { nanoid } from 'nanoid'
import { CHECKLISTS_KEY } from '@/lib/hooks/useChecklists'

const itemsKey = (checklistId: string) => ['items', checklistId]

export function useItems(checklistId: string) {
  return useQuery({
    queryKey: itemsKey(checklistId),
    queryFn: () => getItems(checklistId).sort((a, b) =>
      a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)
    ),
  })
}

export function useCreateItem(checklistId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (content: string): Promise<Item> => {
      const items = getItems(checklistId)
      const maxOrder = items.reduce((m, i) => Math.max(m, i.sortOrder), 0)
      const item: Item = {
        id: nanoid(),
        checklistId,
        content,
        isCompleted: false,
        sortOrder: maxOrder + 1,
        createdAt: new Date().toISOString(),
      }
      saveItem(item)
      return item
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: itemsKey(checklistId) }),
  })
}

export function useToggleItem(checklistId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      const patch: Partial<Item> = {
        isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : undefined,
      }
      updateItem(id, patch)
      const items = getItems(checklistId)
      const allDone = items.length > 0 && items.every(i => i.id === id ? isCompleted : i.isCompleted)
      updateChecklist(checklistId, {
        isCompleted: allDone,
        completedAt: allDone ? new Date().toISOString() : undefined,
      })
    },
    onMutate: async ({ id, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: itemsKey(checklistId) })
      const previous = queryClient.getQueryData<Item[]>(itemsKey(checklistId)) ?? []
      queryClient.setQueryData<Item[]>(
        itemsKey(checklistId),
        previous.map(i => i.id === id
          ? { ...i, isCompleted, completedAt: isCompleted ? new Date().toISOString() : undefined }
          : i
        )
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(itemsKey(checklistId), context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: itemsKey(checklistId) })
      queryClient.invalidateQueries({ queryKey: CHECKLISTS_KEY })
    },
  })
}

export function useDeleteItem(checklistId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { deleteItem(id) },
    onSettled: () => queryClient.invalidateQueries({ queryKey: itemsKey(checklistId) }),
  })
}

export function useUpdateItemOrder(checklistId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (items: Item[]) => {
      items.forEach(item => updateItem(item.id, { sortOrder: item.sortOrder }))
    },
    onMutate: async (newItems) => {
      await queryClient.cancelQueries({ queryKey: itemsKey(checklistId) })
      const previous = queryClient.getQueryData<Item[]>(itemsKey(checklistId))
      queryClient.setQueryData(itemsKey(checklistId), newItems)
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(itemsKey(checklistId), context?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: itemsKey(checklistId) }),
  })
}

export function useUpdateItemDate(checklistId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dueDate }: { id: string; dueDate?: string }) => {
      updateItem(id, { dueDate })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: itemsKey(checklistId) }),
  })
}

export function useCheckNextItem(checklistId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const items = getItems(checklistId).sort((a, b) =>
        a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)
      )
      const nextItem = items.find(i => !i.isCompleted)
      if (!nextItem) return
      updateItem(nextItem.id, {
        isCompleted: true,
        completedAt: new Date().toISOString(),
      })
      const remaining = items.filter(i => !i.isCompleted)
      const allDone = remaining.length === 1 // nextItem was the last uncompleted
      updateChecklist(checklistId, {
        isCompleted: allDone,
        completedAt: allDone ? new Date().toISOString() : undefined,
      })
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: itemsKey(checklistId) })
      const previous = queryClient.getQueryData<Item[]>(itemsKey(checklistId)) ?? []
      const sorted = [...previous].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
      const nextIdx = sorted.findIndex(i => !i.isCompleted)
      if (nextIdx === -1) {
        queryClient.setQueryData(itemsKey(checklistId), previous)
        return { previous }
      }
      const updated = previous.map(i =>
        i.id === sorted[nextIdx].id
          ? { ...i, isCompleted: true, completedAt: new Date().toISOString() }
          : i
      )
      queryClient.setQueryData(itemsKey(checklistId), updated)
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(itemsKey(checklistId), context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: itemsKey(checklistId) })
      queryClient.invalidateQueries({ queryKey: CHECKLISTS_KEY })
    },
  })
}
