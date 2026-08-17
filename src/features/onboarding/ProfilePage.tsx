import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema, type ProfileFormData } from '@/schemas/onboarding'
import { useProfileStore } from '@/stores/profileStore'
import { ProfileFields } from '@/features/onboarding/ProfileFields'
import { ErrorBanner } from '@/components/ErrorBanner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Form } from '@/components/ui/form'

export function ProfilePage() {
  const { createProfile, isLoading, error, clearError } = useProfileStore()

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  const onSubmit = async (data: ProfileFormData) => {
    await createProfile({
      height_cm: data.heightCm,
      current_weight_kg: data.currentWeightKg,
      birth_date: data.birthDate,
      gender: data.gender,
      activity_level: data.activityLevel,
    })
  }

  return (
    <div className="min-h-dvh bg-muted/40 px-4 py-10">
      <Card className="mx-auto w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">프로필 설정</CardTitle>
          <CardDescription>
            정확한 칼로리 계산을 위해 정보를 입력해 주세요
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && <ErrorBanner message={error} onDismiss={clearError} />}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-6"
              noValidate
            >
              <ProfileFields form={form} />
              <Button type="submit" size="lg" disabled={isLoading}>
                {isLoading ? '저장 중...' : '다음'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
