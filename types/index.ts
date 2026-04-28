// 앱 전역 타입 정의

export interface Checklist {
  id: string
  title: string
  color?: string
  createdAt: string
  dateRange?: { start: string; end: string }
  kind?: 'checklist' | 'work'
  isCompleted?: boolean
  completedAt?: string
  scheduledDate?: string
}

export interface Item {
  id: string
  checklistId: string
  content: string
  isCompleted: boolean
  dueDate?: string
  sortOrder: number
  createdAt: string
  completedAt?: string
}
