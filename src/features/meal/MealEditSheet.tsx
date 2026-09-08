import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { mealSchema, type MealFormData } from '@/schemas/meal'
import { useMealStore } from '@/stores/mealStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { useCalorieEstimate } from '@/features/ai-log/useCalorieEstimate'
import { MealFields } from '@/features/meal/MealFields'
import { syncFoodLibrary } from '@/features/meal/foodLibrary'
import { EditSheet } from '@/components/EditSheet'
import { Form } from '@/components/ui/form'
import type { MealLogRow } from '@/types/database'

interface Props {
  item: MealLogRow | null
  date: string
  onClose: () => void
}

export function MealEditSheet({ item, date, onClose }: Props) {
  const { updateLog, fetchLogs, isLoading } = useMealStore()
  const { calculateAndSave } = useSummaryStore()
  const ai = useCalorieEstimate()

  const form = useForm<MealFormData>({ resolver: zodResolver(mealSchema) })

  useEffect(() => {
    if (!item) return
    form.reset({
      food_name: item.food_name,
      calories: item.calories,
      meal_type: item.meal_type ?? undefined,
      meal_date: item.meal_date,
      protein_g: item.protein_g ?? undefined,
      carbs_g: item.carbs_g ?? undefined,
      fat_g: item.fat_g ?? undefined,
      memo: item.memo ?? undefined,
    })
    // 이전 편집에서 남은 추정 노트를 지운다.
    ai.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, form])

  const onSubmit = async (data: MealFormData) => {
    if (!item) return

    await updateLog(item.id, {
      food_name: data.food_name,
      calories: data.calories,
      meal_type: data.meal_type,
      protein_g: data.protein_g ?? null,
      carbs_g: data.carbs_g ?? null,
      fat_g: data.fat_g ?? null,
      memo: data.memo ?? null,
    })
    await fetchLogs(date)
    await calculateAndSave(date)

    // 추정/캐시 값을 그대로 저장했으면 'ai', 값을 고쳤으면 'manual' 로 라이브러리를 갱신한다.
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

    onClose()
  }

  return (
    <EditSheet
      open={!!item}
      title="식사 수정"
      onClose={onClose}
      onSave={form.handleSubmit(onSubmit)}
      saving={isLoading}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <MealFields form={form} ai={ai} />
        </form>
      </Form>
    </EditSheet>
  )
}
