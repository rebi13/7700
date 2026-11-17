import { mealSchema } from '@/schemas/meal'
import { exerciseSchema } from '@/schemas/exercise'
import { weightSchema } from '@/schemas/weight'
import { useMealStore } from '@/stores/mealStore'
import { useExerciseStore } from '@/stores/exerciseStore'
import { useWeightStore } from '@/stores/weightStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { syncFoodLibrary } from '@/features/meal/foodLibrary'
import { addDays } from '@/utils/date'
import type { ParsedLogItem } from '@/stores/aiStore'
import type { FoodRow, MealType } from '@/types/database'

type Confidence = 'high' | 'medium' | 'low'

/** 칼로리를 어디서 가져왔는지. 저장 시 음식 라이브러리를 덮을지 판단한다. */
export type MealOrigin = 'saved' | 'ai' | 'manual'

export interface MealDraft {
  id: string
  kind: 'meal'
  date: string
  meal_type: MealType | null
  food_name: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  origin: MealOrigin
  confidence: Confidence | null
  note: string
  /** 같은 메뉴의 다른 저장값(가게·집별). 골라서 칼로리를 바꿀 수 있다. */
  candidates: FoodRow[]
}

export interface ExerciseDraft {
  id: string
  kind: 'exercise'
  date: string
  exercise_name: string
  duration_minutes: number | null
  calories_burned: number | null
}

export interface WeightDraft {
  id: string
  kind: 'weight'
  date: string
  weight_kg: number | null
}

export type LogDraft = MealDraft | ExerciseDraft | WeightDraft

export interface FoodLibrary {
  lookup: (name: string) => Promise<FoodRow | null>
  findVariants: (name: string) => Promise<FoodRow[]>
}

let seq = 0
const nextId = () => `draft-${++seq}`

/**
 * AI 가 나눈 항목을 미리보기용 초안으로 바꾼다.
 *
 * 식사 칼로리는 사용자 음식 라이브러리를 AI 추정보다 우선한다. 사용자가 고쳐 둔 값이
 * 자연어 입력에서도 똑같이 나와야 하기 때문이다. 이름이 정확히 같지 않은 변형
 * ("김치찌개" ↔ "회사 앞 김치찌개")은 자동으로 고르지 않고 후보로만 보여준다.
 */
export async function buildDrafts(
  items: ParsedLogItem[],
  baseDate: string,
  library: FoodLibrary
): Promise<LogDraft[]> {
  return Promise.all(
    items.map(async (item): Promise<LogDraft> => {
      const date = addDays(baseDate, item.day_offset)

      if (item.kind === 'exercise') {
        return {
          id: nextId(),
          kind: 'exercise',
          date,
          exercise_name: item.exercise_name,
          duration_minutes: item.duration_minutes,
          calories_burned: item.calories_burned,
        }
      }

      if (item.kind === 'weight') {
        return { id: nextId(), kind: 'weight', date, weight_kg: item.weight_kg }
      }

      const [saved, candidates] = await Promise.all([
        library.lookup(item.food_name).catch(() => null),
        library.findVariants(item.food_name).catch(() => [] as FoodRow[]),
      ])

      const base: MealDraft = {
        id: nextId(),
        kind: 'meal',
        date,
        meal_type: item.meal_type,
        food_name: item.food_name,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        origin: 'ai',
        confidence: item.confidence,
        note: item.note,
        candidates,
      }
      return saved ? applyCandidate(base, saved) : base
    })
  )
}

/** 저장된 음식 값으로 바꾼다. 이름도 그 음식 이름으로 맞춰 다음에도 같은 키로 찾게 한다. */
export function applyCandidate(draft: MealDraft, food: FoodRow): MealDraft {
  return {
    ...draft,
    food_name: food.display_name,
    calories: food.calories,
    protein_g: food.protein_g,
    carbs_g: food.carbs_g,
    fat_g: food.fat_g,
    origin: 'saved',
    confidence: food.confidence,
    note: food.note ?? '',
  }
}

