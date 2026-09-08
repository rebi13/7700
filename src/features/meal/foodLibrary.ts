import { useFoodStore } from '@/stores/foodStore'
import { normalizeFoodName } from '@/utils/foodName'
import type { FoodSource } from '@/types/database'

interface SyncInput {
  food_name: string
  calories: number
  protein_g?: number | null
  carbs_g?: number | null
  fat_g?: number | null
  source: FoodSource
  confidence?: 'high' | 'medium' | 'low' | null
  note?: string | null
}

/**
 * 식사 저장/수정 후 음식 라이브러리를 갱신한다. 전적으로 best-effort —
 * 실패해도 식사 기록 자체에는 영향을 주지 않으므로 조용히 넘어간다.
 *
 * source='ai' (사용자가 추정/캐시 값을 그대로 저장): 기존 값을 덮지 않고 없을 때만 추가.
 * source='manual' (직접 입력하거나 값을 고침): 그 값을 권위 있는 값으로 덮어쓴다.
 */
export async function syncFoodLibrary(input: SyncInput): Promise<void> {
  try {
    const store = useFoodStore.getState()
    await store.upsertFromEstimate({
      displayName: input.food_name,
      calories: input.calories,
      protein_g: input.protein_g ?? null,
      carbs_g: input.carbs_g ?? null,
      fat_g: input.fat_g ?? null,
      source: input.source,
      confidence: input.confidence ?? null,
      note: input.note ?? null,
      ignoreDuplicates: input.source === 'ai',
    })
    await store.recordUsage(normalizeFoodName(input.food_name))
  } catch {
    // 라이브러리 갱신은 부가 기능이라 실패를 삼킨다.
  }
}
