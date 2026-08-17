import { Link, Outlet } from '@tanstack/react-router'
import { ChartColumn, CirclePlus, House, Settings } from 'lucide-react'

const TABS = [
  { to: '/', label: '홈', icon: House },
  { to: '/add-log', label: '기록', icon: CirclePlus },
  { to: '/stats', label: '통계', icon: ChartColumn },
  { to: '/settings', label: '설정', icon: Settings },
] as const

/** RN 의 <Tabs> 를 대체하는 하단 탭 바 + 콘텐츠 영역 */
export function TabsLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <main className="mx-auto w-full max-w-2xl flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      <nav
        aria-label="주요 메뉴"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto flex w-full max-w-2xl">
          {TABS.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <Link
                to={to}
                activeOptions={{ exact: to === '/' }}
                className="flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground data-[status=active]:font-medium"
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
