import { useCallback, useEffect, useState } from 'react'
import { LogOut, Pencil } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { useGoalStore } from '@/stores/goalStore'
import { ProfileEditSheet } from '@/features/onboarding/ProfileEditSheet'
import { GoalEditSheet } from '@/features/goal/GoalEditSheet'
import { ACTIVITY_LABEL, GENDER_LABEL } from '@/features/onboarding/options'
import { SkeletonCard } from '@/components/SkeletonCard'
import { ErrorBanner } from '@/components/ErrorBanner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { confirmAction } from '@/components/ConfirmDialog'

export function SettingsPage() {
  const { signOut } = useAuthStore()
  const {
    profile,
    bmr,
    tdee,
    fetchProfile,
    isLoading: profileLoading,
    error: profileError,
    clearError: clearProfileError,
  } = useProfileStore()
  const {
    activeGoal,
    daysRemaining,
    dailyDeficit,
    fetchActiveGoal,
    isLoading: goalLoading,
    error: goalError,
    clearError: clearGoalError,
  } = useGoalStore()

  const [profileSheetOpen, setProfileSheetOpen] = useState(false)
  const [goalSheetOpen, setGoalSheetOpen] = useState(false)

  useEffect(() => {
    fetchProfile()
    fetchActiveGoal()
  }, [fetchProfile, fetchActiveGoal])

  const handleLogout = useCallback(async () => {
    const ok = await confirmAction({
      title: '로그아웃',
      description: '정말 로그아웃하시겠습니까?',
      confirmLabel: '로그아웃',
    })
    if (ok) signOut()
  }, [signOut])

  const combinedError = profileError ?? goalError
  const clearCombinedError = profileError ? clearProfileError : clearGoalError

  return (
    <div className="flex flex-col gap-3 p-4 sm:p-6">
      <h1 className="text-xl font-bold">설정</h1>

      {combinedError && (
        <ErrorBanner message={combinedError} onDismiss={clearCombinedError} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>프로필</CardTitle>
          {profile && (
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setProfileSheetOpen(true)}
              >
                <Pencil />
                수정
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {profileLoading ? (
            <SkeletonCard rows={4} />
          ) : profile ? (
            <dl className="grid gap-2 text-sm">
              <InfoRow label="키" value={`${profile.height_cm} cm`} />
              <InfoRow label="현재 체중" value={`${profile.current_weight_kg} kg`} />
              <InfoRow label="생년월일" value={profile.birth_date} />
              <InfoRow
                label="성별"
                value={profile.gender ? GENDER_LABEL[profile.gender] : '미설정'}
              />
              <InfoRow
                label="활동 수준"
                value={
                  profile.custom_tdee != null
                    ? '직접 입력'
                    : profile.activity_level
                      ? ACTIVITY_LABEL[profile.activity_level]
                      : '미설정'
                }
              />
              {bmr && <InfoRow label="기초 대사량" value={`${Math.round(bmr)} kcal`} />}
              {tdee && (
                <InfoRow
                  label="유지 칼로리"
                  value={`${Math.round(tdee)} kcal${
                    profile.custom_tdee != null ? ' (직접 입력)' : ''
                  }`}
                />
              )}
            </dl>
          ) : (
            <p className="py-2 text-center text-sm text-muted-foreground">
              프로필 정보가 없습니다.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>목표</CardTitle>
          {activeGoal && (
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGoalSheetOpen(true)}
              >
                <Pencil />
                수정
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {goalLoading ? (
            <SkeletonCard rows={3} />
          ) : activeGoal ? (
            <dl className="grid gap-2 text-sm">
              <InfoRow label="목표 체중" value={`${activeGoal.target_weight_kg} kg`} />
              <InfoRow label="목표일" value={activeGoal.target_date} />
              {daysRemaining !== null && (
                <InfoRow label="남은 일수" value={`${daysRemaining}일`} />
              )}
              {dailyDeficit !== null && (
                <InfoRow
                  label="일일 필요 적자"
                  value={`${Math.round(dailyDeficit)} kcal`}
                />
              )}
            </dl>
          ) : (
            <p className="py-2 text-center text-sm text-muted-foreground">
              설정된 목표가 없습니다.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>계정</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut />
            로그아웃
          </Button>
        </CardContent>
      </Card>

      <ProfileEditSheet
        open={profileSheetOpen}
        onClose={() => setProfileSheetOpen(false)}
      />
      <GoalEditSheet
        open={goalSheetOpen}
        onClose={() => setGoalSheetOpen(false)}
      />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  )
}
