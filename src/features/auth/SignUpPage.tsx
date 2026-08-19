import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { signUpSchema, type SignUpFormData } from '@/schemas/auth'
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
import { MailCheck } from 'lucide-react'
import { ErrorBanner } from '@/components/ErrorBanner'

export function SignUpPage() {
  const { signUp, isLoading, error, awaitingEmailConfirmation, clearError } =
    useAuthStore()

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = async (data: SignUpFormData) => {
    await signUp(data.email, data.password)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>칼로리 기록을 시작해 보세요</CardDescription>
        </CardHeader>

        <CardContent>
          {error && <ErrorBanner message={error} onDismiss={clearError} />}

          {/*
            이메일 확인이 켜져 있으면 가입해도 세션이 안 생겨 화면이 그대로 멈춘다.
            사용자가 가입이 됐는지 알 수 없으므로 여기서 알려준다.
          */}
          {awaitingEmailConfirmation ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <MailCheck className="size-10 text-deficit" aria-hidden="true" />
              <p className="text-sm font-medium">인증 메일을 보냈습니다</p>
              <p className="text-sm text-muted-foreground">
                {form.getValues('email')} 으로 인증 링크를 보냈습니다.
                메일함에서 인증을 마친 뒤 로그인해 주세요.
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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder="6자 이상"
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
                        placeholder="다시 입력"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading} className="mt-2 w-full">
                {isLoading ? '가입 중...' : '가입하기'}
              </Button>
            </form>
          </Form>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            이미 계정이 있으신가요?{' '}
            <Link to="/sign-in" className="font-medium text-foreground underline-offset-4 hover:underline">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
