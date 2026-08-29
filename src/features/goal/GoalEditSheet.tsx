import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { makeGoalSchema, type GoalFormData } from '@/schemas/onboarding'
import { useGoalStore } from '@/stores/goalStore'
import { useProfileStore } from '@/stores/profileStore'
import { EditSheet } from '@/components/EditSheet'
import { ErrorBanner } from '@/components/ErrorBanner'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from '@/lib/toast'

interface Props {
  open: boolean
  onClose: () => void
}

export function GoalEditSheet({ open, onClose }: Props) {
  const { activeGoal, updateGoal, isLoading, error, clearError } = useGoalStore()

  const currentWeight = useProfileStore((st) => st.profile?.current_weight_kg)

  const schema = useMemo(() => makeGoalSchema(currentWeight), [currentWeight])
  const form = useForm<GoalFormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!open || !activeGoal) return
    clearError()
    form.reset({
      targetWeightKg: activeGoal.target_weight_kg,
      targetDate: activeGoal.target_date,
    })
  }, [open, activeGoal, form, clearError])

  const onSubmit = async (data: GoalFormData) => {
    await updateGoal({
      target_weight_kg: data.targetWeightKg,
      target_date: data.targetDate,
    })
    if (useGoalStore.getState().error) return

    onClose()
    toast.success('목표가 업데이트되었습니다')
  }

  return (
    <EditSheet
      open={open}
      title="목표 수정"
      onClose={onClose}
      onSave={form.handleSubmit(onSubmit)}
      saving={isLoading}
    >
      {error && <ErrorBanner message={error} onDismiss={clearError} />}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <FormField
            control={form.control}
            name="targetWeightKg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>목표 체중 (kg) *</FormLabel>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder="예: 65"
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
            name="targetDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>목표일 *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </EditSheet>
  )
}
