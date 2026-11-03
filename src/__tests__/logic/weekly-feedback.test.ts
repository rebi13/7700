import {
  computeWeeklyStats,
  buildWeeklyFeedbackUserMessage,
  parseWeeklyFeedbackResponse,
  getWeekRange,
} from '../../../supabase/functions/_shared/weekly-feedback.logic'

const makeSummary = (date: string, intake: number, exercise: number, delta: number) => ({
  summary_date: date,
  total_intake_calories: intake,
  total_exercise_calories: exercise,
  calorie_delta: delta,
})

describe('getWeekRange', () => {
  it('월요일 날짜에서 해당 주 월~일을 반환한다', () => {
    const { weekStart, weekEnd } = getWeekRange('2026-06-29') // 월요일
    expect(weekStart).toBe('2026-06-29')
    expect(weekEnd).toBe('2026-07-05')
  })

  it('수요일 날짜에서 해당 주 월요일을 반환한다', () => {
    const { weekStart } = getWeekRange('2026-07-01') // 수요일
    expect(weekStart).toBe('2026-06-29')
  })

  it('일요일 날짜에서 해당 주 월요일을 반환한다', () => {
    const { weekStart, weekEnd } = getWeekRange('2026-07-05') // 일요일
    expect(weekStart).toBe('2026-06-29')
    expect(weekEnd).toBe('2026-07-05')
  })
})

describe('computeWeeklyStats', () => {
  const summaries = [
    makeSummary('2026-06-29', 1800, 300, 500),   // 적자
    makeSummary('2026-06-30', 2200, 0, -100),     // 초과, 운동 없음
    makeSummary('2026-07-01', 1600, 400, 700),    // 적자
  ]

  it('기록 일수와 운동 일수를 계산한다', () => {
    const stats = computeWeeklyStats(summaries, [])
    expect(stats.activeDays).toBe(3)
    expect(stats.exerciseDays).toBe(2)
  })

  it('평균 섭취 칼로리를 계산한다', () => {
    const stats = computeWeeklyStats(summaries, [])
    expect(stats.avgIntake).toBe(Math.round((1800 + 2200 + 1600) / 3))
  })

  it('적자 달성 일수를 계산한다', () => {
    const stats = computeWeeklyStats(summaries, [])
    expect(stats.deficitDays).toBe(2)
  })

  it('체중 변화를 계산한다', () => {
    const weights = [
      { weight_date: '2026-06-29', weight_kg: 70.0 },
      { weight_date: '2026-07-01', weight_kg: 69.5 },
    ]
    const stats = computeWeeklyStats(summaries, weights)
    expect(stats.weightChange).toBe(-0.5)
  })

  it('체중 기록이 1개 이하면 weightChange가 null이다', () => {
    const stats = computeWeeklyStats(summaries, [{ weight_date: '2026-06-29', weight_kg: 70 }])
    expect(stats.weightChange).toBeNull()
  })

  it('식사를 기록하지 않은 날은 기록 일수·평균·적자 일수에서 뺀다', () => {
    // 앱만 열고 식사를 기록하지 않은 날: 섭취 0, TDEE 전체가 적자로 잡혀 있다.
    const withForgotten = [...summaries, makeSummary('2026-07-02', 0, 0, 2500)]
    const stats = computeWeeklyStats(withForgotten, [])
    expect(stats.activeDays).toBe(3)
    expect(stats.avgIntake).toBe(Math.round((1800 + 2200 + 1600) / 3))
    expect(stats.avgDelta).toBe(Math.round((500 - 100 + 700) / 3))
    expect(stats.deficitDays).toBe(2)
  })

  it('기록이 없으면 avgIntake가 0이다', () => {
    const stats = computeWeeklyStats([], [])
    expect(stats.avgIntake).toBe(0)
    expect(stats.activeDays).toBe(0)
  })
})

describe('buildWeeklyFeedbackUserMessage', () => {
  const base = {
    weekStart: '2026-06-29',
    weekEnd: '2026-07-05',
    summaries: [makeSummary('2026-06-29', 1800, 300, 500)],
    weights: [],
    goal: null,
  }

  it('날짜 범위를 포함한다', () => {
    const msg = buildWeeklyFeedbackUserMessage(base)
    expect(msg).toContain('2026-06-29 ~ 2026-07-05')
  })

  it('주간 통계를 포함한다', () => {
    const msg = buildWeeklyFeedbackUserMessage(base)
    expect(msg).toContain('기록 일수: 1/7일')
    expect(msg).toContain('운동 일수: 1일')
    expect(msg).toContain('적자 달성 일수: 1/7일')
  })

  it('목표가 없으면 "없음"을 표시한다', () => {
    const msg = buildWeeklyFeedbackUserMessage(base)
    expect(msg).toContain('[다이어트 목표]\n없음')
  })

  it('목표가 있으면 목표 정보를 포함한다', () => {
    const msg = buildWeeklyFeedbackUserMessage({
      ...base,
      goal: { target_weight_kg: 65, start_weight_kg: 75, target_date: '2026-12-31' },
    })
    expect(msg).toContain('목표 체중 65kg (시작 75kg)')
  })
})

describe('parseWeeklyFeedbackResponse', () => {
  it('문자열을 trim해서 반환한다', () => {
    expect(parseWeeklyFeedbackResponse('  이번 주 잘 하셨어요!  ')).toBe('이번 주 잘 하셨어요!')
  })

  it('빈 문자열이면 에러를 던진다', () => {
    expect(() => parseWeeklyFeedbackResponse('')).toThrow('Empty weekly feedback response')
    expect(() => parseWeeklyFeedbackResponse(null)).toThrow()
  })
})
