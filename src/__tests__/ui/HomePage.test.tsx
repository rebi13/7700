import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/lib/supabase', () => ({ supabase: {} }))

import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { useGoalStore } from '@/stores/goalStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { useFeedbackStore } from '@/stores/feedbackStore'
import { HomePage } from '@/features/dashboard/HomePage'
import { addDays, formatDateShort, todayISO } from '@/utils/date'
import type { DailySummaryRow } from '@/types/database'

const calculateAndSave = jest.fn()
const fetchSummary = jest.fn()
const fetchDailyFeedback = jest.fn()
const generateDailyFeedback = jest.fn()

/** AuthGuard 가 세션과 프로필을 비동기로 채우기 전, 앱이 막 뜬 순간의 상태 */
function resetToColdStart() {
  useAuthStore.setState({ user: null })
  useProfileStore.setState({ tdee: null })
  useGoalStore.setState({ activeGoal: null, daysRemaining: null, dailyDeficit: null })
  useSummaryStore.setState({
    todaySummary: null,
    isLoading: false,
    error: null,
    calculateAndSave,
    fetchSummary,
  })
  useFeedbackStore.setState({
    dailyFeedback: null,
    isGenerating: false,
    error: null,
    fetchDailyFeedback,
    generateDailyFeedback,
  })
}

function signIn() {
  useAuthStore.setState({ user: { id: 'user-1', email: 'me@example.com' } as never })
}

/**
 * 마운트 뒤에 스토어가 바뀌는 지점 — 실제로는 supabase 응답이 늦게 도착하는 순간이다.
 * React 밖에서 일어나는 갱신이라 테스트에서는 act 로 감싸야 한다.
 */
function afterMount(change: () => void) {
  act(change)
}

function summary(overrides: Partial<DailySummaryRow> = {}): DailySummaryRow {
  return {
    id: 'summary-1',
    user_id: 'user-1',
    summary_date: '2026-08-18',
    total_intake_calories: 0,
    total_exercise_calories: 0,
    net_calories: 0,
    calorie_delta: 0,
    cumulative_delta: 0,
    estimated_weight_change_kg: 0,
    created_at: '2026-08-18T00:00:00.000Z',
    ...overrides,
  } as DailySummaryRow
}

beforeEach(() => {
  calculateAndSave.mockReset()
  fetchSummary.mockReset()
  fetchDailyFeedback.mockReset()
  generateDailyFeedback.mockReset()
  resetToColdStart()
})

/**
 * 회귀 방지: 스토어는 userId·tdee 가 없으면 조용히 빠져나간다. 예전에는 이펙트가
 * 마운트 직후 한 번만 돌아 세션 복원 전에 끝나버렸고, 홈이 늘 0 kcal 로 떴다.
 */
describe('HomePage 데이터 조회 시점', () => {
  it('세션이 없으면 아무것도 조회하지 않는다', () => {
    render(<HomePage />)

    expect(calculateAndSave).not.toHaveBeenCalled()
    expect(fetchDailyFeedback).not.toHaveBeenCalled()
  })

  it('세션이 복원되면 그때 피드백을 조회한다', () => {
    const { rerender } = render(<HomePage />)
    expect(fetchDailyFeedback).not.toHaveBeenCalled()

    afterMount(signIn)
    rerender(<HomePage />)

    expect(fetchDailyFeedback).toHaveBeenCalledTimes(1)
  })

  it('tdee 가 아직 없으면 요약을 계산하지 않는다', () => {
    signIn()

    render(<HomePage />)

    expect(calculateAndSave).not.toHaveBeenCalled()
  })

  it('프로필이 늦게 도착해 tdee 가 채워지면 그때 요약을 계산한다', () => {
    signIn()
    const { rerender } = render(<HomePage />)
    expect(calculateAndSave).not.toHaveBeenCalled()

    afterMount(() => useProfileStore.setState({ tdee: 2562 }))
    rerender(<HomePage />)

    expect(calculateAndSave).toHaveBeenCalledTimes(1)
  })

  it('이미 준비된 채로 들어오면 한 번씩만 조회한다', () => {
    signIn()
    useProfileStore.setState({ tdee: 2562 })

    const { rerender } = render(<HomePage />)
    rerender(<HomePage />)

    expect(calculateAndSave).toHaveBeenCalledTimes(1)
    expect(fetchDailyFeedback).toHaveBeenCalledTimes(1)
  })
})

