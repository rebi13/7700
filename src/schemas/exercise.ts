import { z } from 'zod'

export const exerciseSchema = z.object({
  exercise_name: z
    .string({ required_error: '운동 이름을 입력해 주세요' })
    .min(1, '운동 이름을 입력해 주세요')
    .max(100, '운동 이름은 100자 이하여야 합니다'),
  calories_burned: z.coerce
    .number({ invalid_type_error: '소모 칼로리를 입력해 주세요' })
    .int('정수로 입력해 주세요')
    .min(1, '소모 칼로리는 1kcal 이상이어야 합니다')
    .max(9999, '소모 칼로리는 9999kcal 이하여야 합니다'),
  duration_minutes: z.coerce
    .number({ invalid_type_error: '숫자로 입력해 주세요' })
    .int('정수로 입력해 주세요')
    .min(1, '1분 이상이어야 합니다')
    .max(1440, '하루를 초과할 수 없습니다')
    .nullable()
    .optional(),
  exercise_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식으로 입력해 주세요'),
  memo: z.string().max(200, '메모는 200자 이하여야 합니다').nullable().optional(),
})

export type ExerciseFormData = z.infer<typeof exerciseSchema>
