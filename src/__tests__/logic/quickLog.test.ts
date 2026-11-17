jest.mock('@/lib/supabase', () => ({ supabase: {} }))

import {
  applyCandidate,
  buildDrafts,
  patchMeal,
  saveDrafts,
  validateDraft,
  type MealDraft,
} from '@/features/ai-log/quickLog'
import { useMealStore } from '@/stores/mealStore'
import { useExerciseStore } from '@/stores/exerciseStore'
import { useWeightStore } from '@/stores/weightStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { useFoodStore } from '@/stores/foodStore'
import type { ParsedLogItem } from '@/stores/aiStore'
import type { FoodRow } from '@/types/database'

const DATE = '2026-11-18'

function food(overrides: Partial<FoodRow> = {}): FoodRow {
  return {
    id: 'f1',
    user_id: 'u1',
    normalized_name: '김치찌개',
    display_name: '김치찌개',
    calories: 500,
    protein_g: 20,
    carbs_g: 30,
    fat_g: 15,
    source: 'manual',
    confidence: null,
    note: null,
    use_count: 3,
    created_at: '2026-11-01T00:00:00.000Z',
    updated_at: '2026-11-01T00:00:00.000Z',
    ...overrides,
  }
}

const mealItem = (overrides: Partial<Extract<ParsedLogItem, { kind: 'meal' }>> = {}): ParsedLogItem => ({
  kind: 'meal',
  day_offset: 0,
  meal_type: 'lunch',
  food_name: '김치찌개',
  calories: 600,
  protein_g: 25,
  carbs_g: 40,
  fat_g: 18,
  confidence: 'medium',
  note: 'AI 노트',
  ...overrides,
})

describe('buildDrafts', () => {
  it('이름이 정확히 같은 저장 음식이 있으면 AI 추정 대신 저장값을 쓴다', async () => {
    const lookup = jest.fn().mockResolvedValue(food({ calories: 650 }))
    const [d] = await buildDrafts([mealItem()], DATE, { lookup, findVariants: async () => [] })
    expect(d).toMatchObject({ kind: 'meal', calories: 650, origin: 'saved' })
  })

  it('이름만 비슷한 변형은 자동으로 고르지 않고 후보로만 보여준다', async () => {
    const variants = [
      food({ id: 'a', display_name: '회사 앞 김치찌개', calories: 650 }),
      food({ id: 'b', display_name: '김치찌개 (집)', calories: 450 }),
    ]
    const [d] = await buildDrafts([mealItem()], DATE, {
      lookup: async () => null,
      findVariants: async () => variants,
    })
    expect(d).toMatchObject({ calories: 600, origin: 'ai', candidates: variants })
  })

  it('day_offset 을 기준일에서 뺀 날짜로 바꾼다', async () => {
    const drafts = await buildDrafts(
      [
        mealItem({ day_offset: -1 }),
        { kind: 'weight', day_offset: 0, weight_kg: 68 },
        { kind: 'exercise', day_offset: -2, exercise_name: '러닝', duration_minutes: 30, calories_burned: 300 },
      ],
      '2026-11-01',
      { lookup: async () => null, findVariants: async () => [] }
    )
    expect(drafts.map((d) => d.date)).toEqual(['2026-10-31', '2026-11-01', '2026-10-30'])
  })

  it('라이브러리 조회가 실패해도 AI 추정으로 초안을 만든다', async () => {
    const [d] = await buildDrafts([mealItem()], DATE, {
      lookup: () => Promise.reject(new Error('down')),
      findVariants: () => Promise.reject(new Error('down')),
    })
    expect(d).toMatchObject({ calories: 600, origin: 'ai', candidates: [] })
  })
})

