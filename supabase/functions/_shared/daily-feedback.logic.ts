export interface MealEntry {
  food_name: string
  calories: number
}

export interface ExerciseEntry {
  exercise_name: string
  calories_burned: number
  duration_minutes: number | null
}

export interface SummaryEntry {
  total_intake_calories: number
  total_exercise_calories: number
  calorie_delta: number
}

export interface GoalEntry {
  target_weight_kg: number
  start_weight_kg: number
  target_date: string
}

export function buildFeedbackUserMessage({
  targetDate,
  meals,
  exercises,
  summary,
  goal,
}: {
  targetDate: string
  meals: MealEntry[]
  exercises: ExerciseEntry[]
  summary: SummaryEntry | null
  goal: GoalEntry | null
}): string {
  const mealLines = meals.length > 0
    ? meals.map(m => `- ${m.food_name} ${m.calories}kcal`).join('\n')
    : '없음'

  const exerciseLines = exercises.length > 0
    ? exercises.map(e =>
        `- ${e.exercise_name} ${e.calories_burned}kcal${e.duration_minutes ? ` (${e.duration_minutes}분)` : ''}`
      ).join('\n')
    : '없음'

  const summaryLine = summary
    ? `섭취 ${summary.total_intake_calories}kcal / 운동 소모 ${summary.total_exercise_calories}kcal / 칼로리 적자 ${summary.calorie_delta}kcal`
    : '데이터 없음'

  const goalLine = goal
    ? `목표 체중 ${goal.target_weight_kg}kg (시작 ${goal.start_weight_kg}kg), 목표일 ${goal.target_date}`
    : '없음'

  return `날짜: ${targetDate}

[식사]
${mealLines}

[운동]
${exerciseLines}

[오늘 요약]
${summaryLine}

[다이어트 목표]
${goalLine}`
}

export function parseFeedbackResponse(raw: unknown): string {
  const content = typeof raw === 'string' ? raw.trim() : ''
  if (!content) throw new Error('Empty feedback response')
  return content
}
