import { useEffect } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { useGoalStore } from '@/stores/goalStore'

const AUTH_PATHS = ['/sign-in', '/sign-up']

/**
 * 세션 · 프로필 · 목표 상태에 따라 진입 경로를 강제한다.
 * 렌더링하는 UI 는 없고 리다이렉트만 담당한다.
 */
export function AuthGuard() {
  const { session, initialized, initialize } = useAuthStore()
  const { profile, profileChecked, fetchProfile } = useProfileStore()
  const { activeGoal, goalChecked, fetchActiveGoal } = useGoalStore()

  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (initialized && session) fetchProfile()
  }, [initialized, session, fetchProfile])

  useEffect(() => {
    if (profileChecked && profile) fetchActiveGoal()
  }, [profileChecked, profile, fetchActiveGoal])

  useEffect(() => {
    if (!initialized) return
    if (session && !profileChecked) return
    if (session && profileChecked && profile && !goalChecked) return

    const inAuthGroup = AUTH_PATHS.includes(pathname)
    const inOnboardingGroup = pathname.startsWith('/onboarding')

    if (!session) {
      if (!inAuthGroup) navigate({ to: '/sign-in', replace: true })
    } else if (!profile) {
      if (!inOnboardingGroup) navigate({ to: '/onboarding', replace: true })
    } else if (!activeGoal) {
      if (pathname !== '/onboarding/goal') {
        navigate({ to: '/onboarding/goal', replace: true })
      }
    } else if (inAuthGroup || inOnboardingGroup) {
      navigate({ to: '/', replace: true })
    }
  }, [
    session,
    pathname,
    initialized,
    profile,
    profileChecked,
    activeGoal,
    goalChecked,
    navigate,
  ])

  return null
}
