// 빈 상태 안내 컴포넌트: main(홈 화면) / inner(상세 화면) 두 가지 변형
interface EmptyStateProps {
  variant: 'main' | 'inner'
}

export default function EmptyState({ variant }: EmptyStateProps) {
  if (variant === 'main') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8">
        <span className="text-5xl mb-4">☑️</span>
        <p className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          체크리스트를 만들어보세요
        </p>
        <p className="text-sm text-zinc-400 mt-1">
          + 버튼을 눌러 첫 번째 체크리스트를 시작하세요
        </p>
      </div>
    )
  }

  return (
    <p className="text-sm text-zinc-400 dark:text-zinc-500 px-4 py-3">
      Enter를 눌러 항목을 추가하세요
    </p>
  )
}
