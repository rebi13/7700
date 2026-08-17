import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { mealSchema, type MealFormData } from '@/schemas/meal'
import { useMealStore } from '@/stores/mealStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { MealFields } from '@/features/meal/MealFields'
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
          <MealFields form={form} />
        </form>
      </Form>
    </EditSheet>
  )
}
