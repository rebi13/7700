import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// 스토어가 supabase 클라이언트를 끌어오는데, 그쪽은 import.meta.env 를 읽어
// CJS 로 도는 Jest 에서 로드되지 않는다. 목록은 상태만 읽으므로 통째로 대체한다.
jest.mock('@/lib/supabase', () => ({ supabase: {} }))

import { useMealStore } from '@/stores/mealStore'
import { MealList } from '@/features/meal/MealList'
import type { MealLogRow } from '@/types/database'

const EMPTY_MESSAGE = '이 날짜에 식사 기록이 없습니다'

function makeLog(overrides: Partial<MealLogRow> = {}): MealLogRow {
  return {
    id: 'log-1',
    user_id: 'user-1',
    meal_date: '2026-08-18',
    meal_type: 'lunch',
    food_name: '김치찌개',
    calories: 300,
    protein_g: 14,
    carbs_g: 18,
    fat_g: 20,
    memo: null,
    created_at: '2026-08-18T03:00:00.000Z',
    ...overrides,
  }
}

function setStore(state: { logs?: MealLogRow[]; isLoading?: boolean }) {
  useMealStore.setState({ logs: [], isLoading: false, error: null, ...state })
}

const noop = () => {}

describe('MealList', () => {
  describe('불러오는 중', () => {
    it('빈 상태 문구 대신 스켈레톤을 보여준다', () => {
      // 회귀 방지: 응답 전에는 logs 가 비어 있어 "없습니다" 가 스쳐 지나갔다.
      setStore({ logs: [], isLoading: true })

      const { container } = render(<MealList onEdit={noop} onDelete={noop} />)

      expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
      expect(screen.queryByText(EMPTY_MESSAGE)).not.toBeInTheDocument()
    })

    it('이미 불러온 기록이 있으면 스켈레톤으로 되돌아가지 않는다', () => {
      // 저장 중에도 isLoading 이 켜지므로, 목록이 깜빡이면 안 된다.
      setStore({ logs: [makeLog()], isLoading: true })

      const { container } = render(<MealList onEdit={noop} onDelete={noop} />)

      expect(container.querySelector('[data-slot="skeleton"]')).toBeNull()
      expect(screen.getByText('김치찌개')).toBeInTheDocument()
    })
  })

  describe('불러오기 완료', () => {
    it('기록이 없으면 빈 상태 문구를 보여준다', () => {
      setStore({ logs: [], isLoading: false })

      render(<MealList onEdit={noop} onDelete={noop} />)

      expect(screen.getByText(EMPTY_MESSAGE)).toBeInTheDocument()
    })

    it('기록마다 이름·종류·칼로리를 보여준다', () => {
      setStore({
        logs: [
          makeLog({ id: 'a', food_name: '비빔밥', calories: 550, meal_type: 'dinner' }),
          makeLog({ id: 'b', food_name: '사과', calories: 90, meal_type: 'snack' }),
        ],
      })

      render(<MealList onEdit={noop} onDelete={noop} />)

      expect(screen.getByText('비빔밥')).toBeInTheDocument()
      expect(screen.getByText('550 kcal')).toBeInTheDocument()
      expect(screen.getByText('저녁')).toBeInTheDocument()
      expect(screen.getByText('사과')).toBeInTheDocument()
      expect(screen.getByText('90 kcal')).toBeInTheDocument()
      expect(screen.getByText('간식')).toBeInTheDocument()
    })

    it('식사 종류가 없는 기록도 그린다', () => {
      setStore({ logs: [makeLog({ meal_type: null })] })

      render(<MealList onEdit={noop} onDelete={noop} />)

      expect(screen.getByText('김치찌개')).toBeInTheDocument()
    })
  })

  describe('행 조작', () => {
    it('행 본문을 누르면 수정 콜백에 해당 기록을 넘긴다', async () => {
      const log = makeLog()
      setStore({ logs: [log] })
      const onEdit = jest.fn()

      render(<MealList onEdit={onEdit} onDelete={noop} />)
      await userEvent.click(screen.getByRole('button', { name: /김치찌개.*300 kcal/ }))

      expect(onEdit).toHaveBeenCalledWith(log)
    })

    it('삭제 버튼을 누르면 수정이 아니라 삭제 콜백만 부른다', async () => {
      setStore({ logs: [makeLog({ id: 'log-9' })] })
      const onEdit = jest.fn()
      const onDelete = jest.fn()

      render(<MealList onEdit={onEdit} onDelete={onDelete} />)
      await userEvent.click(screen.getByRole('button', { name: '김치찌개 삭제' }))

      expect(onDelete).toHaveBeenCalledWith('log-9')
      expect(onEdit).not.toHaveBeenCalled()
    })
  })
})
