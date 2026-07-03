export interface DailySummaryEntry {
  summary_date: string
  total_intake_calories: number
  total_exercise_calories: number
  calorie_delta: number
}

export interface WeightEntry {
  weight_date: string
  weight_kg: number
}

export interface GoalEntry {
  target_weight_kg: number
  start_weight_kg: number
  target_date: string
}

export interface WeeklyStats {
  activeDays: number       // 기록이 있는 일수
  exerciseDays: number     // 운동한 일수
  avgIntake: number        // 평균 섭취 칼로리
  avgDelta: number         // 평균 칼로리 적자/초과
  deficitDays: number      // 적자 달성 일수
  weightChange: number | null  // 주간 체중 변화 (kg)
}

export function computeWeeklyStats(
  summaries: DailySummaryEntry[],
  weights: WeightEntry[],
): WeeklyStats {
  const activeDays = summaries.length
  const exerciseDays = summaries.filter(s => s.total_exercise_calories > 0).length
  const avgIntake = activeDays > 0
    ? Math.round(summaries.reduce((acc, s) => acc + s.total_intake_calories, 0) / activeDays)
    : 0
  const avgDelta = activeDays > 0
    ? Math.round(summaries.reduce((acc, s) => acc + s.calorie_delta, 0) / activeDays)
    : 0
  const deficitDays = summaries.filter(s => s.calorie_delta > 0).length

  let weightChange: number | null = null
  if (weights.length >= 2) {
    const sorted = [...weights].sort((a, b) => a.weight_date.localeCompare(b.weight_date))
    weightChange = Math.round((sorted[sorted.length - 1].weight_kg - sorted[0].weight_kg) * 100) / 100
  }

  return { activeDays, exerciseDays, avgIntake, avgDelta, deficitDays, weightChange }
}

export function buildWeeklyFeedbackUserMessage({
  weekStart,
  weekEnd,
  summaries,
  weights,
  goal,
}: {
  weekStart: string
  weekEnd: string
  summaries: DailySummaryEntry[]
  weights: WeightEntry[]
  goal: GoalEntry | null
}): string {
  const stats = computeWeeklyStats(summaries, weights)

  const statsLines = [
    `기록 일수: ${stats.activeDays}/7일`,
    `운동 일수: ${stats.exerciseDays}일`,
    `평균 섭취: ${stats.avgIntake.toLocaleString()}kcal/일`,
    `평균 칼로리 적자: ${stats.avgDelta > 0 ? '-' : '+'}${Math.abs(stats.avgDelta).toLocaleString()}kcal/일`,
    `적자 달성 일수: ${stats.deficitDays}/7일`,
    stats.weightChange !== null
      ? `주간 체중 변화: ${stats.weightChange > 0 ? '+' : ''}${stats.weightChange}kg`
      : '체중 기록 없음',
  ].join('\n')

  const goalLine = goal
    ? `목표 체중 ${goal.target_weight_kg}kg (시작 ${goal.start_weight_kg}kg), 목표일 ${goal.target_date}`
    : '없음'

  return `기간: ${weekStart} ~ ${weekEnd}

[주간 통계]
${statsLines}

[다이어트 목표]
${goalLine}`
}

export function parseWeeklyFeedbackResponse(raw: unknown): string {
  const content = typeof raw === 'string' ? raw.trim() : ''
  if (!content) throw new Error('Empty weekly feedback response')
  return content
}

export function getWeekRange(date: string): { weekStart: string; weekEnd: string } {
  const d = new Date(date)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (dt: Date) => dt.toISOString().split('T')[0]
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) }
}
