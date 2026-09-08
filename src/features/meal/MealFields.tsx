import { Sparkles } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import type { MealFormData } from '@/schemas/meal'
import { MEAL_TYPES } from '@/features/meal/options'
import { FoodNameField } from '@/features/meal/FoodNameField'
import { AiEstimateNote } from '@/features/ai-log/AiEstimateNote'
import { useCalorieEstimate } from '@/features/ai-log/useCalorieEstimate'
import { ChipGroup } from '@/components/ChipGroup'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  form: UseFormReturn<MealFormData>
  /** 추가 폼에서만 AI 추정 버튼을 노출한다 */
  ai?: ReturnType<typeof useCalorieEstimate>
}

/** 식사 추가 폼과 수정 시트가 공유하는 입력 필드 묶음 */
export function MealFields({ form, ai }: Props) {
  const foodName = form.watch('food_name')

  const handleEstimate = async () => {
    const result = await ai?.estimate(foodName, form.getValues('meal_type'))
    if (!result) return

    form.setValue('calories', result.calories, { shouldValidate: true })
    if (result.protein_g != null) form.setValue('protein_g', result.protein_g)
    if (result.carbs_g != null) form.setValue('carbs_g', result.carbs_g)
    if (result.fat_g != null) form.setValue('fat_g', result.fat_g)
  }

  return (
    <div className="flex flex-col gap-4">
      <FormField
        control={form.control}
        name="meal_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>식사 종류 *</FormLabel>
            <FormControl>
              <ChipGroup
                aria-label="식사 종류"
                options={MEAL_TYPES}
                value={field.value}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FoodNameField form={form} ai={ai} />

      {ai && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleEstimate}
            disabled={!foodName || ai.isEstimating}
          >
            <Sparkles />
            {ai.isEstimating ? '추정 중...' : 'AI 칼로리 추정'}
          </Button>
        </div>
      )}

      <FormField
        control={form.control}
        name="calories"
        render={({ field }) => (
          <FormItem>
            <FormLabel>칼로리 (kcal) *</FormLabel>
            <FormControl>
              <Input
                inputMode="numeric"
                placeholder="예: 550"
                {...field}
                value={field.value ?? ''}
                onChange={(e) => {
                  field.onChange(e)
                  ai?.syncCalories(e.target.value)
                }}
              />
            </FormControl>
            {ai?.note && <AiEstimateNote note={ai.note} />}
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-3 gap-3">
        <MacroField form={form} name="protein_g" label="단백질 (g)" />
        <MacroField form={form} name="carbs_g" label="탄수화물 (g)" />
        <MacroField form={form} name="fat_g" label="지방 (g)" />
      </div>

      <FormField
        control={form.control}
        name="memo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>메모</FormLabel>
            <FormControl>
              <Textarea
                rows={2}
                placeholder="선택사항"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function MacroField({
  form,
  name,
  label,
}: {
  form: UseFormReturn<MealFormData>
  name: 'protein_g' | 'carbs_g' | 'fat_g'
  label: string
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs">{label}</FormLabel>
          <FormControl>
            <Input
              inputMode="decimal"
              placeholder="0"
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
