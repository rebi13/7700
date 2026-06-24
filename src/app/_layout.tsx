import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'

function AuthGuard() {
  const { session, initialized, initialize } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    initialize()
  }, [])

  useEffect(() => {
    if (!initialized) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [session, segments, initialized])

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
