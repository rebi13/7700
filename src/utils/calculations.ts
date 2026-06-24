import type { Gender, ActivityLevel } from '@/types/database'
import { getDaysRemaining } from '@/utils/date'

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
