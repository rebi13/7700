import { useMealStore } from '@/stores/mealStore'
import { MEAL_TYPE_LABEL } from '@/features/meal/options'
import { EmptyState } from '@/components/EmptyState'
import { LogRow } from '@/components/LogRow'
import type { MealLogRow } from '@/types/database'

interface Props {
  onEdit: (item: MealLogRow) => void
  onDelete: (id: string) => void
}

export function MealList({ onEdit, onDelete }: Props) {
  const logs = useMealStore((st) => st.logs)

  if (logs.length === 0) {
    return <EmptyState message="이 날짜에 식사 기록이 없습니다" />
  }

  return (
    <ul className="flex flex-col">
      {logs.map((item) => (
        <LogRow
          key={item.id}
          name={item.food_name}
          sub={item.meal_type ? MEAL_TYPE_LABEL[item.meal_type] : null}
          trailing={`${item.calories} kcal`}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item.id)}
        />
      ))}
    </ul>
  )
}
