import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/lib/supabase', () => ({ supabase: {} }))
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { useExerciseStore } from '@/stores/exerciseStore'
import { useWeightStore } from '@/stores/weightStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { toast } from '@/lib/toast'
import { ExerciseForm } from '@/features/exercise/ExerciseForm'
import { WeightForm } from '@/features/weight/WeightForm'

const DATE = '2026-08-19'

const addExercise = jest.fn()
const addWeight = jest.fn()
const calculateAndSave = jest.fn()

beforeEach(() => {
  addExercise.mockReset().mockResolvedValue(undefined)
  addWeight.mockReset().mockResolvedValue(undefined)
  calculateAndSave.mockReset().mockResolvedValue(undefined)
  ;(toast.success as jest.Mock).mockReset()
  ;(toast.error as jest.Mock).mockReset()

  useExerciseStore.setState({ logs: [], isLoading: false, error: null, addLog: addExercise })
  useWeightStore.setState({ logs: [], isLoading: false, error: null, addLog: addWeight })
  useSummaryStore.setState({ calculateAndSave })
})

const save = () => userEvent.click(screen.getByRole('button', { name: '저장' }))

describe('ExerciseForm', () => {
  it('빈 폼으로 저장하면 필수 항목을 한국어로 짚어준다', async () => {
    render(<ExerciseForm date={DATE} />)

    await save()

    expect(await screen.findByText('운동 이름을 입력해 주세요')).toBeInTheDocument()
    expect(screen.getByText('소모 칼로리를 입력해 주세요')).toBeInTheDocument()
    expect(screen.queryByText(/Required|String must contain/)).not.toBeInTheDocument()
    expect(addExercise).not.toHaveBeenCalled()
  })

  it('문자열 숫자를 숫자로 바꿔 넘긴다', async () => {
    render(<ExerciseForm date={DATE} />)
    await userEvent.type(screen.getByLabelText(/운동 이름/), '걷기')
    await userEvent.type(screen.getByLabelText(/소모 칼로리/), '200')
    await userEvent.type(screen.getByLabelText(/운동 시간/), '30')

    await save()

    await waitFor(() => expect(addExercise).toHaveBeenCalledTimes(1))
    expect(addExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        exercise_date: DATE,
        exercise_name: '걷기',
        calories_burned: 200,
        duration_minutes: 30,
      })
    )
  })

  it('저장에 성공하면 요약을 다시 계산하고 알린다', async () => {
    render(<ExerciseForm date={DATE} />)
    await userEvent.type(screen.getByLabelText(/운동 이름/), '걷기')
    await userEvent.type(screen.getByLabelText(/소모 칼로리/), '200')

    await save()

    await waitFor(() => expect(calculateAndSave).toHaveBeenCalledWith(DATE))
    expect(toast.success).toHaveBeenCalledWith('운동 기록이 저장되었습니다')
  })

  it('스토어가 오류를 남기면 요약을 건드리지 않는다', async () => {
    addExercise.mockImplementation(async () => {
      useExerciseStore.setState({ error: '저장에 실패했습니다' })
    })
    render(<ExerciseForm date={DATE} />)
    await userEvent.type(screen.getByLabelText(/운동 이름/), '걷기')
    await userEvent.type(screen.getByLabelText(/소모 칼로리/), '200')

    await save()

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('저장에 실패했습니다'))
    expect(calculateAndSave).not.toHaveBeenCalled()
  })
})

describe('WeightForm', () => {
  it('체중이 비어 있으면 저장하지 않는다', async () => {
    render(<WeightForm date={DATE} />)

    await save()

    expect(await screen.findByText('체중을 입력해 주세요')).toBeInTheDocument()
    expect(addWeight).not.toHaveBeenCalled()
  })

  it('범위를 벗어난 체중은 저장하지 않는다', async () => {
    render(<WeightForm date={DATE} />)
    await userEvent.type(screen.getByLabelText(/체중/), '500')

    await save()

    expect(await screen.findByText('체중은 300kg 이하여야 합니다')).toBeInTheDocument()
    expect(addWeight).not.toHaveBeenCalled()
  })

  it('측정 시간대 없이도 저장된다', async () => {
    render(<WeightForm date={DATE} />)
    await userEvent.type(screen.getByLabelText(/체중/), '92')

    await save()

    await waitFor(() => expect(addWeight).toHaveBeenCalledTimes(1))
    expect(addWeight).toHaveBeenCalledWith(
      expect.objectContaining({ weight_date: DATE, weight_kg: 92, measured_timing: null })
    )
  })

  /**
   * 측정 시간대만 다시 눌러 해제할 수 있다(deselectable). 식사 종류 칩은
   * 필수라 해제되면 안 되므로, 이 차이가 유지되는지 확인한다.
   */
  it('측정 시간대 칩은 다시 누르면 해제된다', async () => {
    render(<WeightForm date={DATE} />)
    const chip = screen.getByRole('radio', { name: '오후' })

    await userEvent.click(chip)
    expect(chip).toHaveAttribute('data-state', 'on')

    await userEvent.click(chip)
    expect(chip).toHaveAttribute('data-state', 'off')
  })

  it('선택한 측정 시간대를 함께 넘긴다', async () => {
    render(<WeightForm date={DATE} />)
    await userEvent.type(screen.getByLabelText(/체중/), '92')
    await userEvent.click(screen.getByRole('radio', { name: '기상 직후' }))

    await save()

    await waitFor(() =>
      expect(addWeight).toHaveBeenCalledWith(
        expect.objectContaining({ weight_kg: 92, measured_timing: 'morning' })
      )
    )
  })

  it('체중 저장은 칼로리 요약을 다시 계산하지 않는다', async () => {
    // 체중은 섭취·소모에 영향을 주지 않으므로 요약을 건드릴 이유가 없다.
    render(<WeightForm date={DATE} />)
    await userEvent.type(screen.getByLabelText(/체중/), '92')

    await save()

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('체중 기록이 저장되었습니다'))
    expect(calculateAndSave).not.toHaveBeenCalled()
  })
})
