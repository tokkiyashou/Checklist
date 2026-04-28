// 체크리스트 CRUD React Query 훅: 생성/삭제/워크 완료 토글/이름 변경/완료 시각 수정
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getChecklists, saveChecklist, deleteChecklist, updateChecklist,
} from '@/lib/storage/localStorage'
import type { Checklist } from '@/types'
import { nanoid } from 'nanoid'

export const CHECKLISTS_KEY = ['checklists']

export function useChecklists() {
  return useQuery({
    queryKey: CHECKLISTS_KEY,
    queryFn: () => getChecklists(),
  })
}

export function useCreateChecklist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: string | { title: string; kind?: 'checklist' | 'work'; dateRange?: { start: string; end: string }; scheduledDate?: string }): Promise<Checklist> => {
      const title = typeof input === 'string' ? input : input.title
      const kind = typeof input === 'string' ? 'checklist' : (input.kind ?? 'checklist')
      const dateRange = typeof input === 'string' ? undefined : input.dateRange
      const scheduledDate = typeof input === 'string' ? undefined : input.scheduledDate
      const checklist: Checklist = {
        id: nanoid(),
        title,
        kind,
        dateRange,
        scheduledDate,
        createdAt: new Date().toISOString(),
      }
      saveChecklist(checklist)
      return checklist
    },
    onMutate: async (input) => {
      const title = typeof input === 'string' ? input : input.title
      const kind = typeof input === 'string' ? 'checklist' : (input.kind ?? 'checklist')
      await queryClient.cancelQueries({ queryKey: CHECKLISTS_KEY })
      const previous = queryClient.getQueryData<Checklist[]>(CHECKLISTS_KEY) ?? []
      const optimistic: Checklist = {
        id: `temp-${Date.now()}`,
        title,
        kind,
        createdAt: new Date().toISOString(),
      }
      queryClient.setQueryData<Checklist[]>(CHECKLISTS_KEY, [optimistic, ...previous])
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(CHECKLISTS_KEY, context?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CHECKLISTS_KEY }),
  })
}

export function useDeleteChecklist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { deleteChecklist(id) },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: CHECKLISTS_KEY })
      const previous = queryClient.getQueryData<Checklist[]>(CHECKLISTS_KEY) ?? []
      queryClient.setQueryData<Checklist[]>(
        CHECKLISTS_KEY,
        previous.filter(c => c.id !== id)
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(CHECKLISTS_KEY, context?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CHECKLISTS_KEY }),
  })
}

export function useToggleWork() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      updateChecklist(id, {
        isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : undefined,
      })
    },
    onMutate: async ({ id, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: CHECKLISTS_KEY })
      const previous = queryClient.getQueryData<Checklist[]>(CHECKLISTS_KEY) ?? []
      queryClient.setQueryData<Checklist[]>(
        CHECKLISTS_KEY,
        previous.map(c => c.id === id
          ? { ...c, isCompleted, completedAt: isCompleted ? new Date().toISOString() : undefined }
          : c
        )
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(CHECKLISTS_KEY, context?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CHECKLISTS_KEY }),
  })
}

export function useRenameChecklist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      updateChecklist(id, { title })
    },
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: CHECKLISTS_KEY })
      const previous = queryClient.getQueryData<Checklist[]>(CHECKLISTS_KEY) ?? []
      queryClient.setQueryData<Checklist[]>(
        CHECKLISTS_KEY,
        previous.map(c => c.id === id ? { ...c, title } : c)
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(CHECKLISTS_KEY, context?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CHECKLISTS_KEY }),
  })
}

export function useUpdateChecklistCompletedAt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, completedAt }: { id: string; completedAt: string | undefined }) => {
      updateChecklist(id, { completedAt })
    },
    onMutate: async ({ id, completedAt }) => {
      await queryClient.cancelQueries({ queryKey: CHECKLISTS_KEY })
      const previous = queryClient.getQueryData<Checklist[]>(CHECKLISTS_KEY) ?? []
      queryClient.setQueryData<Checklist[]>(
        CHECKLISTS_KEY,
        previous.map(c => c.id === id ? { ...c, completedAt } : c)
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(CHECKLISTS_KEY, context?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CHECKLISTS_KEY }),
  })
}
