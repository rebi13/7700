import { useExerciseStore } from '@/stores/exerciseStore'
import { EmptyState } from '@/components/EmptyState'
import { LogRow } from '@/components/LogRow'
import type { ExerciseLogRow } from '@/types/database'

interface Props {
  onEdit: (item: ExerciseLogRow) => void
  onDelete: (id: string) => void
}

export function ExerciseList({ onEdit, onDelete }: Props) {
  const logs = useExerciseStore((st) => st.logs)

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
