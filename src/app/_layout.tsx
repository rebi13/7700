import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'

function AuthGuard() {
  const { session, initialized, initialize } = useAuthStore()
  const { profile, profileChecked, fetchProfile } = useProfileStore()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    initialize()
  }, [])

  useEffect(() => {
    if (initialized && session) fetchProfile()
  }, [initialized, session])

  useEffect(() => {
    if (!initialized) return
    if (session && !profileChecked) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboardingGroup = segments[0] === '(onboarding)'

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/sign-in')
    } else if (!profile) {
      if (!inOnboardingGroup) router.replace('/(onboarding)')
    } else {
      if (inAuthGroup || inOnboardingGroup) router.replace('/(tabs)')
    }
  }, [session, segments, initialized, profile, profileChecked])

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
