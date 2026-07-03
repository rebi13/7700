import { useFeedbackStore } from '@/stores/feedbackStore'

const mockInvoke = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockMaybeSingle = jest.fn()
const mockInsert = jest.fn()

const buildChain = () => {
  const chain = {
    select: () => chain,
    eq: (..._args: unknown[]) => chain,
    maybeSingle: mockMaybeSingle,
    insert: mockInsert,
  }
  mockSelect.mockReturnValue(chain)
  return chain
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    from: (_table: string) => ({
      select: mockSelect,
      insert: mockInsert,
    }),
  },
}))

// Prevent unused variable warnings
void mockEq

beforeEach(() => {
  useFeedbackStore.setState({
    dailyFeedback: null,
    weeklyFeedback: null,
    isGenerating: false,
    isGeneratingWeekly: false,
    error: null,
  })
  mockInvoke.mockReset()
  mockMaybeSingle.mockReset()
  mockInsert.mockReset()
  buildChain()
})

describe('generateDailyFeedback', () => {
  it('성공 시 isGenerating을 false로 돌리고 dailyFeedback을 저장한다', async () => {
    mockInvoke.mockResolvedValue({ data: { feedback: '오늘도 잘 하셨어요!' }, error: null })
    const feedbackRow = { id: '1', feedback: '오늘도 잘 하셨어요!', target_date: '2026-07-01', feedback_type: 'daily' }
    mockMaybeSingle.mockResolvedValue({ data: feedbackRow })

    await useFeedbackStore.getState().generateDailyFeedback('2026-07-01')

    expect(mockInvoke).toHaveBeenCalledWith('generate-daily-feedback', {
      body: { target_date: '2026-07-01' },
    })
    expect(useFeedbackStore.getState().isGenerating).toBe(false)
    expect(useFeedbackStore.getState().dailyFeedback).toEqual(feedbackRow)
    expect(useFeedbackStore.getState().error).toBeNull()
  })

  it('API 에러 시 error 상태를 설정한다', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Edge Function error' } })

    await useFeedbackStore.getState().generateDailyFeedback('2026-07-01')

    expect(useFeedbackStore.getState().isGenerating).toBe(false)
    expect(useFeedbackStore.getState().error).toBe('Edge Function error')
    expect(useFeedbackStore.getState().dailyFeedback).toBeNull()
  })

  it('feedback 필드가 없으면 fallback 에러 메시지를 설정한다', async () => {
    mockInvoke.mockResolvedValue({ data: {}, error: null })

    await useFeedbackStore.getState().generateDailyFeedback('2026-07-01')

    expect(useFeedbackStore.getState().error).toBe('피드백 생성 실패')
  })

  it('호출 중에는 isGenerating이 true다', async () => {
    let resolveInvoke!: (v: unknown) => void
    mockInvoke.mockReturnValue(new Promise(r => { resolveInvoke = r }))

    const promise = useFeedbackStore.getState().generateDailyFeedback('2026-07-01')
    expect(useFeedbackStore.getState().isGenerating).toBe(true)

    resolveInvoke({ data: null, error: { message: 'err' } })
    await promise
    expect(useFeedbackStore.getState().isGenerating).toBe(false)
  })
})

describe('fetchDailyFeedback', () => {
  it('기존 피드백을 가져와 dailyFeedback에 저장한다', async () => {
    const row = { id: '1', feedback: '잘 하셨어요', target_date: '2026-07-01', feedback_type: 'daily' }
    mockMaybeSingle.mockResolvedValue({ data: row })

    await useFeedbackStore.getState().fetchDailyFeedback('2026-07-01')

    expect(useFeedbackStore.getState().dailyFeedback).toEqual(row)
  })

  it('피드백이 없으면 null을 유지한다', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null })

    await useFeedbackStore.getState().fetchDailyFeedback('2026-07-01')

    expect(useFeedbackStore.getState().dailyFeedback).toBeNull()
  })
})

describe('clearDailyFeedback', () => {
  it('dailyFeedback을 null로 초기화한다', () => {
    useFeedbackStore.setState({ dailyFeedback: { id: '1' } as never })
    useFeedbackStore.getState().clearDailyFeedback()
    expect(useFeedbackStore.getState().dailyFeedback).toBeNull()
  })
})

describe('generateWeeklyFeedback', () => {
  it('성공 시 isGeneratingWeekly를 false로 돌리고 weeklyFeedback을 저장한다', async () => {
    mockInvoke.mockResolvedValue({ data: { feedback: '이번 주 잘 하셨어요!' }, error: null })
    const row = { id: '2', feedback: '이번 주 잘 하셨어요!', target_date: '2026-06-29', feedback_type: 'weekly' }
    mockMaybeSingle.mockResolvedValue({ data: row })

    await useFeedbackStore.getState().generateWeeklyFeedback('2026-07-03')

    expect(mockInvoke).toHaveBeenCalledWith('generate-weekly-feedback', {
      body: { target_date: '2026-07-03' },
    })
    expect(useFeedbackStore.getState().isGeneratingWeekly).toBe(false)
    expect(useFeedbackStore.getState().weeklyFeedback).toEqual(row)
  })

  it('API 에러 시 error 상태를 설정한다', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Weekly error' } })

    await useFeedbackStore.getState().generateWeeklyFeedback('2026-07-03')

    expect(useFeedbackStore.getState().isGeneratingWeekly).toBe(false)
    expect(useFeedbackStore.getState().error).toBe('Weekly error')
    expect(useFeedbackStore.getState().weeklyFeedback).toBeNull()
  })
})
