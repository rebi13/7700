import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
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
import { SkeletonCard } from '@/components/SkeletonCard'

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

// 통계 화면만 따로 떼어 낸다. Recharts 가 번들의 절반이 넘는데
// 로그인 화면에서까지 같이 내려받을 이유가 없다.
const statsRoute = createRoute({
  getParentRoute: () => tabsRoute,
  path: '/stats',
  component: lazyRouteComponent(
    () => import('@/features/stats/StatsPage'),
    'StatsPage'
  ),
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
  // 탭에 포인터가 닿으면 미리 받아둔다. 눌렀을 때 기다릴 일이 거의 없다.
  defaultPreload: 'intent',
  defaultPendingComponent: () => (
    <div className="flex flex-col gap-3 p-4 sm:p-6">
      <SkeletonCard height={220} />
      <SkeletonCard height={220} />
    </div>
  ),
  defaultNotFoundComponent: () => {
    throw redirect({ to: '/' })
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
