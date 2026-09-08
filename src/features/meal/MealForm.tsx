import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { mealSchema, type MealFormData } from '@/schemas/meal'
import { useMealStore } from '@/stores/mealStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { useCalorieEstimate } from '@/features/ai-log/useCalorieEstimate'
import { MealFields } from '@/features/meal/MealFields'
import { syncFoodLibrary } from '@/features/meal/foodLibrary'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { blurActiveElement } from '@/lib/dom'
import { toast } from '@/lib/toast'

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
      toast.error(error)
      return
    }

    await useSummaryStore.getState().calculateAndSave(date)

    // 저장한 값으로 음식 라이브러리를 갱신한다. 추정/캐시 값을 그대로 뒀으면 'ai',
    // 칼로리를 고쳤거나 직접 입력했으면 'manual' 로 남겨 다음부터 그 값을 재사용한다.
    const pristine = ai.isPristineEstimate(data.calories)
    await syncFoodLibrary({
      food_name: data.food_name,
      calories: data.calories,
      protein_g: data.protein_g,
      carbs_g: data.carbs_g,
      fat_g: data.fat_g,
      source: pristine ? 'ai' : 'manual',
      confidence: pristine ? ai.note?.confidence ?? null : null,
      note: pristine ? ai.note?.text ?? null : null,
    })

    form.reset({ meal_date: date, meal_type: undefined })
    ai.reset()
    toast.success('식사 기록이 저장되었습니다')
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
