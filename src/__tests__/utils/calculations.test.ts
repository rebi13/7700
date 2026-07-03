import { calculateBMR, calculateTDEE, calculateDailyDeficit, estimateWeightChange } from '@/utils/calculations'

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
