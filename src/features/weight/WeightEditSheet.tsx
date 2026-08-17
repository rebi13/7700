import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { weightSchema, type WeightFormData } from '@/schemas/weight'
import { useWeightStore } from '@/stores/weightStore'
import { WeightFields } from '@/features/weight/WeightFields'
import { EditSheet } from '@/components/EditSheet'
import { Form } from '@/components/ui/form'
import type { WeightLogRow } from '@/types/database'

interface Props {
  item: WeightLogRow | null
  date: string
  onClose: () => void
}

export function WeightEditSheet({ item, date, onClose }: Props) {
  const { updateLog, fetchLogs, isLoading } = useWeightStore()

  const form = useForm<WeightFormData>({ resolver: zodResolver(weightSchema) })

  useEffect(() => {
    if (!item) return
    form.reset({
      weight_kg: item.weight_kg,
      weight_date: item.weight_date,
      measured_timing: item.measured_timing ?? null,
      memo: item.memo ?? undefined,
    })
  }, [item, form])

  const onSubmit = async (data: WeightFormData) => {
    if (!item) return

    await updateLog(item.id, {
      weight_kg: data.weight_kg,
      measured_timing: data.measured_timing ?? null,
      memo: data.memo ?? null,
    })
    await fetchLogs(date)
    onClose()
  }

  return (
    <EditSheet
      open={!!item}
      title="체중 수정"
      onClose={onClose}
      onSave={form.handleSubmit(onSubmit)}
      saving={isLoading}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <WeightFields form={form} />
        </form>
      </Form>
    </EditSheet>
  )
}
