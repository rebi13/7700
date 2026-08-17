import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { exerciseSchema, type ExerciseFormData } from '@/schemas/exercise'
import { useExerciseStore } from '@/stores/exerciseStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { ExerciseFields } from '@/features/exercise/ExerciseFields'
import { EditSheet } from '@/components/EditSheet'
import { Form } from '@/components/ui/form'
import type { ExerciseLogRow } from '@/types/database'

interface Props {
  item: ExerciseLogRow | null
  date: string
  onClose: () => void
}

export function ExerciseEditSheet({ item, date, onClose }: Props) {
  const { updateLog, fetchLogs, isLoading } = useExerciseStore()
  const { calculateAndSave } = useSummaryStore()

  const form = useForm<ExerciseFormData>({ resolver: zodResolver(exerciseSchema) })

  useEffect(() => {
    if (!item) return
    form.reset({
      exercise_name: item.exercise_name,
      calories_burned: item.calories_burned,
      duration_minutes: item.duration_minutes ?? undefined,
      exercise_date: item.exercise_date,
      memo: item.memo ?? undefined,
    })
  }, [item, form])

  const onSubmit = async (data: ExerciseFormData) => {
    if (!item) return

    await updateLog(item.id, {
      exercise_name: data.exercise_name,
      calories_burned: data.calories_burned,
      duration_minutes: data.duration_minutes ?? null,
      memo: data.memo ?? null,
    })
    await fetchLogs(date)
    await calculateAndSave(date)
    onClose()
  }

  return (
    <EditSheet
      open={!!item}
      title="운동 수정"
      onClose={onClose}
      onSave={form.handleSubmit(onSubmit)}
      saving={isLoading}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <ExerciseFields form={form} />
        </form>
      </Form>
    </EditSheet>
  )
}
