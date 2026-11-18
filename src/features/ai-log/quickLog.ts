import { mealSchema } from '@/schemas/meal'
import { exerciseSchema } from '@/schemas/exercise'
import { weightSchema } from '@/schemas/weight'
import { useMealStore } from '@/stores/mealStore'
import { useExerciseStore } from '@/stores/exerciseStore'
import { useWeightStore } from '@/stores/weightStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { syncFoodLibrary } from '@/features/meal/foodLibrary'
import { addDays, toISODate } from '@/utils/date'
import { normalizeFoodName } from '@/utils/foodName'
import type { ParsedLogItem } from '@/stores/aiStore'
import type {
  ExerciseLogRow,
  FoodRow,
  MealLogRow,
  MealType,
  MeasuredTiming,
} from '@/types/database'

type Confidence = 'high' | 'medium' | 'low'

/** 칼로리를 어디서 가져왔는지. 저장 시 음식 라이브러리를 덮을지 판단한다. */
export type MealOrigin = 'saved' | 'ai' | 'manual'

interface DraftBase {
  id: string
  date: string
  /** 그날 이미 같은 기록이 있다. 하루를 다시 설명하면 앞서 넣은 끼니가 또 나온다. */
  duplicate: boolean
  /** true 면 저장하지 않는다. 중복 항목은 제외한 채로 시작한다. */
  skip: boolean
}

export interface MealDraft extends DraftBase {
  kind: 'meal'
  meal_type: MealType | null
  /** 문장에 끼니 단서가 없어 지금 시각으로 채웠다 */
  meal_type_guessed: boolean
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

export interface ExerciseDraft extends DraftBase {
  kind: 'exercise'
  exercise_name: string
  duration_minutes: number | null
  calories_burned: number | null
}

export interface WeightDraft extends DraftBase {
  kind: 'weight'
  weight_kg: number | null
  /** 잰 시점. 통계는 기상 직후 값을 그날 체중으로 쓰므로 미리보기에서 고르게 한다. */
  measured_timing: MeasuredTiming | null
}

export type LogDraft = MealDraft | ExerciseDraft | WeightDraft

export interface FoodLibrary {
  lookup: (name: string) => Promise<FoodRow | null>
  findVariants: (name: string) => Promise<FoodRow[]>
}

/** 중복 판단에 쓰는 그날의 기존 기록 */
export interface DayLogs {
  meals: Pick<MealLogRow, 'food_name' | 'meal_type'>[]
  exercises: Pick<ExerciseLogRow, 'exercise_name'>[]
}

export interface BuildOptions {
  /** 날짜별 기존 기록. 없으면 중복 검사를 하지 않는다. */
  existing?: (date: string) => Promise<DayLogs>
  /** 끼니를 시각으로 채울 때 기준 시각(테스트용) */
  now?: Date
}

let seq = 0
const nextId = () => `draft-${++seq}`

/**
 * 끼니 단서가 없는 오늘 기록("방금 김치찌개 먹음")은 지금 시각으로 끼니를 채운다.
 * 끼니마다 따로 입력하는 사람은 시간대를 말하지 않는 경우가 많다.
 */
export function mealTypeByHour(hour: number): MealType {
  if (hour >= 4 && hour < 10) return 'breakfast'
  if (hour >= 10 && hour < 15) return 'lunch'
  if (hour >= 15 && hour < 17) return 'snack'
  if (hour >= 17 && hour < 21) return 'dinner'
  return 'late_night'
}

/**
 * AI 가 나눈 항목을 미리보기용 초안으로 바꾼다.
 *
 * 식사 칼로리는 사용자 음식 라이브러리를 AI 추정보다 우선한다. 사용자가 고쳐 둔 값이
 * 자연어 입력에서도 똑같이 나와야 하기 때문이다. 이름이 정확히 같지 않은 변형
 * ("김치찌개" ↔ "회사 앞 김치찌개")은 자동으로 고르지 않고 후보로만 보여준다.
 *
 * 그날 이미 같은 이름(식사는 끼니까지)으로 기록돼 있으면 중복으로 표시하고 제외해 둔다.
 * 따로따로 입력하다가 하루를 몰아서 다시 설명해도 같은 끼니가 두 번 저장되지 않게 한다.
 */
export async function buildDrafts(
  items: ParsedLogItem[],
  baseDate: string,
  library: FoodLibrary,
  options: BuildOptions = {}
): Promise<LogDraft[]> {
  const now = options.now ?? new Date()
  const today = toISODate(now)

  const dayCache = new Map<string, Promise<DayLogs>>()
  const dayLogs = (date: string): Promise<DayLogs> => {
    if (!options.existing) return Promise.resolve({ meals: [], exercises: [] })
    let p = dayCache.get(date)
    if (!p) {
      p = options.existing(date).catch(() => ({ meals: [], exercises: [] }))
      dayCache.set(date, p)
    }
    return p
  }

  return Promise.all(
    items.map(async (item): Promise<LogDraft> => {
      const date = addDays(baseDate, item.day_offset)
      const logs = await dayLogs(date)

      if (item.kind === 'exercise') {
        const name = normalizeFoodName(item.exercise_name)
        const duplicate = logs.exercises.some(
          (e) => normalizeFoodName(e.exercise_name) === name
        )
        return {
          id: nextId(),
          kind: 'exercise',
          date,
          duplicate,
          skip: duplicate,
          exercise_name: item.exercise_name,
          duration_minutes: item.duration_minutes,
          calories_burned: item.calories_burned,
        }
      }

      if (item.kind === 'weight') {
        return {
          id: nextId(),
          kind: 'weight',
          date,
          duplicate: false,
          skip: false,
          weight_kg: item.weight_kg,
          // 이전 버전 함수 응답에는 이 값이 없다.
          measured_timing: item.measured_timing ?? null,
        }
      }

      const [saved, candidates] = await Promise.all([
        library.lookup(item.food_name).catch(() => null),
        library.findVariants(item.food_name).catch(() => [] as FoodRow[]),
      ])

      const guessed = item.meal_type === null && date === today
      const mealType = guessed ? mealTypeByHour(now.getHours()) : item.meal_type
      const name = normalizeFoodName(item.food_name)
      const duplicate = logs.meals.some(
        (m) =>
          normalizeFoodName(m.food_name) === name &&
          (mealType === null || m.meal_type === mealType)
      )

      const base: MealDraft = {
        id: nextId(),
        kind: 'meal',
        date,
        duplicate,
        skip: duplicate,
        meal_type: mealType,
        meal_type_guessed: guessed,
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
  if ('meal_type' in patch) next.meal_type_guessed = false
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
        measured_timing: draft.measured_timing,
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
 * 초안을 하나씩 저장한다. 제외(skip)한 항목은 건너뛴다. 한 항목이 실패해도 나머지는 계속 저장하고,
 * 실패한 항목만 돌려준다. 식사·운동이 바뀐 날짜는 일일 요약을 다시 계산한다.
 */
export async function saveDrafts(drafts: LogDraft[]): Promise<SaveResult> {
  const failed: LogDraft[] = []
  const dates = new Set<string>()
  const summaryDates = new Set<string>()

  for (const draft of drafts) {
    if (draft.skip) continue
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
        measured_timing: draft.measured_timing,
      })
      return !useWeightStore.getState().error
    }
  }
}
