import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema, type ProfileFormData } from '@/schemas/onboarding'
import { useProfileStore } from '@/stores/profileStore'
import { useWeightStore } from '@/stores/weightStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { ProfileFields } from '@/features/onboarding/ProfileFields'
import { EditSheet } from '@/components/EditSheet'
import { ErrorBanner } from '@/components/ErrorBanner'
import { Form } from '@/components/ui/form'
import { notify } from '@/lib/dom'
import { todayISO } from '@/utils/date'

interface Props {
  open: boolean
  onClose: () => void
}

export function ProfileEditSheet({ open, onClose }: Props) {
  const { profile, updateProfile, isLoading, error, clearError } = useProfileStore()
  const { addLog } = useWeightStore()
  const { calculateAndSave } = useSummaryStore()

  const form = useForm<ProfileFormData>({ resolver: zodResolver(profileSchema) })

  useEffect(() => {
    if (!open || !profile) return
    clearError()
    form.reset({
      heightCm: profile.height_cm,
      currentWeightKg: profile.current_weight_kg,
      birthDate: profile.birth_date,
      gender: profile.gender ?? undefined,
      activityLevel: profile.activity_level ?? undefined,
    })
  }, [open, profile, form, clearError])

  const onSubmit = async (data: ProfileFormData) => {
    const prevWeight = profile?.current_weight_kg

    await updateProfile({
      height_cm: data.heightCm,
      current_weight_kg: data.currentWeightKg,
      birth_date: data.birthDate,
      gender: data.gender,
      activity_level: data.activityLevel,
    })
    if (useProfileStore.getState().error) return

    // 체중이 바뀌었으면 오늘자 체중 기록을 남기고 요약을 다시 계산한다.
    if (prevWeight !== data.currentWeightKg) {
      await addLog({
        weight_kg: data.currentWeightKg,
        weight_date: todayISO(),
        measured_timing: null,
        memo: '프로필에서 수정',
      })
      await calculateAndSave(todayISO())
    }

    onClose()
    notify('저장 완료', '프로필이 업데이트되었습니다.')
  }

  return (
    <EditSheet
      open={open}
      title="프로필 수정"
      onClose={onClose}
      onSave={form.handleSubmit(onSubmit)}
      saving={isLoading}
    >
      {error && <ErrorBanner message={error} onDismiss={clearError} />}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <ProfileFields form={form} />
        </form>
      </Form>
    </EditSheet>
  )
}
