import {
  buildFeedbackUserMessage,
  parseFeedbackResponse,
} from '../../../supabase/functions/_shared/daily-feedback.logic'

const BASE_ARGS = {
  targetDate: '2026-07-01',
  meals: [],
  exercises: [],
  summary: null,
  goal: null,
}

describe('buildFeedbackUserMessage', () => {
  it('날짜를 포함한다', () => {
    const msg = buildFeedbackUserMessage(BASE_ARGS)
    expect(msg).toContain('날짜: 2026-07-01')
  })

  it('식사·운동이 없으면 "없음"을 표시한다', () => {
    const msg = buildFeedbackUserMessage(BASE_ARGS)
    expect(msg).toContain('[식사]\n없음')
    expect(msg).toContain('[운동]\n없음')
    expect(msg).toContain('데이터 없음')
  })

  it('식사 목록을 올바르게 포맷한다', () => {
    const msg = buildFeedbackUserMessage({
      ...BASE_ARGS,
      meals: [
        { food_name: '닭가슴살', calories: 200 },
        { food_name: '현미밥', calories: 300 },
      ],
    })
    expect(msg).toContain('- 닭가슴살 200kcal')
    expect(msg).toContain('- 현미밥 300kcal')
  })

  it('운동 시간이 있을 때 분을 포함한다', () => {
    const msg = buildFeedbackUserMessage({
      ...BASE_ARGS,
      exercises: [{ exercise_name: '달리기', calories_burned: 300, duration_minutes: 30 }],
    })
    expect(msg).toContain('- 달리기 300kcal (30분)')
  })

  it('운동 시간이 없을 때 분을 생략한다', () => {
    const msg = buildFeedbackUserMessage({
      ...BASE_ARGS,
      exercises: [{ exercise_name: '걷기', calories_burned: 100, duration_minutes: null }],
    })
    expect(msg).toContain('- 걷기 100kcal')
    expect(msg).not.toContain('분)')
  })

  it('요약과 목표를 포함한다', () => {
    const msg = buildFeedbackUserMessage({
      ...BASE_ARGS,
      summary: { total_intake_calories: 1800, total_exercise_calories: 300, calorie_delta: -500 },
      goal: { target_weight_kg: 65, start_weight_kg: 75, target_date: '2026-12-31' },
    })
    expect(msg).toContain('섭취 1800kcal / 운동 소모 300kcal / 칼로리 적자 -500kcal')
    expect(msg).toContain('목표 체중 65kg (시작 75kg), 목표일 2026-12-31')
  })
})

describe('parseFeedbackResponse', () => {
  it('문자열을 trim해서 반환한다', () => {
    expect(parseFeedbackResponse('  오늘도 잘 하셨어요!  ')).toBe('오늘도 잘 하셨어요!')
  })

  it('빈 문자열이면 에러를 던진다', () => {
    expect(() => parseFeedbackResponse('')).toThrow('Empty feedback response')
  })

  it('문자열이 아니면 에러를 던진다', () => {
    expect(() => parseFeedbackResponse(null)).toThrow('Empty feedback response')
    expect(() => parseFeedbackResponse(undefined)).toThrow('Empty feedback response')
  })
})
