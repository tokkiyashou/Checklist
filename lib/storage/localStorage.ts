// localStorage 기반 데이터 영속 계층: 체크리스트와 항목의 CRUD 연산 제공
import type { Checklist, Item } from '@/types'

const CHECKLISTS_KEY = 'cl:checklists'
const itemsKey = (checklistId: string) => `cl:items:${checklistId}`

export function getChecklists(): Checklist[] {
  try {
    return JSON.parse(localStorage.getItem(CHECKLISTS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveChecklist(checklist: Checklist): void {
  const all = getChecklists()
  const idx = all.findIndex(c => c.id === checklist.id)
  if (idx >= 0) {
    all[idx] = checklist
  } else {
    all.push(checklist)
  }
  localStorage.setItem(CHECKLISTS_KEY, JSON.stringify(all))
}

export function updateChecklist(id: string, patch: Partial<Checklist>): void {
  const all = getChecklists()
  const idx = all.findIndex(c => c.id === id)
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...patch }
    localStorage.setItem(CHECKLISTS_KEY, JSON.stringify(all))
  }
}

export function deleteChecklist(id: string): void {
  const all = getChecklists().filter(c => c.id !== id)
  localStorage.setItem(CHECKLISTS_KEY, JSON.stringify(all))
  localStorage.removeItem(itemsKey(id))
}

export function getItems(checklistId: string): Item[] {
  try {
    return JSON.parse(localStorage.getItem(itemsKey(checklistId)) ?? '[]')
  } catch {
    return []
  }
}

export function saveItem(item: Item): void {
  const all = getItems(item.checklistId)
  const idx = all.findIndex(i => i.id === item.id)
  if (idx >= 0) {
    all[idx] = item
  } else {
    all.push(item)
  }
  localStorage.setItem(itemsKey(item.checklistId), JSON.stringify(all))
}

export function updateItem(id: string, patch: Partial<Item>): void {
  const checklists: Checklist[] = JSON.parse(
    localStorage.getItem(CHECKLISTS_KEY) ?? '[]'
  )
  for (const cl of checklists) {
    const items = getItems(cl.id)
    const idx = items.findIndex(i => i.id === id)
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...patch }
      localStorage.setItem(itemsKey(cl.id), JSON.stringify(items))
      return
    }
  }
}

export function deleteItem(id: string): void {
  const checklists: Checklist[] = JSON.parse(
    localStorage.getItem(CHECKLISTS_KEY) ?? '[]'
  )
  for (const cl of checklists) {
    const items = getItems(cl.id).filter(i => i.id !== id)
    localStorage.setItem(itemsKey(cl.id), JSON.stringify(items))
  }
}
