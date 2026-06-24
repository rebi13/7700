import { z } from 'zod'

export const weightSchema = z.object({
  weight_kg: z.coerce
    .number({ invalid_type_error: '체중을 입력해 주세요' })
    .min(30, '체중은 30kg 이상이어야 합니다')
    .max(300, '체중은 300kg 이하여야 합니다'),
  weight_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식으로 입력해 주세요'),
  measured_timing: z
    .enum(['morning', 'afternoon', 'evening', 'after_workout', 'other'] as const, {
      errorMap: () => ({ message: '측정 시간대를 선택해 주세요' }),
    })
    .nullable()
    .optional(),
  memo: z.string().max(200).nullable().optional(),
})

export type WeightFormData = z.infer<typeof weightSchema>
