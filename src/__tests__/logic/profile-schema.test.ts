import { profileSchema } from '@/schemas/onboarding'

const base = {
  heightCm: 175,
  currentWeightKg: 80,
  birthDate: '1990-01-01',
  gender: 'male' as const,
}

/** path 로 특정 필드의 에러 메시지를 뽑는다 */
function issueFor(result: ReturnType<typeof profileSchema.safeParse>, field: string) {
  if (result.success) return undefined
  return result.error.issues.find((i) => i.path[0] === field)?.message
}

describe('profileSchema — 유지 칼로리 방식', () => {
  describe('자동 계산', () => {
    it('활동 수준이 있으면 통과한다', () => {
      const r = profileSchema.safeParse({
        ...base,
        tdeeMode: 'auto',
        activityLevel: 'moderate',
      })
      expect(r.success).toBe(true)
    })

    it('활동 수준이 없으면 활동 수준을 짚어준다', () => {
      const r = profileSchema.safeParse({ ...base, tdeeMode: 'auto' })
      expect(r.success).toBe(false)
      expect(issueFor(r, 'activityLevel')).toBe('활동 수준을 선택해 주세요')
    })

    it('직접 입력값은 검사하지 않는다', () => {
      // customTdee 가 범위를 벗어나도 자동 모드면 무시한다.
      const r = profileSchema.safeParse({
        ...base,
        tdeeMode: 'auto',
        activityLevel: 'moderate',
        customTdee: 100,
      })
      expect(r.success).toBe(true)
    })
  })

  describe('직접 입력', () => {
    it('유지 칼로리가 있으면 활동 수준 없이도 통과한다', () => {
      const r = profileSchema.safeParse({
        ...base,
        tdeeMode: 'manual',
        customTdee: 2200,
      })
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.customTdee).toBe(2200)
    })

    it('유지 칼로리가 비면 입력을 요구한다', () => {
      const r = profileSchema.safeParse({ ...base, tdeeMode: 'manual' })
      expect(r.success).toBe(false)
      expect(issueFor(r, 'customTdee')).toBe('유지 칼로리를 입력해 주세요')
    })

    it('유지 칼로리가 범위를 벗어나면 짚어준다', () => {
      const r = profileSchema.safeParse({
        ...base,
        tdeeMode: 'manual',
        customTdee: 500,
      })
      expect(r.success).toBe(false)
      expect(issueFor(r, 'customTdee')).toBe(
        '유지 칼로리는 800~6000 kcal 사이여야 합니다'
      )
    })
  })
})
