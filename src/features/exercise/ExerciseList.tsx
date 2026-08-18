import { useExerciseStore } from '@/stores/exerciseStore'
import { EmptyState } from '@/components/EmptyState'
import { SkeletonCard } from '@/components/SkeletonCard'
import { LogRow } from '@/components/LogRow'
import type { ExerciseLogRow } from '@/types/database'

interface Props {
  onEdit: (item: ExerciseLogRow) => void
  onDelete: (id: string) => void
}

export function ExerciseList({ onEdit, onDelete }: Props) {
  const logs = useExerciseStore((st) => st.logs)
  const isLoading = useExerciseStore((st) => st.isLoading)

  // 불러오는 중에는 빈 상태 대신 스켈레톤을 보여준다 — 기록이 있어도
  // 응답 전에는 logs 가 비어 "없습니다" 가 잠깐 스쳐 지나가기 때문이다.
  if (isLoading && logs.length === 0) return <SkeletonCard rows={2} />

  if (logs.length === 0) {
    return <EmptyState message="이 날짜에 운동 기록이 없습니다" />
  }

  return (
    <ul className="flex flex-col">
      {logs.map((item) => (
        <LogRow
          key={item.id}
          name={item.exercise_name}
          sub={item.duration_minutes ? `${item.duration_minutes}분` : null}
          trailing={`${item.calories_burned} kcal`}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item.id)}
        />
      ))}
    </ul>
  )
}
