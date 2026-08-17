import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { RootLayout } from '@/routes/RootLayout'
import { TabsLayout } from '@/routes/TabsLayout'
import { AddLogPage } from '@/routes/AddLogPage'
import { SettingsPage } from '@/routes/SettingsPage'
import { SignInPage } from '@/features/auth/SignInPage'
import { SignUpPage } from '@/features/auth/SignUpPage'
import { ProfilePage } from '@/features/onboarding/ProfilePage'
import { GoalPage } from '@/features/goal/GoalPage'
import { HomePage } from '@/features/dashboard/HomePage'
import { StatsPage } from '@/features/stats/StatsPage'

const rootRoute = createRootRoute({ component: RootLayout })

// ─── 인증 ─────────────────────────────────────────────────────────────────────

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  component: SignInPage,
})

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  component: SignUpPage,
})

// ─── 온보딩 ───────────────────────────────────────────────────────────────────

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  component: Outlet,
})

const onboardingIndexRoute = createRoute({
  getParentRoute: () => onboardingRoute,
  path: '/',
  component: ProfilePage,
})

const onboardingGoalRoute = createRoute({
  getParentRoute: () => onboardingRoute,
  path: 'goal',
  component: GoalPage,
})

// ─── 메인 탭 ──────────────────────────────────────────────────────────────────

// path 없는 레이아웃 라우트 — URL 에는 드러나지 않고 하단 탭 바만 씌운다.
const tabsRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'tabs',
  component: TabsLayout,
})

const homeRoute = createRoute({
  getParentRoute: () => tabsRoute,
  path: '/',
  component: HomePage,
})

const addLogRoute = createRoute({
  getParentRoute: () => tabsRoute,
  path: '/add-log',
  component: AddLogPage,
})

const statsRoute = createRoute({
  getParentRoute: () => tabsRoute,
  path: '/stats',
  component: StatsPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => tabsRoute,
  path: '/settings',
  component: SettingsPage,
})

const routeTree = rootRoute.addChildren([
  signInRoute,
  signUpRoute,
  onboardingRoute.addChildren([onboardingIndexRoute, onboardingGoalRoute]),
  tabsRoute.addChildren([homeRoute, addLogRoute, statsRoute, settingsRoute]),
])

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: () => {
    throw redirect({ to: '/' })
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
