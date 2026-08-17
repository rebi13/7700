import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { exerciseSchema, type ExerciseFormData } from '@/schemas/exercise'
import { useExerciseStore } from '@/stores/exerciseStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { ExerciseFields } from '@/features/exercise/ExerciseFields'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { blurActiveElement, notify } from '@/lib/dom'

export function ExerciseForm({ date }: { date: string }) {
  const { addLog, isLoading } = useExerciseStore()

  const form = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: { exercise_date: date },
  })

  const onSubmit = async (data: ExerciseFormData) => {
    blurActiveElement()
    await addLog({ ...data, exercise_date: date })

    const { error } = useExerciseStore.getState()
    if (error) {
      notify('오류', error)
      return
    }

    await useSummaryStore.getState().calculateAndSave(date)
    form.reset({ exercise_date: date })
    notify('저장 완료', '운동 기록이 저장되었습니다.')
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <ExerciseFields form={form} />
        <Button type="submit" size="lg" className="mt-6 w-full" disabled={isLoading}>
          {isLoading ? '저장 중...' : '저장'}
        </Button>
      </form>
    </Form>
  )
}