/** 사용자가 칼로리를 바꾸면 그 값이 권위 있는 값이 된다(라이브러리를 덮어쓴다). */
export function patchMeal(draft: MealDraft, patch: Partial<MealDraft>): MealDraft {
  const next = { ...draft, ...patch }
  if ('calories' in patch && patch.calories !== draft.calories) {
    next.origin = 'manual'
    next.confidence = null
    next.note = ''
  }
  return next
}

/** 저장 전에 기존 폼과 같은 스키마로 검사한다. 통과하면 null, 아니면 첫 오류 문구. */
export function validateDraft(draft: LogDraft): string | null {
  const result = toSchemaResult(draft)
  return result.success ? null : result.error.issues[0]?.message ?? '입력값을 확인해 주세요'
}

function toSchemaResult(draft: LogDraft) {
  switch (draft.kind) {
    case 'meal':
      return mealSchema.safeParse({
        food_name: draft.food_name,
        calories: draft.calories ?? undefined,
        meal_type: draft.meal_type ?? undefined,
        meal_date: draft.date,
        protein_g: draft.protein_g,
        carbs_g: draft.carbs_g,
        fat_g: draft.fat_g,
      })
    case 'exercise':
      return exerciseSchema.safeParse({
        exercise_name: draft.exercise_name,
        calories_burned: draft.calories_burned ?? undefined,
        duration_minutes: draft.duration_minutes,
        exercise_date: draft.date,
      })
    case 'weight':
      return weightSchema.safeParse({
        weight_kg: draft.weight_kg ?? undefined,
        weight_date: draft.date,
      })
  }
}

export interface SaveResult {
  /** 저장하지 못한 초안. 미리보기에 남겨 다시 시도하게 한다. */
  failed: LogDraft[]
  /** 기록이 바뀐 날짜. 화면이 목록을 다시 불러올 때 쓴다. */
  dates: string[]
}

/**
 * 초안을 하나씩 저장한다. 한 항목이 실패해도 나머지는 계속 저장하고,
 * 실패한 항목만 돌려준다. 식사·운동이 바뀐 날짜는 일일 요약을 다시 계산한다.
 */
export async function saveDrafts(drafts: LogDraft[]): Promise<SaveResult> {
  const failed: LogDraft[] = []
  const dates = new Set<string>()
  const summaryDates = new Set<string>()

  for (const draft of drafts) {
    const ok = await saveOne(draft)
    if (!ok) {
      failed.push(draft)
      continue
    }
    dates.add(draft.date)
    if (draft.kind !== 'weight') summaryDates.add(draft.date)
  }

  const { calculateAndSave } = useSummaryStore.getState()
  for (const date of summaryDates) await calculateAndSave(date)

  return { failed, dates: [...dates] }
}

async function saveOne(draft: LogDraft): Promise<boolean> {
  switch (draft.kind) {
    case 'meal': {
      const store = useMealStore.getState()
      await store.addLog({
        food_name: draft.food_name,
        calories: draft.calories as number,
        meal_type: draft.meal_type as MealType,
        meal_date: draft.date,
        protein_g: draft.protein_g,
        carbs_g: draft.carbs_g,
        fat_g: draft.fat_g,
      })
      if (useMealStore.getState().error) return false
      // 저장값·AI 추정을 그대로 썼으면 기존 라이브러리 값을 덮지 않고, 고쳤으면 덮는다.
      const manual = draft.origin === 'manual'
      await syncFoodLibrary({
        food_name: draft.food_name,
        calories: draft.calories as number,
        protein_g: draft.protein_g,
        carbs_g: draft.carbs_g,
        fat_g: draft.fat_g,
        source: manual ? 'manual' : 'ai',
        confidence: manual ? null : draft.confidence,
        note: manual ? null : draft.note || null,
      })
      return true
    }
    case 'exercise': {
      await useExerciseStore.getState().addLog({
        exercise_name: draft.exercise_name,
        calories_burned: draft.calories_burned as number,
        duration_minutes: draft.duration_minutes,
        exercise_date: draft.date,
      })
      return !useExerciseStore.getState().error
    }
    case 'weight': {
      await useWeightStore.getState().addLog({
        weight_kg: draft.weight_kg as number,
        weight_date: draft.date,
      })
      return !useWeightStore.getState().error
    }
  }
}