describe('applyCandidate / patchMeal', () => {
  const base: MealDraft = {
    id: 'd1',
    kind: 'meal',
    date: DATE,
    meal_type: 'lunch',
    food_name: '김치찌개',
    calories: 600,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    origin: 'ai',
    confidence: 'medium',
    note: 'AI 노트',
    candidates: [],
  }

  it('후보를 고르면 이름과 칼로리를 그 가게 값으로 바꾼다', () => {
    const d = applyCandidate(base, food({ display_name: '회사 앞 김치찌개', calories: 650 }))
    expect(d).toMatchObject({ food_name: '회사 앞 김치찌개', calories: 650, origin: 'saved' })
  })

  it('칼로리를 고치면 직접 입력으로 바뀐다', () => {
    expect(patchMeal(base, { calories: 700 })).toMatchObject({ origin: 'manual', note: '' })
  })

  it('이름만 고치면 칼로리 출처는 그대로다', () => {
    expect(patchMeal(base, { food_name: '회사 앞 김치찌개' }).origin).toBe('ai')
  })

  it('끼니가 비어 있으면 기존 폼과 같은 문구로 막는다', () => {
    expect(validateDraft({ ...base, meal_type: null })).toBe('식사 종류를 선택해 주세요')
    expect(validateDraft({ ...base, calories: null })).toBe('칼로리를 입력해 주세요')
    expect(validateDraft(base)).toBeNull()
  })
})

describe('saveDrafts', () => {
  const addMeal = jest.fn()
  const addExercise = jest.fn()
  const addWeight = jest.fn()
  const calculateAndSave = jest.fn()
  const upsert = jest.fn()
  const recordUsage = jest.fn()

  beforeEach(() => {
    addMeal.mockReset().mockResolvedValue(undefined)
    addExercise.mockReset().mockResolvedValue(undefined)
    addWeight.mockReset().mockResolvedValue(undefined)
    calculateAndSave.mockReset().mockResolvedValue(undefined)
    upsert.mockReset().mockResolvedValue(undefined)
    recordUsage.mockReset().mockResolvedValue(undefined)
    useMealStore.setState({ error: null, addLog: addMeal })
    useExerciseStore.setState({ error: null, addLog: addExercise })
    useWeightStore.setState({ error: null, addLog: addWeight })
    useSummaryStore.setState({ calculateAndSave })
    useFoodStore.setState({ upsertFromEstimate: upsert, recordUsage })
  })

  const meal = (overrides: Partial<MealDraft> = {}): MealDraft => ({
    id: 'm1',
    kind: 'meal',
    date: DATE,
    meal_type: 'lunch',
    food_name: '회사 앞 김치찌개',
    calories: 650,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    origin: 'ai',
    confidence: 'medium',
    note: '',
    candidates: [],
    ...overrides,
  })

  it('직접 고친 칼로리는 라이브러리 값을 덮어쓴다', async () => {
    await saveDrafts([meal({ origin: 'manual' })])
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: '회사 앞 김치찌개', calories: 650, source: 'manual', ignoreDuplicates: false })
    )
  })

  it('AI 추정을 그대로 저장하면 기존 라이브러리 값을 덮지 않는다', async () => {
    await saveDrafts([meal({ origin: 'ai' })])
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ source: 'ai', ignoreDuplicates: true }))
  })

  it('실패한 항목만 돌려주고 나머지는 저장한다', async () => {
    addExercise.mockImplementation(async () => useExerciseStore.setState({ error: 'boom' }))
    const exercise = {
      id: 'e1',
      kind: 'exercise' as const,
      date: DATE,
      exercise_name: '러닝',
      duration_minutes: 30,
      calories_burned: 300,
    }
    const weight = { id: 'w1', kind: 'weight' as const, date: '2026-11-17', weight_kg: 68 }

    const result = await saveDrafts([meal(), exercise, weight])

    expect(result.failed).toEqual([exercise])
    expect(result.dates.sort()).toEqual(['2026-11-17', DATE])
    expect(addMeal).toHaveBeenCalledTimes(1)
    expect(addWeight).toHaveBeenCalledWith({ weight_kg: 68, weight_date: '2026-11-17' })
    // 체중만 바뀐 날은 일일 요약을 다시 계산하지 않는다
    expect(calculateAndSave).toHaveBeenCalledTimes(1)
    expect(calculateAndSave).toHaveBeenCalledWith(DATE)
  })
})
