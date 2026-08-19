import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { MailCheck } from 'lucide-react'
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from '@/schemas/auth'
import { useAuthStore } from '@/stores/authStore'
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

export function ForgotPasswordPage() {
  const {
    requestPasswordReset,
    isLoading,
    error,
    resetEmailSent,
    clearError,
    clearFlags,
  } = useAuthStore()

  // 다른 화면에서 넘어온 안내가 남아 있지 않도록 들어올 때 비운다.
  useEffect(() => {
    clearFlags()
  }, [clearFlags])

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    await requestPasswordReset(data.email)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">비밀번호 재설정</CardTitle>
          <CardDescription>
            가입하신 이메일로 재설정 링크를 보내드립니다
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && <ErrorBanner message={error} onDismiss={clearError} />}

          {resetEmailSent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <MailCheck className="size-10 text-deficit" aria-hidden="true" />
              <p className="text-sm font-medium">메일을 보냈습니다</p>
              <p className="text-sm text-muted-foreground">
                {form.getValues('email')} 으로 재설정 링크를 보냈습니다.
                메일함을 확인해 주세요.
              </p>
              <p className="text-xs text-muted-foreground/80">
                메일이 안 보이면 스팸함도 확인해 주세요.
              </p>
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이메일</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          autoCapitalize="none"
                          placeholder="you@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isLoading} className="mt-2 w-full">
                  {isLoading ? '보내는 중...' : '재설정 링크 받기'}
                </Button>
              </form>
            </Form>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            <Link
              to="/sign-in"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              로그인으로 돌아가기
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
