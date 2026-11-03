import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/lib/supabase', () => ({ supabase: {} }))

import { useGoalStore } from '@/stores/goalStore'
import { useProfileStore } from '@/stores/profileStore'
import { GoalEditSheet } from '@/features/goal/GoalEditSheet'
import { addDays, todayISO } from '@/utils/date'
import type { GoalRow, ProfileRow } from '@/types/database'

const updateGoal = jest.fn()
const onClose = jest.fn()
const today = todayISO()

function goal(overrides: Partial<GoalRow> = {}): GoalRow {
  return {
    id: 'g1',
    user_id: 'u1',
    start_weight_kg: 80,
    target_weight_kg: 75,
    start_date: today,
    target_date: addDays(today, 100),
    is_active: true,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

function setup(activeGoal: GoalRow) {
  useGoalStore.setState({ activeGoal, isLoading: false, error: null, updateGoal })
  useProfileStore.setState({ profile: { current_weight_kg: 80 } as ProfileRow })
  render(<GoalEditSheet open onClose={onClose} />)
}

const save = () => userEvent.click(screen.getByRole('button', { name: '저장' }))

beforeEach(() => {
  updateGoal.mockReset().mockResolvedValue(undefined)
  onClose.mockReset()
})

it('바꾼 시작일로 목표를 저장한다', async () => {
  setup(goal())

  fireEvent.change(screen.getByLabelText(/시작일/), { target: { value: addDays(today, -7) } })
  await save()

  await waitFor(() => expect(updateGoal).toHaveBeenCalledTimes(1))
  expect(updateGoal).toHaveBeenCalledWith(
    expect.objectContaining({ start_date: addDays(today, -7) })
  )
})

it('목표를 만들 때의 시작 체중을 안내한다', () => {
  setup(goal({ start_weight_kg: 82.5 }))

  expect(screen.getByText(/목표를 만들 때의 프로필 체중 \(82.5 kg\)/)).toBeInTheDocument()
})

/**
 * 회귀 방지: 목표일이 지난 목표는 "목표일은 오늘 이후" 검사에 걸려 시작일만
 * 고치려 해도 저장되지 않았다.
 */
it('목표일이 지난 목표도 목표일을 그대로 두면 시작일을 고칠 수 있다', async () => {
  setup(goal({ start_date: addDays(today, -60), target_date: addDays(today, -3) }))

  fireEvent.change(screen.getByLabelText(/시작일/), { target: { value: addDays(today, -30) } })
  await save()

  await waitFor(() => expect(updateGoal).toHaveBeenCalledTimes(1))
  expect(updateGoal).toHaveBeenCalledWith(
    expect.objectContaining({
      start_date: addDays(today, -30),
      target_date: addDays(today, -3),
    })
  )
})
