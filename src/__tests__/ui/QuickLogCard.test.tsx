import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/lib/supabase', () => ({ supabase: {} }))
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { useAiStore, type ParsedLogItem } from '@/stores/aiStore'
import { useFoodStore } from '@/stores/foodStore'
import { useMealStore } from '@/stores/mealStore'
import { useExerciseStore } from '@/stores/exerciseStore'
import { useWeightStore } from '@/stores/weightStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { toast } from '@/lib/toast'
import { QuickLogCard } from '@/features/ai-log/QuickLogCard'
import type { FoodRow } from '@/types/database'

const DATE = '2026-11-18'

const parseLog = jest.fn()
const lookup = jest.fn()
const findVariants = jest.fn()
const addMeal = jest.fn()
const addExercise = jest.fn()
const addWeight = jest.fn()
const calculateAndSave = jest.fn()
const onSaved = jest.fn()
const peekMeals = jest.fn()
const peekExercises = jest.fn()

const variant: FoodRow = {
  id: 'v1',
  user_id: 'u1',
  normalized_name: '회사 앞 김치찌개',
  display_name: '회사 앞 김치찌개',
  calories: 650,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  source: 'manual',
  confidence: null,
  note: null,
  use_count: 4,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
}

const ITEMS: ParsedLogItem[] = [
  {
    kind: 'meal',
    day_offset: 0,
    meal_type: 'lunch',
    food_name: '김치찌개',
    calories: 550,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    confidence: 'medium',
    note: '',
  },
  { kind: 'exercise', day_offset: 0, exercise_name: '러닝', duration_minutes: 30, calories_burned: 300 },
  { kind: 'weight', day_offset: -1, weight_kg: 68.2, measured_timing: null },
]

beforeEach(() => {
  for (const m of [
    parseLog,
    lookup,
    findVariants,
    addMeal,
    addExercise,
    addWeight,
    calculateAndSave,
    onSaved,
    peekMeals,
    peekExercises,
  ]) {
    m.mockReset()
  }
  peekMeals.mockResolvedValue([])
  peekExercises.mockResolvedValue([])
  parseLog.mockResolvedValue(ITEMS)
  lookup.mockResolvedValue(null)
  findVariants.mockImplementation(async (name: string) => (name === '김치찌개' ? [variant] : []))
  ;(toast.success as jest.Mock).mockReset()
  ;(toast.error as jest.Mock).mockReset()

  useAiStore.setState({ isParsing: false, error: null, parseQuota: null, parseLog })
  useFoodStore.setState({
    lookup,
    findVariants,
    upsertFromEstimate: jest.fn().mockResolvedValue(undefined),
    recordUsage: jest.fn().mockResolvedValue(undefined),
  })
  useMealStore.setState({ error: null, addLog: addMeal, peekLogs: peekMeals })
  useExerciseStore.setState({ error: null, addLog: addExercise, peekLogs: peekExercises })
  useWeightStore.setState({ error: null, addLog: addWeight })
  useSummaryStore.setState({ calculateAndSave })
})

async function parse(text = '점심 김치찌개, 30분 러닝, 어제 체중 68.2') {
  render(<QuickLogCard date={DATE} onSaved={onSaved} />)
  await userEvent.type(screen.getByLabelText('기록 내용'), text)
  await userEvent.click(screen.getByRole('button', { name: '항목으로 정리하기' }))
  return screen.findByRole('button', { name: '3건 저장' })
}

