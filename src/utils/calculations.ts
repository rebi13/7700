import type { Gender, ActivityLevel } from '@/types/database'
import { getDaysRemaining } from '@/utils/date'
import { isRecordedDay } from '../../supabase/functions/_shared/daily-summary.logic.ts'

export { isRecordedDay }

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function calculateBMR({
  weightKg,
  heightCm,
  birthDate,
  gender,
}: {
  weightKg: number
  heightCm: number
  birthDate: string
  gender: Gender
}): number {
  const age = calculateAge(birthDate)
  const male = 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  const female = 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  if (gender === 'male') return Math.round(male)
  if (gender === 'female') return Math.round(female)
  return Math.round((male + female) / 2)
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel])
}

export function calculateDailyDeficit({
  startWeightKg,
  targetWeightKg,
  targetDate,
}: {
  startWeightKg: number
  targetWeightKg: number
  targetDate: string
}): number {
  const totalCalories = (startWeightKg - targetWeightKg) * 7700
  const days = getDaysRemaining(targetDate)
  if (days <= 0) return 0
  return Math.round(totalCalories / days)
}

export function estimateWeightChange(calorieDelta: number): number {
  return Math.round((calorieDelta / 7700) * 100) / 100
}

interface DaySummary {
  summary_date: string
  total_intake_calories: number
  calorie_delta: number
}

/**
 * 기준일(목표 시작일)부터 각 날짜까지의 누적 적자. 식사를 기록한 날만 더하고
 * 날짜 순으로 돌려준다. 날짜는 'YYYY-MM-DD' 라 문자열 비교로 순서를 정한다.
 */
export function cumulativeDeltaSeries(
  summaries: DaySummary[],
  startDate: string
): { date: string; cumulative: number }[] {
  let running = 0
  return summaries
    .filter((s) => s.summary_date >= startDate && isRecordedDay(s))
    .sort((a, b) => a.summary_date.localeCompare(b.summary_date))
    .map((s) => {
      running += s.calorie_delta
      return { date: s.summary_date, cumulative: running }
    })
}

/** 기준일부터 date 까지(포함) 식사를 기록한 날의 적자 합계와 그 날 수. */
export function cumulativeDeltaUntil(
  summaries: DaySummary[],
  startDate: string,
  date: string
): { total: number; recordedDays: number } {
  const series = cumulativeDeltaSeries(summaries, startDate).filter((p) => p.date <= date)
  return {
    total: series.at(-1)?.cumulative ?? 0,
    recordedDays: series.length,
  }
}