describe('HomePage 표시', () => {
  beforeEach(() => {
    signIn()
    useProfileStore.setState({ tdee: 2562 })
  })

  it('요약이 없으면 0 을 보여준다', () => {
    render(<HomePage />)

    expect(screen.getByText('섭취').parentElement).toHaveTextContent('0')
  })

  it('섭취·운동 소모·순 칼로리를 요약대로 보여준다', () => {
    useSummaryStore.setState({
      todaySummary: summary({
        total_intake_calories: 300,
        total_exercise_calories: 200,
        net_calories: 100,
      }),
    })

    render(<HomePage />)

    expect(screen.getByText('섭취').parentElement).toHaveTextContent('300')
    expect(screen.getByText('운동 소모').parentElement).toHaveTextContent('200')
    expect(screen.getByText('순 칼로리').parentElement).toHaveTextContent('100')
  })

  it('적자면 "적자" 로, 초과면 "초과" 로 쓴다', () => {
    useSummaryStore.setState({ todaySummary: summary({ calorie_delta: 2262 }) })
    const { rerender } = render(<HomePage />)
    expect(screen.getByText(/kcal 적자/)).toBeInTheDocument()

    afterMount(() =>
      useSummaryStore.setState({ todaySummary: summary({ calorie_delta: -500 }) })
    )
    rerender(<HomePage />)
    expect(screen.getByText(/kcal 초과/)).toBeInTheDocument()
  })

  it('불러오는 중에는 스켈레톤을 보여준다', () => {
    useSummaryStore.setState({ isLoading: true })

    const { container } = render(<HomePage />)

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(screen.queryByText('오늘 칼로리')).not.toBeInTheDocument()
  })

  it('오류가 있으면 배너로 알리고, 닫으면 그 오류만 지운다', async () => {
    const clearSummaryError = jest.fn()
    const clearFeedbackError = jest.fn()
    useSummaryStore.setState({ error: '요약 계산 실패', clearError: clearSummaryError })
    useFeedbackStore.setState({ clearError: clearFeedbackError })

    render(<HomePage />)
    expect(screen.getByText('요약 계산 실패')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /닫기|dismiss/i }))

    expect(clearSummaryError).toHaveBeenCalled()
    expect(clearFeedbackError).not.toHaveBeenCalled()
  })

  it('새로고침을 누르면 요약을 다시 계산한다', async () => {
    render(<HomePage />)
    calculateAndSave.mockClear()

    await userEvent.click(screen.getByRole('button', { name: /새로고침/ }))

    expect(calculateAndSave).toHaveBeenCalledTimes(1)
  })
})

describe('HomePage 날짜 이동', () => {
  beforeEach(() => {
    signIn()
    useProfileStore.setState({ tdee: 2562 })
  })

  it('이전 날을 누르면 지난 날짜의 저장된 요약과 피드백을 조회한다', async () => {
    render(<HomePage />)
    const yesterday = addDays(todayISO(), -1)

    await userEvent.click(screen.getByRole('button', { name: '이전 날' }))

    // 지난 날짜는 다시 계산하지 않고 저장본을 읽는다.
    expect(fetchSummary).toHaveBeenCalledWith(yesterday)
    expect(fetchDailyFeedback).toHaveBeenLastCalledWith(yesterday)
  })

  it('지난 날짜에서는 카드 제목이 그 날짜로 바뀐다', async () => {
    render(<HomePage />)
    const yesterday = addDays(todayISO(), -1)

    await userEvent.click(screen.getByRole('button', { name: '이전 날' }))

    expect(
      screen.getByText(`${formatDateShort(yesterday)} 칼로리`)
    ).toBeInTheDocument()
  })

  it('오늘에서는 다음 날 버튼을 막아 미래로 못 넘어간다', () => {
    render(<HomePage />)

    expect(screen.getByRole('button', { name: '다음 날' })).toBeDisabled()
  })
})
