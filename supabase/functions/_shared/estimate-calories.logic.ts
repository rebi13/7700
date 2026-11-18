import { wrapUserText } from './parse-log.logic.ts'

export interface EstimateResult {
  calories: number
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  confidence: 'high' | 'medium' | 'low'
  note: string
}

/** 음식 이름 칸의 상한(meal_logs.food_name 과 같다). 긴 입력으로 지시를 끼워 넣지 못하게 한다. */
export const MAX_FOOD_NAME_LENGTH = 100

/** 끼니는 앱이 정한 값만 넘긴다. 자유 문자열을 프롬프트에 그대로 넣지 않는다. */
const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
  late_night: '야식',
}

export function buildEstimateUserMessage(foodName: string, mealType?: string): string {
  const food = wrapUserText('food_name', foodName)
  const label = mealType ? MEAL_TYPE_LABEL[mealType] : undefined
  return label ? `${food}\n식사 종류: ${label}` : food
}

/** 칼로리 추정 Structured Outputs(strict) 스키마 */
export const ESTIMATE_SCHEMA = {
  type: 'object',
  properties: {
    calories: { type: 'integer' },
    protein_g: { type: 'number' },
    carbs_g: { type: 'number' },
    fat_g: { type: 'number' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    note: { type: 'string' },
  },
  required: ['calories', 'protein_g', 'carbs_g', 'fat_g', 'confidence', 'note'],
  additionalProperties: false,
} as const

export function parseEstimateResponse(raw: unknown): EstimateResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid response: not an object')
  }
  const r = raw as Record<string, unknown>
  if (typeof r.calories !== 'number') {
    throw new Error('Invalid response: calories must be a number')
  }
  if (!['high', 'medium', 'low'].includes(r.confidence as string)) {
    throw new Error('Invalid response: confidence must be high/medium/low')
  }
  return {
    calories: r.calories,
    protein_g: typeof r.protein_g === 'number' ? r.protein_g : null,
    carbs_g: typeof r.carbs_g === 'number' ? r.carbs_g : null,
    fat_g: typeof r.fat_g === 'number' ? r.fat_g : null,
    confidence: r.confidence as 'high' | 'medium' | 'low',
    note: typeof r.note === 'string' ? r.note.slice(0, 60) : '',
  }
}
