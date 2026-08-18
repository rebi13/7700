import { render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import type { StoreApi, UseBoundStore } from 'zustand'

jest.mock('@/lib/supabase', () => ({ supabase: {} }))

import { useExerciseStore } from '@/stores/exerciseStore'
import { useWeightStore } from '@/stores/weightStore'
import { ExerciseList } from '@/features/exercise/ExerciseList'
import { WeightList } from '@/features/weight/WeightList'

/**
 * 회귀 방지: 세 목록 모두 isLoading 을 보지 않아, 응답 전 logs 가 비어 있는 동안
 * 빈 상태 문구가 먼저 떴다. 기록이 있는 날짜에서도 "없습니다" 가 스쳐 지나가
 * 저장이 실패한 것처럼 읽혔다.
 *
 * MealList 는 별도 파일에서 더 자세히 다루고, 여기서는 나머지 둘이 같은 규칙을
 * 지키는지만 확인한다.
 */
type ListProps = { onEdit: (item: never) => void; onDelete: (id: string) => void }

const noop = () => {}

const CASES: {
  name: string
  List: ComponentType<ListProps>
  store: UseBoundStore<StoreApi<{ logs: unknown[]; isLoading: boolean }>>
  emptyMessage: string
  log: Record<string, unknown>
  visibleText: string
}[] = [
  {
    name: 'ExerciseList',
    List: ExerciseList as unknown as ComponentType<ListProps>,
    store: useExerciseStore as never,
    emptyMessage: '이 날짜에 운동 기록이 없습니다',
    log: {
      id: 'e1',
      user_id: 'u1',
      exercise_date: '2026-08-18',
      exercise_name: '걷기',
      calories_burned: 200,
      duration_minutes: 30,
      memo: null,
      created_at: '2026-08-18T03:00:00.000Z',
    },
    visibleText: '걷기',
  },
  {
    name: 'WeightList',
    List: WeightList as unknown as ComponentType<ListProps>,
    store: useWeightStore as never,
    emptyMessage: '이 날짜에 체중 기록이 없습니다',
    log: {
      id: 'w1',
      user_id: 'u1',
      weight_date: '2026-08-18',
      weight_kg: 92,
      measured_timing: 'morning',
      memo: null,
      created_at: '2026-08-18T03:00:00.000Z',
    },
    visibleText: '92 kg',
  },
]

describe.each(CASES)('$name', ({ List, store, emptyMessage, log, visibleText }) => {
  const setState = (state: { logs: unknown[]; isLoading: boolean }) =>
    (store as unknown as StoreApi<unknown>).setState({ error: null, ...state })

  it('불러오는 중에는 빈 상태 대신 스켈레톤을 보여준다', () => {
    setState({ logs: [], isLoading: true })

    const { container } = render(<List onEdit={noop} onDelete={noop} />)

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument()
  })

  it('불러오기가 끝나고 기록이 없으면 빈 상태 문구를 보여준다', () => {
    setState({ logs: [], isLoading: false })

    render(<List onEdit={noop} onDelete={noop} />)

    expect(screen.getByText(emptyMessage)).toBeInTheDocument()
  })

  it('저장 중이어도 이미 불러온 기록은 유지한다', () => {
    setState({ logs: [log], isLoading: true })

    const { container } = render(<List onEdit={noop} onDelete={noop} />)

    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull()
    expect(screen.getByText(visibleText)).toBeInTheDocument()
  })
})
