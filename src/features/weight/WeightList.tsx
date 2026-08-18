import { useWeightStore } from '@/stores/weightStore'
import { MEASURED_TIMING_LABEL } from '@/features/weight/options'
import { EmptyState } from '@/components/EmptyState'
import { SkeletonCard } from '@/components/SkeletonCard'
import { LogRow } from '@/components/LogRow'
import type { WeightLogRow } from '@/types/database'

interface Props {
  onEdit: (item: WeightLogRow) => void
  onDelete: (id: string) => void
}

export function WeightList({ onEdit, onDelete }: Props) {
  const logs = useWeightStore((st) => st.logs)
  const isLoading = useWeightStore((st) => st.isLoading)

  // 불러오는 중에는 빈 상태 대신 스켈레톤을 보여준다 — 기록이 있어도
  // 응답 전에는 logs 가 비어 "없습니다" 가 잠깐 스쳐 지나가기 때문이다.
  if (isLoading && logs.length === 0) return <SkeletonCard rows={2} />

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
