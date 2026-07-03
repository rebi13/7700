export interface EstimateResult {
  calories: number
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  confidence: 'high' | 'medium' | 'low'
  note: string
}

export function buildEstimateUserMessage(foodName: string, mealType?: string): string {
  return mealType
    ? `음식: ${foodName}, 식사 종류: ${mealType}`
    : `음식: ${foodName}`
}

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
    note: typeof r.note === 'string' ? r.note : '',
  }
}