describe('QuickLogCard', () => {
  it('문장으로 정리를 요청하고 항목별 미리보기를 보여준다', async () => {
    await parse()

    expect(parseLog).toHaveBeenCalledWith('점심 김치찌개, 30분 러닝, 어제 체중 68.2')
    expect(screen.getByLabelText('음식 이름')).toHaveValue('김치찌개')
    expect(screen.getByLabelText('칼로리')).toHaveValue('550')
    expect(screen.getByLabelText('운동 이름')).toHaveValue('러닝')
    expect(screen.getByLabelText('체중')).toHaveValue('68.2')
    // 기준일이 아닌 항목은 날짜를 따로 표시한다
    expect(screen.getByText('11/17')).toBeInTheDocument()
  })

  it('체중을 잰 시점을 골라 저장할 수 있다', async () => {
    const save = await parse()
    expect(screen.getByText(/매일 기상 직후에 재는 게 가장 좋아요/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: '기상 직후' }))
    expect(screen.queryByText(/매일 기상 직후에 재는 게 가장 좋아요/)).not.toBeInTheDocument()
    await userEvent.click(save)

    await waitFor(() =>
      expect(addWeight).toHaveBeenCalledWith(
        expect.objectContaining({ weight_kg: 68.2, measured_timing: 'morning' })
      )
    )
  })

  it('같은 메뉴의 저장된 가게 값을 골라 칼로리를 바꿀 수 있다', async () => {
    await parse()

    await userEvent.click(screen.getByRole('button', { name: '회사 앞 김치찌개 · 650kcal' }))

    expect(screen.getByLabelText('음식 이름')).toHaveValue('회사 앞 김치찌개')
    expect(screen.getByLabelText('칼로리')).toHaveValue('650')
  })

  it('저장하면 항목마다 기존 스토어로 저장하고 입력을 비운다', async () => {
    const save = await parse()

    await userEvent.click(save)

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('3건을 기록했습니다'))
    expect(addMeal).toHaveBeenCalledWith(
      expect.objectContaining({ food_name: '김치찌개', calories: 550, meal_type: 'lunch', meal_date: DATE })
    )
    expect(addExercise).toHaveBeenCalledWith(
      expect.objectContaining({ exercise_name: '러닝', calories_burned: 300, exercise_date: DATE })
    )
    expect(addWeight).toHaveBeenCalledWith({
      weight_kg: 68.2,
      weight_date: '2026-11-17',
      measured_timing: null,
    })
    expect(onSaved).toHaveBeenCalled()
    expect(screen.getByLabelText('기록 내용')).toHaveValue('')
  })

  it('필수 값이 빠진 항목이 있으면 아무것도 저장하지 않고 그 항목에 이유를 보여준다', async () => {
    const save = await parse()

    const calories = screen.getByLabelText('칼로리')
    await userEvent.clear(calories)
    await userEvent.click(save)

    expect(await screen.findByRole('alert')).toHaveTextContent('칼로리를 입력해 주세요')
    expect(addMeal).not.toHaveBeenCalled()
    expect(addExercise).not.toHaveBeenCalled()
  })

  it('항목을 지우면 그 항목은 저장하지 않는다', async () => {
    await parse()

    const weightRow = screen.getByLabelText('체중').closest('li') as HTMLElement
    await userEvent.click(within(weightRow).getByRole('button', { name: '항목 삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '2건 저장' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('2건을 기록했습니다'))
    expect(addWeight).not.toHaveBeenCalled()
  })

  it('소수점을 입력하는 중간 상태가 지워지지 않는다', async () => {
    await parse()

    const weight = screen.getByLabelText('체중')
    await userEvent.clear(weight)
    await userEvent.type(weight, '67.')
    expect(weight).toHaveValue('67.')
    await userEvent.type(weight, '5')
    expect(weight).toHaveValue('67.5')
  })

  it('사용자가 말한 소모 칼로리는 그대로 쓰고 안내를 띄우지 않는다', async () => {
    await parse()
    expect(screen.getByLabelText('소모 칼로리')).toHaveValue('300')
    expect(screen.queryByText(/소모 칼로리는 추정하지 않아요/)).not.toBeInTheDocument()
  })

  it('소모 칼로리를 말하지 않으면 비워 두고 직접 넣게 한다', async () => {
    parseLog.mockResolvedValue([
      { kind: 'exercise', day_offset: 0, exercise_name: '러닝', duration_minutes: 30, calories_burned: null },
    ])
    render(<QuickLogCard date={DATE} />)
    await userEvent.type(screen.getByLabelText('기록 내용'), '러닝 30분')
    await userEvent.click(screen.getByRole('button', { name: '항목으로 정리하기' }))

    expect(await screen.findByText(/소모 칼로리는 추정하지 않아요/)).toBeInTheDocument()
    expect(screen.getByLabelText('소모 칼로리')).toHaveValue('')

    await userEvent.click(screen.getByRole('button', { name: '1건 저장' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('소모 칼로리를 입력해 주세요')
    expect(addExercise).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('소모 칼로리'), '280')
    expect(screen.queryByText(/소모 칼로리는 추정하지 않아요/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '1건 저장' }))
    await waitFor(() =>
      expect(addExercise).toHaveBeenCalledWith(expect.objectContaining({ calories_burned: 280 }))
    )
  })

  it('다시 입력 후 문장을 안 고치고 정리하면 AI 를 다시 부르지 않는다', async () => {
    await parse()
    await userEvent.click(screen.getByRole('button', { name: '다시 입력' }))
    expect(screen.getByLabelText('기록 내용')).toHaveValue('점심 김치찌개, 30분 러닝, 어제 체중 68.2')

    await userEvent.click(screen.getByRole('button', { name: '항목으로 정리하기' }))

    expect(await screen.findByRole('button', { name: '3건 저장' })).toBeInTheDocument()
    expect(parseLog).toHaveBeenCalledTimes(1)
  })

  it('문장을 고치면 다시 정리한다', async () => {
    await parse()
    await userEvent.click(screen.getByRole('button', { name: '다시 입력' }))
    await userEvent.type(screen.getByLabelText('기록 내용'), ' 저녁 샐러드')
    await userEvent.click(screen.getByRole('button', { name: '항목으로 정리하기' }))

    await waitFor(() => expect(parseLog).toHaveBeenCalledTimes(2))
  })

  it('이미 기록된 끼니는 빼 둔 채로 보여주고, 원하면 다시 넣을 수 있다', async () => {
    peekMeals.mockResolvedValue([{ food_name: '김치찌개', meal_type: 'lunch' }])
    render(<QuickLogCard date={DATE} onSaved={onSaved} />)
    await userEvent.type(screen.getByLabelText('기록 내용'), '점심 김치찌개, 30분 러닝, 어제 체중 68.2')
    await userEvent.click(screen.getByRole('button', { name: '항목으로 정리하기' }))

    expect(await screen.findByText('이미 기록된 항목이라 빼 두었어요.')).toBeInTheDocument()
    expect(screen.queryByLabelText('음식 이름')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '2건 저장' }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('2건을 기록했습니다'))
    expect(addMeal).not.toHaveBeenCalled()
  })

  it('빼 둔 중복 항목을 그래도 추가할 수 있다', async () => {
    peekMeals.mockResolvedValue([{ food_name: '김치찌개', meal_type: 'lunch' }])
    render(<QuickLogCard date={DATE} />)
    await userEvent.type(screen.getByLabelText('기록 내용'), '점심 김치찌개')
    await userEvent.click(screen.getByRole('button', { name: '항목으로 정리하기' }))

    await userEvent.click(await screen.findByRole('button', { name: '그래도 추가' }))

    expect(screen.getByLabelText('음식 이름')).toHaveValue('김치찌개')
    expect(screen.getByRole('button', { name: '3건 저장' })).toBeInTheDocument()
  })

  it('오늘 남은 정리 횟수를 보여준다', async () => {
    useAiStore.setState({ parseQuota: { remaining: 17, limit: 20 } })
    render(<QuickLogCard date={DATE} />)
    expect(screen.getByText('오늘 남은 정리 횟수 17/20회')).toBeInTheDocument()
  })

  it('정리에 실패하면 안내를 띄우고 입력을 그대로 둔다', async () => {
    parseLog.mockImplementation(async () => {
      useAiStore.setState({ error: '요청이 몰리고 있습니다. 잠시 후 다시 시도해 주세요.' })
      return null
    })
    render(<QuickLogCard date={DATE} />)
    await userEvent.type(screen.getByLabelText('기록 내용'), '점심 김밥')
    await userEvent.click(screen.getByRole('button', { name: '항목으로 정리하기' }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('요청이 몰리고 있습니다. 잠시 후 다시 시도해 주세요.')
    )
    expect(screen.getByLabelText('기록 내용')).toHaveValue('점심 김밥')
  })
})
