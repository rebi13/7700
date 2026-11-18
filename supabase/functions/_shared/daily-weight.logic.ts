/**
 * 하루에 체중을 여러 번 기록해도 추세 계산에는 하루 한 값만 쓴다.
 * 식사·운동 직후 값은 물과 음식 무게로 0.5~2kg 흔들리므로, 조건이 가장 일정한
 * 기상 직후 값을 먼저 고르고, 없으면 그날 먼저 기록한 값을 쓴다.
 * 통계 화면과 주간 피드백(Edge Function)이 같은 기준을 쓰도록 여기 한 곳에 둔다.
 */

export interface WeightMeasurement {
  weight_date: string
  weight_kg: number
  measured_timing?: string | null
  /** 같은 날 같은 순위끼리 먼저 넣은 기록을 고를 때 쓴다 */
  created_at?: string
}

const rank = (w: WeightMeasurement) => (w.measured_timing === 'morning' ? 0 : 1)

function isPreferred(a: WeightMeasurement, b: WeightMeasurement): boolean {
  if (rank(a) !== rank(b)) return rank(a) < rank(b)
  return (a.created_at ?? '') < (b.created_at ?? '')
}

/** 날짜마다 대표 체중 하나를 골라 날짜 오름차순으로 돌려준다 */
export function pickDailyWeights<T extends WeightMeasurement>(logs: readonly T[]): T[] {
  const byDate = new Map<string, T>()
  for (const log of logs) {
    const current = byDate.get(log.weight_date)
    if (!current || isPreferred(log, current)) byDate.set(log.weight_date, log)
  }
  return [...byDate.values()].sort((a, b) => a.weight_date.localeCompare(b.weight_date))
}
