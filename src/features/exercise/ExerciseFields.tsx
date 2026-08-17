import type { UseFormReturn } from 'react-hook-form'
import type { ExerciseFormData } from '@/schemas/exercise'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

/** 운동 추가 폼과 수정 시트가 공유하는 입력 필드 묶음 */
export function ExerciseFields({ form }: { form: UseFormReturn<ExerciseFormData> }) {
  return (
    <div className="flex flex-col gap-4">
      <FormField
        control={form.control}
        name="exercise_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>운동 이름 *</FormLabel>
            <FormControl>
              <Input placeholder="예: 러닝" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="calories_burned"
          render={({ field }) => (
            <FormItem>
              <FormLabel>소모 칼로리 (kcal) *</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  placeholder="예: 300"
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
          name="duration_minutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>운동 시간 (분)</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  placeholder="예: 30"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
