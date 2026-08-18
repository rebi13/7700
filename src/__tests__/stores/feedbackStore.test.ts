import { useFeedbackStore } from '@/stores/feedbackStore'

const mockInvoke = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockMaybeSingle = jest.fn()
const mockInsert = jest.fn()

/** 조회에 쓰인 .eq() 인자를 기록해 어떤 조건으로 찾았는지 확인한다 */
const eqCalls: unknown[][] = []

const buildChain = () => {
  const chain = {
    select: () => chain,
    eq: (...args: unknown[]) => {
      eqCalls.push(args)
      return chain
    },
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
  eqCalls.length = 0
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

describe('주간 피드백의 조회 날짜', () => {
  /**
   * 회귀 방지: Edge Function 은 주 시작일(월요일)로 저장하는데 스토어가 넘겨받은
   * 날짜 그대로 다시 조회해, 월요일이 아닌 날에는 생성해도 화면이 비어 있었다.
   * 함수는 200 으로 성공하고 조회만 빗나가니 오류도 뜨지 않았다.
   */
  it('생성 뒤에는 넘긴 날짜가 아니라 그 주의 월요일로 다시 조회한다', async () => {
    mockInvoke.mockResolvedValue({ data: { feedback: '이번 주도 좋았어요' }, error: null })
    mockMaybeSingle.mockResolvedValue({ data: null })

    // 2026-08-18 은 화요일 → 주 시작일은 2026-08-17
    await useFeedbackStore.getState().generateWeeklyFeedback('2026-08-18')

    expect(mockInvoke).toHaveBeenCalledWith('generate-weekly-feedback', {
      body: { target_date: '2026-08-18' },
    })
    expect(eqCalls).toContainEqual(['target_date', '2026-08-17'])
    expect(eqCalls).not.toContainEqual(['target_date', '2026-08-18'])
  })

  it('월요일에 불러도 같은 날짜로 조회한다', async () => {
    mockInvoke.mockResolvedValue({ data: { feedback: '한 주 시작' }, error: null })
    mockMaybeSingle.mockResolvedValue({ data: null })

    await useFeedbackStore.getState().generateWeeklyFeedback('2026-08-17')

    expect(eqCalls).toContainEqual(['target_date', '2026-08-17'])
  })

  it('fetchWeeklyFeedback 은 받은 주 시작일을 그대로 쓴다', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null })

    await useFeedbackStore.getState().fetchWeeklyFeedback('2026-08-17')

    expect(eqCalls).toContainEqual(['target_date', '2026-08-17'])
  })
})
