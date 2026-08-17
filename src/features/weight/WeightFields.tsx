import type { UseFormReturn } from 'react-hook-form'
import type { WeightFormData } from '@/schemas/weight'
import { MEASURED_TIMINGS } from '@/features/weight/options'
import { ChipGroup } from '@/components/ChipGroup'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

/** 체중 추가 폼과 수정 시트가 공유하는 입력 필드 묶음 */
export function WeightFields({ form }: { form: UseFormReturn<WeightFormData> }) {
  return (
    <div className="flex flex-col gap-4">
      <FormField
        control={form.control}
        name="weight_kg"
        render={({ field }) => (
          <FormItem>
            <FormLabel>체중 (kg) *</FormLabel>
            <FormControl>
              <Input
                inputMode="decimal"
                placeholder="예: 68.5"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="measured_timing"
        render={({ field }) => (
          <FormItem>
            <FormLabel>측정 시간대</FormLabel>
            <FormControl>
              <ChipGroup
                aria-label="측정 시간대"
                options={MEASURED_TIMINGS}
                value={field.value}
                onChange={field.onChange}
                deselectable
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

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
