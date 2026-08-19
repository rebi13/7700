import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { signInSchema, type SignInFormData } from '@/schemas/auth'
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

export function SignInPage() {
  const { signIn, isLoading, error, clearError } = useAuthStore()

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: SignInFormData) => {
    await signIn(data.email, data.password)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">로그인</CardTitle>
          <CardDescription>7700 계정으로 계속하기</CardDescription>
        </CardHeader>

        <CardContent>
          {error && <ErrorBanner message={error} onDismiss={clearError} />}

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
                        autoComplete="current-password"
                        placeholder="••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="-mt-1 text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  비밀번호를 잊으셨나요?
                </Link>
              </div>

              <Button type="submit" disabled={isLoading} className="mt-1 w-full">
                {isLoading ? '로그인 중...' : '로그인'}
              </Button>
            </form>
          </Form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            계정이 없으신가요?{' '}
            <Link to="/sign-up" className="font-medium text-foreground underline-offset-4 hover:underline">
              회원가입
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
