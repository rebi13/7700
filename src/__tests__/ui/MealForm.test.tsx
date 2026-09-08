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
import { toast } from '@/lib/toast'
import { MealForm } from '@/features/meal/MealForm'

const DATE = '2026-08-18'

const addLog = jest.fn()
const calculateAndSave = jest.fn()
const estimateCalories = jest.fn()
const foodLookup = jest.fn()
const foodSearch = jest.fn()
const foodUpsert = jest.fn()
const foodRecordUsage = jest.fn()

beforeEach(() => {
  addLog.mockReset().mockResolvedValue(undefined)
  calculateAndSave.mockReset().mockResolvedValue(undefined)
  estimateCalories.mockReset()
  foodLookup.mockReset().mockResolvedValue(null)
  foodSearch.mockReset().mockResolvedValue([])
  foodUpsert.mockReset().mockResolvedValue(undefined)
  foodRecordUsage.mockReset().mockResolvedValue(undefined)
  ;(toast.success as jest.Mock).mockReset()
  ;(toast.error as jest.Mock).mockReset()

  useMealStore.setState({ logs: [], isLoading: false, error: null, addLog })
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

/** 칩은 Radix ToggleGroup 이라 button 이 아니라 radio 롤로 잡힌다 */
const pickMealType = (label: string) =>
  userEvent.click(screen.getByRole('radio', { name: label }))

async function fillValidMeal() {
  await pickMealType('점심')
  await userEvent.type(screen.getByLabelText(/음식 이름/), '김치찌개')
  await userEvent.type(screen.getByLabelText(/칼로리/), '300')
}

const save = () => userEvent.click(screen.getByRole('button', { name: '저장' }))

describe('MealForm 검증', () => {
  it('빈 폼으로 저장하면 필수 항목을 짚어주고 저장하지 않는다', async () => {
    render(<MealForm date={DATE} />)

    await save()

    // 회귀 방지: 값이 undefined 인 필드는 zod 기본 문구인 영어 "Required" 가 떴다.
    expect(await screen.findByText('식사 종류를 선택해 주세요')).toBeInTheDocument()
    expect(screen.getByText('음식 이름을 입력해 주세요')).toBeInTheDocument()
    expect(screen.getByText('칼로리를 입력해 주세요')).toBeInTheDocument()
    expect(screen.queryByText(/Required|String must contain/)).not.toBeInTheDocument()
    expect(addLog).not.toHaveBeenCalled()
  })

  it('칼로리가 비어 있으면 저장하지 않는다', async () => {
    render(<MealForm date={DATE} />)
    await pickMealType('점심')
    await userEvent.type(screen.getByLabelText(/음식 이름/), '김치찌개')

    await save()

    expect(await screen.findByText('칼로리를 입력해 주세요')).toBeInTheDocument()
    expect(addLog).not.toHaveBeenCalled()
  })

  it('칼로리 상한을 넘으면 저장하지 않는다', async () => {
    render(<MealForm date={DATE} />)
    await pickMealType('점심')
    await userEvent.type(screen.getByLabelText(/음식 이름/), '김치찌개')
    await userEvent.type(screen.getByLabelText(/칼로리/), '10000')

    await save()

    expect(await screen.findByText('칼로리는 9999kcal 이하여야 합니다')).toBeInTheDocument()
    expect(addLog).not.toHaveBeenCalled()
  })
})

describe('MealForm 저장', () => {
  it('문자열로 입력한 숫자를 숫자로 바꿔 넘긴다', async () => {
    render(<MealForm date={DATE} />)
    await fillValidMeal()

    await save()

    await waitFor(() => expect(addLog).toHaveBeenCalledTimes(1))
    expect(addLog).toHaveBeenCalledWith(
      expect.objectContaining({
        meal_date: DATE,
        meal_type: 'lunch',
        food_name: '김치찌개',
        calories: 300,
      })
    )
  })

  it('저장에 성공하면 요약을 다시 계산하고 알린다', async () => {
    render(<MealForm date={DATE} />)
    await fillValidMeal()

    await save()

    await waitFor(() => expect(calculateAndSave).toHaveBeenCalledWith(DATE))
    expect(toast.success).toHaveBeenCalledWith('식사 기록이 저장되었습니다')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('저장에 성공하면 폼을 비워 다음 입력을 받는다', async () => {
    render(<MealForm date={DATE} />)
    await fillValidMeal()

    await save()

    await waitFor(() => expect(screen.getByLabelText(/음식 이름/)).toHaveValue(''))
    expect(screen.getByLabelText(/칼로리/)).toHaveValue('')
  })

  it('스토어가 오류를 남기면 그 사유를 그대로 알리고 요약은 건드리지 않는다', async () => {
    addLog.mockImplementation(async () => {
      useMealStore.setState({ error: '저장 권한이 없습니다' })
    })
    render(<MealForm date={DATE} />)
    await fillValidMeal()

    await save()

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('저장 권한이 없습니다'))
    expect(calculateAndSave).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })
})

describe('MealForm 의 AI 칼로리 추정', () => {
  it('음식 이름이 비어 있으면 추정 버튼을 누를 수 없다', () => {
    render(<MealForm date={DATE} />)

    expect(screen.getByRole('button', { name: /AI 칼로리 추정/ })).toBeDisabled()
  })

  it('추정에 성공하면 칼로리와 매크로를 채우고 근거를 보여준다', async () => {
    estimateCalories.mockResolvedValue({
      calories: 300,
      protein_g: 14,
      carbs_g: 18,
      fat_g: 20,
      confidence: 'high',
      note: '김치찌개 1인분 평균',
    })
    render(<MealForm date={DATE} />)
    await userEvent.type(screen.getByLabelText(/음식 이름/), '김치찌개')

    await userEvent.click(screen.getByRole('button', { name: /AI 칼로리 추정/ }))

    await waitFor(() => expect(screen.getByLabelText(/칼로리/)).toHaveValue('300'))
    expect(screen.getByLabelText(/단백질/)).toHaveValue('14')
    expect(screen.getByText('김치찌개 1인분 평균')).toBeInTheDocument()
  })

  it('추정에 실패하면 스토어가 번역해둔 사유를 알린다', async () => {
    estimateCalories.mockImplementation(async () => {
      useAiStore.setState({ error: 'AI 사용량이 모두 소진되었습니다. 관리자에게 문의해 주세요.' })
      return null
    })
    render(<MealForm date={DATE} />)
    await userEvent.type(screen.getByLabelText(/음식 이름/), '김치찌개')

    await userEvent.click(screen.getByRole('button', { name: /AI 칼로리 추정/ }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'AI 사용량이 모두 소진되었습니다. 관리자에게 문의해 주세요.'
      )
    )
  })
})

describe('MealForm 의 음식 라이브러리', () => {
  const cached = {
    id: 'f1',
    display_name: '김치찌개',
    calories: 250,
    protein_g: 12,
    carbs_g: null,
    fat_g: null,
    confidence: 'high',
    note: '',
    source: 'ai',
  }

  it('저장된 음식이면 AI 를 부르지 않고 캐시 값으로 채운다', async () => {
    foodLookup.mockResolvedValue(cached)
    render(<MealForm date={DATE} />)
    await userEvent.type(screen.getByLabelText(/음식 이름/), '김치찌개')

    await userEvent.click(screen.getByRole('button', { name: /AI 칼로리 추정/ }))

    await waitFor(() => expect(screen.getByLabelText(/칼로리/)).toHaveValue('250'))
    expect(estimateCalories).not.toHaveBeenCalled()
    expect(screen.getByText(/저장된 값/)).toBeInTheDocument()
  })

  it('처음 보는 음식은 AI 로 추정하고 라이브러리에 저장한다', async () => {
    foodLookup.mockResolvedValue(null)
    estimateCalories.mockResolvedValue({
      calories: 300,
      protein_g: 14,
      carbs_g: 18,
      fat_g: 20,
      confidence: 'high',
      note: '평균 1인분',
    })
    render(<MealForm date={DATE} />)
    await userEvent.type(screen.getByLabelText(/음식 이름/), '신메뉴')

    await userEvent.click(screen.getByRole('button', { name: /AI 칼로리 추정/ }))

    await waitFor(() => expect(estimateCalories).toHaveBeenCalledTimes(1))
    expect(foodUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'ai', ignoreDuplicates: true, calories: 300 })
    )
  })

  it('자동완성에서 저장된 음식을 고르면 칼로리를 채운다', async () => {
    const row = {
      id: 'f2',
      display_name: '현미밥',
      calories: 320,
      protein_g: 6,
      carbs_g: 68,
      fat_g: 2,
      confidence: null,
      note: null,
      source: 'manual',
    }
    foodSearch.mockImplementation(async () => {
      useFoodStore.setState({ suggestions: [row as never] })
      return [row]
    })
    render(<MealForm date={DATE} />)
    await userEvent.type(screen.getByLabelText(/음식 이름/), '현미')

    await userEvent.click(await screen.findByRole('button', { name: /현미밥/ }))

    await waitFor(() => expect(screen.getByLabelText(/칼로리/)).toHaveValue('320'))
    expect(screen.getByLabelText(/음식 이름/)).toHaveValue('현미밥')
  })
})
