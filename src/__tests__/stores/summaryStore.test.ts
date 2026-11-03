import { useSummaryStore } from '@/stores/summaryStore'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import type { DailySummaryRow } from '@/types/database'

/**
 * 테이블마다 돌려줄 결과를 정해 두는 supabase 체인. 끝에서 await 되는 지점(체인 자체,
 * single, maybeSingle)이 모두 같은 결과를 내도록 thenable 로 만든다.
 */
const results: Record<string, unknown> = {}
const upserts: unknown[] = []
const gteCalls: unknown[][] = []

function makeChain(table: string) {
  const resolve = () => Promise.resolve(results[table])
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    gte: (...a: unknown[]) => {
      gteCalls.push(a)
      return chain
    },
    order: () => chain,
    upsert: (row: unknown) => {
      upserts.push(row)
      return chain
    },
    single: resolve,
    maybeSingle: resolve,
    then: (ok: (v: unknown) => unknown, fail: (e: unknown) => unknown) => resolve().then(ok, fail),
  }
  return chain
}

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (table: string) => makeChain(table) },
}))

function summary(date: string, overrides: Partial<DailySummaryRow> = {}): DailySummaryRow {
  return {
    id: `s-${date}`,
    user_id: 'u1',
    summary_date: date,
    total_intake_calories: 2000,
    total_exercise_calories: 0,
    net_calories: 2000,
    calorie_delta: 500,
    created_at: '',
    ...overrides,
  }
}

beforeEach(() => {
  for (const k of Object.keys(results)) delete results[k]
  upserts.length = 0
  gteCalls.length = 0
  useAuthStore.setState({ user: { id: 'u1' } as never })
  useProfileStore.setState({ tdee: 2500 })
  useSummaryStore.setState({
    todaySummary: null,
    goalSummaries: [],
    goalSummariesSince: null,
    isLoading: false,
    error: null,
  })
})

describe('fetchGoalSummaries', () => {
  it('기준일 이후 요약을 불러와 기준일과 함께 둔다', async () => {
    const rows = [summary('2026-11-01'), summary('2026-11-02')]
    results.daily_summaries = { data: rows, error: null }

    await useSummaryStore.getState().fetchGoalSummaries('2026-11-01')

    expect(gteCalls).toContainEqual(['summary_date', '2026-11-01'])
    expect(useSummaryStore.getState().goalSummaries).toEqual(rows)
    expect(useSummaryStore.getState().goalSummariesSince).toBe('2026-11-01')
  })

  it('조회에 실패하면 오류를 남긴다', async () => {
    results.daily_summaries = { data: null, error: { message: '조회 실패' } }

    await useSummaryStore.getState().fetchGoalSummaries('2026-11-01')

    expect(useSummaryStore.getState().error).toBe('조회 실패')
  })
})

describe('calculateAndSave', () => {
  beforeEach(() => {
    results.meal_logs = { data: [{ calories: 1500 }, { calories: 300 }] }
    results.exercise_logs = { data: [{ calories_burned: 200 }] }
  })

  it('그날 적자만 저장하고 누적 값은 저장하지 않는다', async () => {
    results.daily_summaries = { data: summary('2026-11-02'), error: null }

    await useSummaryStore.getState().calculateAndSave('2026-11-02')

    expect(upserts).toEqual([
      expect.objectContaining({
        summary_date: '2026-11-02',
        total_intake_calories: 1800,
        total_exercise_calories: 200,
        net_calories: 1600,
        calorie_delta: 900,
      }),
    ])
    expect(upserts[0]).not.toHaveProperty('cumulative_delta')
  })

  it('기준일 이후 날짜면 저장한 요약을 누적 목록에 바로 반영한다', async () => {
    useSummaryStore.setState({
      goalSummariesSince: '2026-11-01',
      goalSummaries: [summary('2026-11-01'), summary('2026-11-03'), summary('2026-11-02')],
    })
    const saved = summary('2026-11-02', { calorie_delta: 900 })
    results.daily_summaries = { data: saved, error: null }

    await useSummaryStore.getState().calculateAndSave('2026-11-02')

    const list = useSummaryStore.getState().goalSummaries
    expect(list.map((s) => s.summary_date)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03'])
    expect(list[1]).toBe(saved)
  })

  it('기준일 이전 날짜는 누적 목록에 넣지 않는다', async () => {
    const before = [summary('2026-11-01')]
    useSummaryStore.setState({ goalSummariesSince: '2026-11-01', goalSummaries: before })
    results.daily_summaries = { data: summary('2026-10-30'), error: null }

    await useSummaryStore.getState().calculateAndSave('2026-10-30')

    expect(useSummaryStore.getState().goalSummaries).toBe(before)
  })
})
