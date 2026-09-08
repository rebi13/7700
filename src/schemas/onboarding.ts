import { z } from 'zod'

const activityEnum = z.enum(
  ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const,
  { errorMap: () => ({ message: '활동 수준을 선택해 주세요' }) }
)

/** 두 방식이 공유하는 신체 정보 필드 */
const baseProfileFields = {
  heightCm: z.coerce
    .number({ invalid_type_error: '키를 입력해 주세요' })
    .min(100, '키는 100cm 이상이어야 합니다')
    .max(250, '키는 250cm 이하여야 합니다'),
  currentWeightKg: z.coerce
    .number({ invalid_type_error: '체중을 입력해 주세요' })
    .min(30, '체중은 30kg 이상이어야 합니다')
    .max(300, '체중은 300kg 이하여야 합니다'),
  birthDate: z
    .string({ required_error: '생년월일을 입력해 주세요' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식으로 입력해 주세요')
    .refine((d) => new Date(d) < new Date(), '생년월일은 과거 날짜여야 합니다'),
  gender: z.enum(['male', 'female', 'other'] as const, {
    errorMap: () => ({ message: '성별을 선택해 주세요' }),
  }),
}

/**
 * 유지 칼로리(TDEE) 는 두 방식 중 하나로 정한다.
 * - `auto`: 활동 수준을 골라 BMR × 활동계수로 자동 계산한다.
 * - `manual`: 인바디 등에서 잰 값을 직접 입력한다.
 *
 * 방식마다 필수 필드가 달라서 `tdeeMode` 로 가르는 판별 유니온으로 둔다.
 * (superRefine 은 다른 필드가 이미 틀리면 실행되지 않아, 빈 폼에서 활동 수준
 * 오류가 함께 뜨지 않는다. 판별 유니온은 분기 안에서 필드가 늘 검증된다.)
 * `tdeeMode` 는 폼에서만 쓰는 값이고 DB 에는 저장하지 않는다.
 */
export const profileSchema = z.discriminatedUnion('tdeeMode', [
  z.object({
    ...baseProfileFields,
    tdeeMode: z.literal('auto'),
    activityLevel: activityEnum,
    customTdee: z.coerce.number().optional(),
  }),
  z.object({
    ...baseProfileFields,
    tdeeMode: z.literal('manual'),
    activityLevel: activityEnum.optional(),
    // 빈칸('')·NaN 은 undefined 로 바꿔 required_error 가 뜨게 한다.
    customTdee: z.preprocess(
      (v) => {
        if (v === '' || v === null || v === undefined) return undefined
        const n = Number(v)
        return Number.isNaN(n) ? undefined : n
      },
      z
        .number({
          required_error: '유지 칼로리를 입력해 주세요',
          invalid_type_error: '유지 칼로리를 입력해 주세요',
        })
        .min(800, '유지 칼로리는 800~6000 kcal 사이여야 합니다')
        .max(6000, '유지 칼로리는 800~6000 kcal 사이여야 합니다')
    ),
  }),
])

export const goalSchema = z.object({
  targetWeightKg: z.coerce
    .number({ invalid_type_error: '목표 체중을 입력해 주세요' })
    .min(30, '목표 체중은 30kg 이상이어야 합니다')
    .max(300, '목표 체중은 300kg 이하여야 합니다'),
  targetDate: z
    .string({ required_error: '목표일을 입력해 주세요' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식으로 입력해 주세요')
    .refine((d) => new Date(d) > new Date(), '목표일은 오늘 이후여야 합니다'),
})

/**
 * 이 앱은 감량 전용이다 (7700kcal = 1kg). 목표 체중이 현재 체중보다 크거나 같으면
 * 감량량과 하루 적자가 0 이하로 나와 화면의 숫자가 전부 무의미해지므로 아예 막는다.
 *
 * 현재 체중은 프로필에 있어 스키마 밖에서 와야 한다. 그래서 스키마를 만들어 주는
 * 함수로 둔다. 프로필이 아직 없으면(currentWeightKg 없음) 이 검사만 건너뛴다.
 */
export function makeGoalSchema(currentWeightKg?: number | null) {
  const limit = currentWeightKg && currentWeightKg > 0 ? currentWeightKg : null
  return goalSchema.refine(
    (data) => limit === null || data.targetWeightKg < limit,
    {
      path: ['targetWeightKg'],
      message: `목표 체중은 현재 체중(${limit}kg)보다 작아야 합니다`,
    }
  )
}

export type ProfileFormData = z.infer<typeof profileSchema>
export type GoalFormData = z.infer<typeof goalSchema>
