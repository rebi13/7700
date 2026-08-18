import { Outlet } from '@tanstack/react-router'
import { AuthGuard } from '@/features/auth/AuthGuard'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Toaster } from '@/components/ui/sonner'

export function RootLayout() {
  return (
    <>
      <AuthGuard />
      <Outlet />
      {/* 토스트와 확인 대화상자는 화면 어디서든 부를 수 있도록 최상위에 한 번만 둔다 */}
      <Toaster position="top-center" richColors />
      <ConfirmDialog />
    </>
  )
}
