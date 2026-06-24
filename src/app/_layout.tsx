import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { useGoalStore } from '@/stores/goalStore'

function AuthGuard() {
  const { session, initialized, initialize } = useAuthStore()
  const { profile, profileChecked, fetchProfile } = useProfileStore()
  const { activeGoal, goalChecked, fetchActiveGoal } = useGoalStore()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    initialize()
  }, [])

  useEffect(() => {
    if (initialized && session) fetchProfile()
  }, [initialized, session])

  useEffect(() => {
    if (profileChecked && profile) fetchActiveGoal()
  }, [profileChecked, profile])

  useEffect(() => {
    if (!initialized) return
    if (session && !profileChecked) return
    if (session && profileChecked && profile && !goalChecked) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboardingGroup = segments[0] === '(onboarding)'

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/sign-in')
    } else if (!profile) {
      if (!inOnboardingGroup) router.replace('/(onboarding)')
    } else if (!activeGoal) {
      const inGoalScreen = inOnboardingGroup && (segments as string[])[1] === 'goal'
      if (!inGoalScreen) router.replace('/(onboarding)/goal')
    } else {
      if (inAuthGroup || inOnboardingGroup) router.replace('/(tabs)')
    }
  }, [session, segments, initialized, profile, profileChecked, activeGoal, goalChecked])

  return null
}

export default function RootLayout() {
  return (
    <>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
