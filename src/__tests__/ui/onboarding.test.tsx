import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/lib/supabase', () => ({ supabase: {} }))

import { useProfileStore } from '@/stores/profileStore'
import { useGoalStore } from '@/stores/goalStore'
import { getDaysRemaining } from '@/utils/date'
import type { ProfileRow } from '@/types/database'
import { ProfilePage } from '@/features/onboarding/ProfilePage'
import { GoalPage } from '@/features/goal/GoalPage'

const createProfile = jest.fn()
const createGoal = jest.fn()

/** 로컬 기준으로 n일 뒤의 YYYY-MM-DD */
function isoInDays(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** type="date" 입력은 키 입력 대신 값 변경으로 채운다 */
function setDate(label: RegExp | string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

const PROFILE = {
  id: 'p1',
  user_id: 'u1',
  height_cm: 175,
  current_weight_kg: 80,
  birth_date: '1990-01-01',
  gender: 'male',
  activity_level: 'moderate',
} as unknown as ProfileRow

function resetStores(profileOverrides: Record<string, unknown> = {}) {
  useProfileStore.setState({
    profile: null,
    tdee: null,
    bmr: null,
    isLoading: false,
    error: null,
    createProfile,
    ...profileOverrides,
  })
  useGoalStore.setState({
    activeGoal: null,
    isLoading: false,
    error: null,
    createGoal,
  })
}

beforeEach(() => {
  createProfile.mockReset().mockResolvedValue(undefined)
  createGoal.mockReset().mockResolvedValue(undefined)
  resetStores()
})

describe('ProfilePage', () => {
  async function next() {
    await userEvent.click(screen.getByRole('button', { name: '다음' }))
  }

  it('빈 폼으로 제출하면 필수 항목을 한국어로 짚어준다', async () => {
    render(<ProfilePage />)

    await next()

    expect(await screen.findByText('키를 입력해 주세요')).toBeInTheDocument()
    expect(screen.getByText('체중을 입력해 주세요')).toBeInTheDocument()
    expect(screen.getByText('생년월일을 입력해 주세요')).toBeInTheDocument()
    expect(screen.getByText('성별을 선택해 주세요')).toBeInTheDocument()
    expect(screen.getByText('활동 수준을 선택해 주세요')).toBeInTheDocument()
    expect(screen.queryByText(/Required|Expected/)).not.toBeInTheDocument()
    expect(createProfile).not.toHaveBeenCalled()
  })

  it('범위를 벗어난 키는 저장하지 않는다', async () => {
    render(<ProfilePage />)
    await userEvent.type(screen.getByLabelText(/키/), '300')

    await next()

    expect(await screen.findByText('키는 250cm 이하여야 합니다')).toBeInTheDocument()
    expect(createProfile).not.toHaveBeenCalled()
  })

  it('미래 생년월일은 저장하지 않는다', async () => {
    render(<ProfilePage />)
    setDate(/생년월일/, isoInDays(30))

    await next()

    expect(
      await screen.findByText('생년월일은 과거 날짜여야 합니다')
    ).toBeInTheDocument()
    expect(createProfile).not.toHaveBeenCalled()
  })

  it('입력을 DB 컬럼 이름과 숫자로 바꿔 넘긴다', async () => {
    render(<ProfilePage />)
    await userEvent.type(screen.getByLabelText(/키/), '175')
    await userEvent.type(screen.getByLabelText(/현재 체중/), '80')
    setDate(/생년월일/, '1990-01-01')
    await userEvent.click(screen.getByRole('radio', { name: '남성' }))
    await userEvent.click(screen.getByRole('radio', { name: /보통 활동/ }))

    await next()

    await waitFor(() => expect(createProfile).toHaveBeenCalledTimes(1))
    expect(createProfile).toHaveBeenCalledWith({
      height_cm: 175,
      current_weight_kg: 80,
      birth_date: '1990-01-01',
      gender: 'male',
      activity_level: 'moderate',
    })
  })

  it('스토어 오류를 배너로 보여준다', () => {
    resetStores({ error: '프로필 저장에 실패했습니다' })

    render(<ProfilePage />)

    expect(screen.getByText('프로필 저장에 실패했습니다')).toBeInTheDocument()
  })
})

describe('GoalPage', () => {
  const withProfile = (tdee: number | null = 2000) =>
    resetStores({ profile: PROFILE, tdee })

  async function start() {
    await userEvent.click(screen.getByRole('button', { name: '시작하기' }))
  }

  it('아무것도 입력하지 않으면 자동 계산을 보여주지 않는다', () => {
    withProfile()

    render(<GoalPage />)

    expect(screen.queryByText('자동 계산 결과')).not.toBeInTheDocument()
  })

  it('목표 체중만 넣어도 감량 목표를 계산한다', async () => {
    withProfile()
    render(<GoalPage />)

    await userEvent.type(screen.getByLabelText(/목표 체중/), '75')

    expect(await screen.findByText('자동 계산 결과')).toBeInTheDocument()
    expect(screen.getByText('5 kg')).toBeInTheDocument()
    // 기간이 없으면 적자는 계산할 수 없다.
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })

  /**
   * 80kg → 75kg 을 100일에 빼면 5 × 7700 ÷ 100 = 385kcal.
   * TDEE 2000 이면 하루 1615kcal 를 권한다.
   */
  it('기간까지 넣으면 하루 적자와 권장 섭취를 계산한다', async () => {
    withProfile(2000)
    render(<GoalPage />)
    const target = isoInDays(100)

    await userEvent.type(screen.getByLabelText(/목표 체중/), '75')
    setDate(/목표일/, target)

    const days = getDaysRemaining(target)
    expect(await screen.findByText(`${days}일`)).toBeInTheDocument()
    const deficit = Math.round((5 * 7700) / days)
    expect(screen.getByText(`${deficit} kcal`)).toBeInTheDocument()
    expect(screen.getByText(`${2000 - deficit} kcal`)).toBeInTheDocument()
  })

  it('TDEE 를 모르면 권장 섭취는 비워 둔다', async () => {
    withProfile(null)
    render(<GoalPage />)

    await userEvent.type(screen.getByLabelText(/목표 체중/), '75')
    setDate(/목표일/, isoInDays(100))

    expect(await screen.findByText('자동 계산 결과')).toBeInTheDocument()
    const rows = screen.getByText('일일 섭취 권장').closest('div')
    expect(rows).toHaveTextContent('-')
  })

  it('하루 적자가 1000kcal 를 넘으면 경고한다', async () => {
    withProfile()
    render(<GoalPage />)

    // 30일에 10kg — 하루 2500kcal 넘는 무리한 목표
    await userEvent.type(screen.getByLabelText(/목표 체중/), '70')
    setDate(/목표일/, isoInDays(30))

    expect(
      await screen.findByText(/하루 적자가 1000 kcal를 초과합니다/)
    ).toBeInTheDocument()
  })

  it('적자가 1000kcal 이하면 경고하지 않는다', async () => {
    withProfile()
    render(<GoalPage />)

    await userEvent.type(screen.getByLabelText(/목표 체중/), '75')
    setDate(/목표일/, isoInDays(100))

    expect(await screen.findByText('자동 계산 결과')).toBeInTheDocument()
    expect(
      screen.queryByText(/하루 적자가 1000 kcal를 초과합니다/)
    ).not.toBeInTheDocument()
  })

  it('지난 날짜를 목표일로 넣으면 저장하지 않는다', async () => {
    withProfile()
    render(<GoalPage />)

    await userEvent.type(screen.getByLabelText(/목표 체중/), '75')
    setDate(/목표일/, isoInDays(-1))
    await start()

    expect(await screen.findByText('목표일은 오늘 이후여야 합니다')).toBeInTheDocument()
    expect(createGoal).not.toHaveBeenCalled()
  })

  it('시작 체중은 프로필의 현재 체중으로 채워 저장한다', async () => {
    withProfile()
    render(<GoalPage />)
    const target = isoInDays(100)

    await userEvent.type(screen.getByLabelText(/목표 체중/), '75')
    setDate(/목표일/, target)
    await start()

    await waitFor(() => expect(createGoal).toHaveBeenCalledTimes(1))
    expect(createGoal).toHaveBeenCalledWith({
      start_weight_kg: 80,
      target_weight_kg: 75,
      start_date: isoInDays(0),
      target_date: target,
    })
  })

  it('스토어 오류를 배너로 보여준다', () => {
    withProfile()
    useGoalStore.setState({ error: '목표 저장에 실패했습니다' })

    render(<GoalPage />)

    expect(screen.getByText('목표 저장에 실패했습니다')).toBeInTheDocument()
  })
})
