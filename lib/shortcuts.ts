// 키보드 단축키 액션 타입 및 매핑 정의
export type ShortcutAction =
  | 'new-checklist'   // Ctrl+N
  | 'new-work'        // Ctrl+Shift+N

export const SHORTCUTS: Record<string, ShortcutAction> = {
  'ctrl+n': 'new-checklist',
  'ctrl+shift+n': 'new-work',
}
