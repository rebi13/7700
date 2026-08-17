import { useWeightStore } from '@/stores/weightStore'
import { MEASURED_TIMING_LABEL } from '@/features/weight/options'
import { EmptyState } from '@/components/EmptyState'
import { LogRow } from '@/components/LogRow'
import type { WeightLogRow } from '@/types/database'

interface Props {
  onEdit: (item: WeightLogRow) => void
  onDelete: (id: string) => void
}

export function WeightList({ onEdit, onDelete }: Props) {
  const logs = useWeightStore((st) => st.logs)

  if (logs.length === 0) {
    return <EmptyState message="이 날짜에 체중 기록이 없습니다" />
  }

  return (
    <ul className="flex flex-col">
      {logs.map((item) => (
        <LogRow
          key={item.id}
          name={`${item.weight_kg} kg`}
          sub={
            item.measured_timing
              ? MEASURED_TIMING_LABEL[item.measured_timing]
              : null
          }
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item.id)}
        />
      ))}
    </ul>
  )
}
