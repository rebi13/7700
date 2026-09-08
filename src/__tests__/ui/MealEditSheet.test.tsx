import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/lib/supabase', () => ({ supabase: {} }))
jest.mock('@/lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

import { useMealStore } from '@/stores/mealStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { useAiStore } from '@/stores/aiStore'
import { useFoodStore } from '@/stores/foodStore'
import { MealEditSheet } from '@/features/meal/MealEditSheet'
import type { MealLogRow } from '@/types/database'

const DATE = '2026-08-18'

const updateLog = jest.fn()
const fetchLogs = jest.fn()
const calculateAndSave = jest.fn()
const estimateCalories = jest.fn()
const foodLookup = jest.fn()
const foodSearch = jest.fn()
const foodUpsert = jest.fn()
const foodRecordUsage = jest.fn()

const item: MealLogRow = {
  id: 'm1',
  user_id: 'u1',
  meal_date: DATE,
  meal_type: 'lunch',
  food_name: '김치찌개',
  calories: 300,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  memo: null,
  created_at: '2026-08-18T00:00:00.000Z',
}

beforeEach(() => {
  updateLog.mockReset().mockResolvedValue(undefined)
  fetchLogs.mockReset().mockResolvedValue(undefined)
  calculateAndSave.mockReset().mockResolvedValue(undefined)
  estimateCalories.mockReset()
  foodLookup.mockReset().mockResolvedValue(null)
  foodSearch.mockReset().mockResolvedValue([])
  foodUpsert.mockReset().mockResolvedValue(undefined)
  foodRecordUsage.mockReset().mockResolvedValue(undefined)

  useMealStore.setState({ isLoading: false, error: null, updateLog, fetchLogs })
  useSummaryStore.setState({ calculateAndSave })
  useAiStore.setState({ isEstimating: false, error: null, estimateCalories })
  useFoodStore.setState({
    suggestions: [],
    lookup: foodLookup,
    search: foodSearch,
    upsertFromEstimate: foodUpsert,
    recordUsage: foodRecordUsage,
  })
})

it('수정 시트에도 AI 칼로리 추정 버튼이 있다', () => {
  render(<MealEditSheet item={item} date={DATE} onClose={jest.fn()} />)

  expect(screen.getByRole('button', { name: /AI 칼로리 추정/ })).toBeEnabled()
})

it('저장된 음식이면 수정 중에도 AI 없이 캐시 값으로 채운다', async () => {
  foodLookup.mockResolvedValue({
    id: 'f1',
    display_name: '김치찌개',
    calories: 250,
    protein_g: 12,
    carbs_g: null,
    fat_g: null,
    confidence: 'high',
    note: '',
    source: 'ai',
  })
  render(<MealEditSheet item={item} date={DATE} onClose={jest.fn()} />)

  await userEvent.click(screen.getByRole('button', { name: /AI 칼로리 추정/ }))

  await waitFor(() => expect(screen.getByLabelText(/칼로리/)).toHaveValue('250'))
  expect(estimateCalories).not.toHaveBeenCalled()
})
