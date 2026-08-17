import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { mealSchema, type MealFormData } from '@/schemas/meal'
import { useMealStore } from '@/stores/mealStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { useCalorieEstimate } from '@/features/ai-log/useCalorieEstimate'
import { MealFields } from '@/features/meal/MealFields'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { blurActiveElement, notify } from '@/lib/dom'

export function MealForm({ date }: { date: string }) {
  const { addLog, isLoading } = useMealStore()
  const ai = useCalorieEstimate()

  const form = useForm<MealFormData>({
    resolver: zodResolver(mealSchema),
    defaultValues: { meal_date: date, meal_type: undefined },
  })

  const onSubmit = async (data: MealFormData) => {
    blurActiveElement()
    await addLog({ ...data, meal_date: date })

    const { error } = useMealStore.getState()
    if (error) {
      notify('오류', error)
      return
    }

    await useSummaryStore.getState().calculateAndSave(date)
    form.reset({ meal_date: date, meal_type: undefined })
    ai.reset()
    notify('저장 완료', '식사 기록이 저장되었습니다.')
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <MealFields form={form} ai={ai} />
        <Button type="submit" size="lg" className="mt-6 w-full" disabled={isLoading}>
          {isLoading ? '저장 중...' : '저장'}
        </Button>
      </form>
    </Form>
  )
}
