import { Outlet } from '@tanstack/react-router'
import { AuthGuard } from '@/features/auth/AuthGuard'

export function RootLayout() {
  return (
    <>
      <AuthGuard />
      <Outlet />
    </>
  )
}
