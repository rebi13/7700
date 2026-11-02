import {
  calculateBMR,
  calculateTDEE,
  calculateDailyDeficit,
  estimateWeightChange,
  cumulativeDeltaSeries,
  cumulativeDeltaUntil,
} from '@/utils/calculations'

jest.mock('@/utils/date', () => ({
  getDaysRemaining: jest.fn(),
}))

import { getDaysRemaining } from '@/utils/date'
const mockGetDaysRemaining = getDaysRemaining as jest.Mock

describe('calculateBMR', () => {
  it('남성 BMR을 Mifflin-St Jeor 공식으로 계산한다', () => {
    // 70kg, 175cm, 30세 남성: 10*70 + 6.25*175 - 5*30 + 5 = 1648
    const result = calculateBMR({ weightKg: 70, heightCm: 175, birthDate: '1995-01-01', gender: 'male' })
    // 나이는 실행 시점에 따라 30 또는 31이 될 수 있으므로 범위로 검증
    expect(result).toBeGreaterThan(1600)
    expect(result).toBeLessThan(1700)
  })

  it('여성 BMR을 Mifflin-St Jeor 공식으로 계산한다', () => {
    // 55kg, 160cm 여성은 남성보다 166 낮아야 한다
    const male = calculateBMR({ weightKg: 55, heightCm: 160, birthDate: '1990-01-01', gender: 'male' })
    const female = calculateBMR({ weightKg: 55, heightCm: 160, birthDate: '1990-01-01', gender: 'female' })
    expect(male - female).toBe(166)
  })

  it('other 성별은 남성/여성 평균을 반환한다', () => {
    const male = calculateBMR({ weightKg: 70, heightCm: 170, birthDate: '2000-01-01', gender: 'male' })
    const female = calculateBMR({ weightKg: 70, heightCm: 170, birthDate: '2000-01-01', gender: 'female' })
    const other = calculateBMR({ weightKg: 70, heightCm: 170, birthDate: '2000-01-01', gender: 'other' })
    expect(other).toBe(Math.round((male + female) / 2))
  })
})

describe('calculateTDEE', () => {
  it('활동 수준에 따라 BMR에 배수를 적용한다', () => {
    expect(calculateTDEE(1500, 'sedentary')).toBe(Math.round(1500 * 1.2))
    expect(calculateTDEE(1500, 'moderate')).toBe(Math.round(1500 * 1.55))
    expect(calculateTDEE(1500, 'very_active')).toBe(Math.round(1500 * 1.9))
  })
})

describe('calculateDailyDeficit', () => {
  it('남은 일수로 일일 필요 적자를 계산한다', () => {
    mockGetDaysRemaining.mockReturnValue(100)
    // 70kg → 65kg = 5kg = 38500kcal / 100일 = 385kcal/day
    const result = calculateDailyDeficit({
      startWeightKg: 70,
      targetWeightKg: 65,
      targetDate: '2026-10-01',
    })
    expect(result).toBe(385)
  })

  it('남은 일수가 0이면 0을 반환한다', () => {
    mockGetDaysRemaining.mockReturnValue(0)
    const result = calculateDailyDeficit({
      startWeightKg: 70,
      targetWeightKg: 65,
      targetDate: '2026-01-01',
    })
    expect(result).toBe(0)
  })
})

describe('estimateWeightChange', () => {
  it('칼로리 적자를 체중 변화(kg)로 환산한다', () => {
    expect(estimateWeightChange(7700)).toBe(1)
    expect(estimateWeightChange(3850)).toBe(0.5)
    expect(estimateWeightChange(0)).toBe(0)
  })
})

describe('누적 적자', () => {
  const day = (summary_date: string, total_intake_calories: number, calorie_delta: number) => ({
    summary_date,
    total_intake_calories,
    calorie_delta,
  })

  // 2500 kcal TDEE 기준. 11/02 는 앱만 열고 식사를 기록하지 않아 TDEE 전체가 적자로 잡힌 날.
  const summaries = [
    day('2026-11-03', 2000, 500),
    day('2026-10-30', 1800, 700),
    day('2026-11-01', 2300, 200),
    day('2026-11-02', 0, 2500),
  ]

  it('기준일 이전 날짜는 세지 않는다', () => {
    expect(cumulativeDeltaUntil(summaries, '2026-11-01', '2026-11-03')).toEqual({
      total: 700,
      recordedDays: 2,
    })
  })

  it('식사를 기록하지 않은 날은 적자로 쌓지 않는다', () => {
    const series = cumulativeDeltaSeries(summaries, '2026-10-01')
    expect(series.map((p) => p.date)).not.toContain('2026-11-02')
  })

  it('날짜 순으로 이어 더한다', () => {
    expect(cumulativeDeltaSeries(summaries, '2026-10-01')).toEqual([
      { date: '2026-10-30', cumulative: 700 },
      { date: '2026-11-01', cumulative: 900 },
      { date: '2026-11-03', cumulative: 1400 },
    ])
  })

  it('고른 날짜 이후의 기록은 포함하지 않는다', () => {
    expect(cumulativeDeltaUntil(summaries, '2026-10-01', '2026-11-01').total).toBe(900)
  })

  it('기록이 없으면 0 이다', () => {
    expect(cumulativeDeltaUntil([], '2026-11-01', '2026-11-03')).toEqual({
      total: 0,
      recordedDays: 0,
    })
  })
})
