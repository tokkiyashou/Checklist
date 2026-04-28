// 날짜 유틸: ISO 변환, 날짜 덧셈, 오늘/내일 판별, 표시용 한국어 포맷팅

/** Convert Date to YYYY-MM-DD string (local date) */
export function toISODate(date: Date): string {
  return date.toLocaleDateString('sv-SE')   // sv-SE locale = YYYY-MM-DD
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function isToday(isoDate: string): boolean {
  return isoDate === toISODate(new Date())
}

export function isTomorrow(isoDate: string): boolean {
  return isoDate === toISODate(addDays(new Date(), 1))
}

/** Quick date presets */
export function getQuickDate(preset: 'today' | 'tomorrow' | 'this-week'): string {
  const now = new Date()
  if (preset === 'today') return toISODate(now)
  if (preset === 'tomorrow') return toISODate(addDays(now, 1))
  // end of current week (Sunday)
  const dayOfWeek = now.getDay()
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek
  return toISODate(addDays(now, daysUntilSunday))
}

/** Human-readable date display for due_date field */
export function formatDisplayDate(isoDate?: string): string {
  if (!isoDate) return ''
  if (isToday(isoDate)) return '오늘'
  if (isTomorrow(isoDate)) return '내일'
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}
