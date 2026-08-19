import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/schemas/auth'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ErrorBanner } from '@/components/ErrorBanner'

export function ResetPasswordPage() {
  const { updatePassword, isLoading, error, session, initialized, clearError } =
    useAuthStore()
  const navigate = useNavigate()

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    const ok = await updatePassword(data.password)
    if (!ok) return

    toast.success('비밀번호가 변경되었습니다')
    navigate({ to: '/', replace: true })
  }

  // 복구 링크의 토큰은 supabase-js 가 세션으로 바꿔 준다. 세션이 없다는 것은
  // 링크가 만료됐거나 주소를 직접 친 경우다.
  const linkInvalid = initialized && !session

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">새 비밀번호 설정</CardTitle>
          <CardDescription>
            {linkInvalid
              ? '링크를 다시 받아 주세요'
              : '앞으로 사용할 비밀번호를 입력해 주세요'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && <ErrorBanner message={error} onDismiss={clearError} />}

          {linkInvalid ? (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <p className="text-sm text-muted-foreground">
                링크가 만료됐거나 이미 사용됐습니다. 재설정 링크를 다시 받아 주세요.
              </p>
              <Button asChild className="w-full">
                <Link to="/forgot-password">재설정 링크 다시 받기</Link>
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
                noValidate
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>새 비밀번호</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호 확인</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isLoading} className="mt-2 w-full">
                  {isLoading ? '변경 중...' : '비밀번호 변경'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
