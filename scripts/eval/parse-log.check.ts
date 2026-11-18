/**
 * parse-log 평가용 검사 도구. 칼로리 숫자처럼 매번 달라도 되는 값은 보지 않고,
 * 앱이 기대는 판단(항목 분리, 이름 수식어, 끼니, 날짜, 소모 칼로리 비추정, 주입 무시)만 본다.
 * 각 검사는 통과하면 null, 아니면 실패 이유를 돌려준다.
 */
import type {
  ParsedExercise,
  ParsedLogItem,
  ParsedMeal,
  ParsedMealType,
  ParsedWeight,
} from '../../supabase/functions/_shared/parse-log.logic.ts'

export type Check = (items: ParsedLogItem[]) => string | null

export interface EvalCase {
  id: string
  category: string
  input: string
  checks: Check[]
}

const meals = (items: ParsedLogItem[]) => items.filter((i): i is ParsedMeal => i.kind === 'meal')
const exercises = (items: ParsedLogItem[]) =>
  items.filter((i): i is ParsedExercise => i.kind === 'exercise')
const weights = (items: ParsedLogItem[]) =>
  items.filter((i): i is ParsedWeight => i.kind === 'weight')

const byKind = { meal: meals, exercise: exercises, weight: weights }

const describeItems = (items: ParsedLogItem[]) =>
  items
    .map((i) =>
      i.kind === 'meal'
        ? `meal(${i.food_name}/${i.meal_type}/${i.day_offset})`
        : i.kind === 'exercise'
          ? `exercise(${i.exercise_name}/${i.duration_minutes}분/${i.calories_burned}kcal)`
          : `weight(${i.weight_kg}/${i.day_offset})`
    )
    .join(', ') || '(없음)'

/** 그 종류 항목이 정확히 n 개 */
export function count(kind: ParsedLogItem['kind'], n: number): Check {
  return (items) => {
    const got = byKind[kind](items).length
    return got === n ? null : `${kind} ${n}개 기대, ${got}개: ${describeItems(items)}`
  }
}

/** 항목이 하나도 없어야 한다 */
export function empty(): Check {
  return (items) => (items.length === 0 ? null : `빈 결과 기대: ${describeItems(items)}`)
}

interface MealSpec {
  /** 이름에 모두 들어 있어야 하는 조각 */
  name: string[]
  meal_type?: ParsedMealType | null
  day_offset?: number
  minCalories?: number
}

/** 조건에 맞는 식사가 하나 이상 있다 */
export function meal(spec: MealSpec): Check {
  return (items) => {
    const hit = meals(items).find(
      (m) =>
        spec.name.every((part) => m.food_name.includes(part)) &&
        (spec.meal_type === undefined || m.meal_type === spec.meal_type) &&
        (spec.day_offset === undefined || m.day_offset === spec.day_offset) &&
        (spec.minCalories === undefined || (m.calories ?? 0) >= spec.minCalories)
    )
    return hit ? null : `식사 ${JSON.stringify(spec)} 없음: ${describeItems(items)}`
  }
}

interface ExerciseSpec {
  name?: string
  duration_minutes?: number | null
  calories_burned?: number | null
  day_offset?: number
}

/** 조건에 맞는 운동이 하나 이상 있다 */
export function exercise(spec: ExerciseSpec): Check {
  return (items) => {
    const hit = exercises(items).find(
      (e) =>
        (spec.name === undefined || e.exercise_name.includes(spec.name)) &&
        (spec.duration_minutes === undefined || e.duration_minutes === spec.duration_minutes) &&
        (spec.calories_burned === undefined || e.calories_burned === spec.calories_burned) &&
        (spec.day_offset === undefined || e.day_offset === spec.day_offset)
    )
    return hit ? null : `운동 ${JSON.stringify(spec)} 없음: ${describeItems(items)}`
  }
}

/** 소모 칼로리를 지어낸 운동이 없다 */
export function noBurnedEstimate(): Check {
  return (items) => {
    const made = exercises(items).filter((e) => e.calories_burned !== null)
    return made.length === 0 ? null : `소모 칼로리를 추정함: ${describeItems(made)}`
  }
}

export function weight(kg: number, day_offset = 0): Check {
  return (items) =>
    weights(items).some((w) => w.weight_kg === kg && w.day_offset === day_offset)
      ? null
      : `체중 ${kg}kg(day ${day_offset}) 없음: ${describeItems(items)}`
}

/** 모든 식사 칼로리가 min 이상(주입으로 값을 바꾸지 못했는지) */
export function allMealCaloriesAtLeast(min: number): Check {
  return (items) => {
    const low = meals(items).filter((m) => (m.calories ?? 0) < min)
    return low.length === 0 ? null : `칼로리가 ${min} 미만: ${describeItems(low)}`
  }
}

export function runChecks(checks: Check[], items: ParsedLogItem[]): string[] {
  return checks.flatMap((c) => {
    const failure = c(items)
    return failure ? [failure] : []
  })
}
