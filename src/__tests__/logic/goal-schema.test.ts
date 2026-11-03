import { makeGoalSchema } from '@/schemas/onboarding'
import { addDays, todayISO } from '@/utils/date'

const today = todayISO()

const valid = {
  startDate: today,
  targetWeightKg: 75,
  targetDate: addDays(today, 100),
}

function issueFor(result: ReturnType<ReturnType<typeof makeGoalSchema>['safeParse']>, field: string) {
  if (result.success) return undefined
  return result.error.issues.find((i) => i.path[0] === field)?.message
}

describe('makeGoalSchema', () => {
  it('정상 입력은 통과한다', () => {
    expect(makeGoalSchema(80).safeParse(valid).success).toBe(true)
  })

  it('오늘을 목표일로 넣으면 막는다', () => {
    const r = makeGoalSchema(80).safeParse({ ...valid, targetDate: today })
    expect(issueFor(r, 'targetDate')).toBe('목표일은 오늘 이후여야 합니다')
  })

  it('시작일이 미래면 막는다', () => {
    const r = makeGoalSchema(80).safeParse({ ...valid, startDate: addDays(today, 1) })
    expect(issueFor(r, 'startDate')).toBe('시작일은 오늘이거나 그 이전이어야 합니다')
  })

  it('목표일이 시작일보다 앞서면 막는다', () => {
    const r = makeGoalSchema(80, { savedTargetDate: addDays(today, -10) }).safeParse({
      ...valid,
      startDate: addDays(today, -5),
      targetDate: addDays(today, -10),
    })
    expect(issueFor(r, 'targetDate')).toBe('목표일은 시작일 이후여야 합니다')
  })

  describe('이미 지난 목표를 고칠 때', () => {
    const past = addDays(today, -3)
    const editing = { ...valid, startDate: addDays(today, -30), targetDate: past }

    it('저장된 목표일을 그대로 두면 통과한다', () => {
      expect(makeGoalSchema(80, { savedTargetDate: past }).safeParse(editing).success).toBe(true)
    })

    it('다른 지난 날짜로 바꾸면 막는다', () => {
      const r = makeGoalSchema(80, { savedTargetDate: past }).safeParse({
        ...editing,
        targetDate: addDays(today, -2),
      })
      expect(issueFor(r, 'targetDate')).toBe('목표일은 오늘 이후여야 합니다')
    })
  })
})
