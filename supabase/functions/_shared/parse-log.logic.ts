/**
 * 자연어 하루 기록("아침엔 토스트, 점심 김치찌개, 30분 러닝")을 항목 목록으로 바꾸는 규칙.
 * Edge Function 과 앱 테스트가 함께 쓰므로 Deno/Node 어느 쪽 API 에도 기대지 않는다.
 *
 * 모델 응답은 믿지 않는다. 형식이 틀린 항목은 버리고, 범위를 벗어난 숫자는 null 로 돌려
 * 사용자가 미리보기에서 직접 채우게 한다. 저장 단계의 스키마 검사가 최종 관문이다.
 */

export type ParsedMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'late_night'
export type ParsedConfidence = 'high' | 'medium' | 'low'

export interface ParsedMeal {
  kind: 'meal'
  /** 기준 날짜 대비 일수. 0=기준일, -1=전날 */
  day_offset: number
  meal_type: ParsedMealType | null
  food_name: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  confidence: ParsedConfidence
  note: string
}

export interface ParsedExercise {
  kind: 'exercise'
  day_offset: number
  exercise_name: string
  duration_minutes: number | null
  calories_burned: number | null
}

export interface ParsedWeight {
  kind: 'weight'
  day_offset: number
  weight_kg: number
}

export type ParsedLogItem = ParsedMeal | ParsedExercise | ParsedWeight

/** "어제", "그저께" 정도만 허용한다. 그 이상은 잘못 읽었을 가능성이 크다. */
export const MIN_DAY_OFFSET = -7
export const MAX_INPUT_LENGTH = 1000

const MEAL_TYPES: readonly ParsedMealType[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'late_night',
]
const CONFIDENCES: readonly ParsedConfidence[] = ['high', 'medium', 'low']

export function buildParseUserMessage(text: string, weightKg?: number | null): string {
  const lines = [`기록: ${text.trim()}`]
  if (typeof weightKg === 'number' && weightKg > 0) {
    lines.push(`사용자 체중: ${weightKg}kg (운동 소모 칼로리 계산에 사용)`)
  }
  return lines.join('\n')
}

export function parseParseResponse(raw: unknown): ParsedLogItem[] {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid response: not an object')
  }
  const items = (raw as Record<string, unknown>).items
  if (!Array.isArray(items)) {
    throw new Error('Invalid response: items must be an array')
  }
  return items.flatMap((item) => {
    const parsed = parseItem(item)
    return parsed ? [parsed] : []
  })
}

function parseItem(raw: unknown): ParsedLogItem | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const day_offset = toDayOffset(r.day_offset)

  if (r.kind === 'meal') {
    const food_name = toName(r.food_name)
    if (!food_name) return null
    return {
      kind: 'meal',
      day_offset,
      meal_type: MEAL_TYPES.includes(r.meal_type as ParsedMealType)
        ? (r.meal_type as ParsedMealType)
        : null,
      food_name,
      calories: toInt(r.calories, 1, 9999),
      protein_g: toGram(r.protein_g),
      carbs_g: toGram(r.carbs_g),
      fat_g: toGram(r.fat_g),
      confidence: CONFIDENCES.includes(r.confidence as ParsedConfidence)
        ? (r.confidence as ParsedConfidence)
        : 'low',
      note: typeof r.note === 'string' ? r.note.slice(0, 100) : '',
    }
  }

  if (r.kind === 'exercise') {
    const exercise_name = toName(r.exercise_name)
    if (!exercise_name) return null
    return {
      kind: 'exercise',
      day_offset,
      exercise_name,
      duration_minutes: toInt(r.duration_minutes, 1, 1440),
      calories_burned: toInt(r.calories_burned, 1, 9999),
    }
  }

  if (r.kind === 'weight') {
    const w = r.weight_kg
    if (typeof w !== 'number' || !Number.isFinite(w) || w < 30 || w > 300) return null
    return { kind: 'weight', day_offset, weight_kg: Math.round(w * 10) / 10 }
  }

  return null
}

function toDayOffset(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0
  const n = Math.trunc(v)
  if (n > 0) return 0
  return Math.max(MIN_DAY_OFFSET, n)
}

function toName(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().replace(/\s+/g, ' ')
  if (!s) return null
  return s.slice(0, 100)
}

function toInt(v: unknown, min: number, max: number): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  const n = Math.round(v)
  return n >= min && n <= max ? n : null
}

function toGram(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 999) return null
  return Math.round(v * 10) / 10
}
