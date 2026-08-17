import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { TriangleAlert } from 'lucide-react'
import { goalSchema, type GoalFormData } from '@/schemas/onboarding'
import { useGoalStore } from '@/stores/goalStore'
import { useProfileStore } from '@/stores/profileStore'
import { calculateDailyDeficit } from '@/utils/calculations'
import { getDaysRemaining, todayISO } from '@/utils/date'
import { ErrorBanner } from '@/components/ErrorBanner'
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
import { cn } from '@/lib/utils'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function GoalPage() {
  const { createGoal, isLoading, error, clearError } = useGoalStore()
  const { profile, tdee } = useProfileStore()

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
  })

  const targetWeightKg = useWatch({ control: form.control, name: 'targetWeightKg' })
  const targetDate = useWatch({ control: form.control, name: 'targetDate' })

  const currentWeight = profile?.current_weight_kg ?? 0

  const lossKg =
    targetWeightKg && currentWeight
      ? +(currentWeight - targetWeightKg).toFixed(1)
      : null

  const daysLeft =
    targetDate && ISO_DATE.test(targetDate) ? getDaysRemaining(targetDate) : null

  const dailyDeficit =
    lossKg && daysLeft && daysLeft > 0
      ? calculateDailyDeficit({
          startWeightKg: currentWeight,
          targetWeightKg,
          targetDate,
        })
      : null

  const recommendedIntake = tdee && dailyDeficit ? tdee - dailyDeficit : null
  const deficitTooHigh = dailyDeficit !== null && dailyDeficit > 1000

  const onSubmit = async (data: GoalFormData) => {
    await createGoal({
      start_weight_kg: currentWeight,
      target_weight_kg: data.targetWeightKg,
      start_date: todayISO(),
      target_date: data.targetDate,
    })
  }

  return (
    <div className="min-h-dvh bg-muted/40 px-4 py-10">
      <Card className="mx-auto w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">목표 설정</CardTitle>
          <CardDescription>목표 체중과 달성 기간을 입력해 주세요</CardDescription>
        </CardHeader>

        <CardContent>
          {error && <ErrorBanner message={error} onDismiss={clearError} />}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-6"
              noValidate
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="targetWeightKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>목표 체중 (kg)</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="decimal"
                          placeholder="예: 65"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>목표일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {(lossKg !== null || daysLeft !== null) && (
                <section className="rounded-lg border bg-accent/40 p-4">
                  <h2 className="mb-3 text-sm font-semibold">자동 계산 결과</h2>
                  <dl className="grid gap-2 text-sm">
                    <SummaryRow
                      label="감량 목표"
                      value={lossKg !== null ? `${lossKg} kg` : '-'}
                    />
                    <SummaryRow
                      label="남은 기간"
                      value={daysLeft !== null && daysLeft > 0 ? `${daysLeft}일` : '-'}
                    />
                    <SummaryRow
                      label="하루 필요 적자"
                      value={dailyDeficit !== null ? `${dailyDeficit} kcal` : '-'}
                      emphasis={deficitTooHigh}
                    />
                    <SummaryRow
                      label="일일 섭취 권장"
                      value={
                        recommendedIntake !== null ? `${recommendedIntake} kcal` : '-'
                      }
                    />
                  </dl>
                  {deficitTooHigh && (
                    <p className="mt-3 flex items-start gap-2 text-xs text-destructive">
                      <TriangleAlert className="mt-px size-3.5 shrink-0" />
                      하루 적자가 1000 kcal를 초과합니다. 목표일을 늘리는 것을 권장합니다.
                    </p>
                  )}
                </section>
              )}

              <Button type="submit" size="lg" disabled={isLoading}>
                {isLoading ? '저장 중...' : '시작하기'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  emphasis,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'font-medium tabular-nums',
          emphasis && 'text-destructive'
        )}
      >
        {value}
      </dd>
    </div>
  )
}
