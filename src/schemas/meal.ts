import { z } from 'zod'

export const mealSchema = z.object({
  food_name: z
    .string({ required_error: '음식 이름을 입력해 주세요' })
    .min(1, '음식 이름을 입력해 주세요')
    .max(100, '음식 이름은 100자 이하여야 합니다'),
  calories: z.coerce
    .number({ invalid_type_error: '칼로리를 입력해 주세요' })
    .int('정수로 입력해 주세요')
    .min(1, '칼로리는 1kcal 이상이어야 합니다')
    .max(9999, '칼로리는 9999kcal 이하여야 합니다'),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'late_night'] as const, {
    errorMap: () => ({ message: '식사 종류를 선택해 주세요' }),
  }),
  meal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식으로 입력해 주세요'),
  protein_g: z.coerce
    .number({ invalid_type_error: '숫자로 입력해 주세요' })
    .min(0, '0 이상으로 입력해 주세요')
    .max(999, '999g 이하여야 합니다')
    .nullable()
    .optional(),
  carbs_g: z.coerce
    .number({ invalid_type_error: '숫자로 입력해 주세요' })
    .min(0, '0 이상으로 입력해 주세요')
    .max(999, '999g 이하여야 합니다')
    .nullable()
    .optional(),
  fat_g: z.coerce
    .number({ invalid_type_error: '숫자로 입력해 주세요' })
    .min(0, '0 이상으로 입력해 주세요')
    .max(999, '999g 이하여야 합니다')
    .nullable()
    .optional(),
  memo: z.string().max(200, '메모는 200자 이하여야 합니다').nullable().optional(),
})

export type MealFormData = z.infer<typeof mealSchema>
