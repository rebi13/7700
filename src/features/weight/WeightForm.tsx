import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { weightSchema, type WeightFormData } from '@/schemas/weight'
import { useWeightStore } from '@/stores/weightStore'
import { WeightFields } from '@/features/weight/WeightFields'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { blurActiveElement } from '@/lib/dom'
import { toast } from '@/lib/toast'

export function WeightForm({ date }: { date: string }) {
  const { addLog, isLoading } = useWeightStore()

  const form = useForm<WeightFormData>({
    resolver: zodResolver(weightSchema),
    defaultValues: { weight_date: date, measured_timing: null },
  })

  const onSubmit = async (data: WeightFormData) => {
    blurActiveElement()
    await addLog({ ...data, weight_date: date })

    const { error } = useWeightStore.getState()
    if (error) {
      toast.error(error)
      return
    }

    form.reset({ weight_date: date, measured_timing: null })
    toast.success('체중 기록이 저장되었습니다')
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <WeightFields form={form} />
        <Button type="submit" size="lg" className="mt-6 w-full" disabled={isLoading}>
          {isLoading ? '저장 중...' : '저장'}
        </Button>
      </form>
    </Form>
  )
}
