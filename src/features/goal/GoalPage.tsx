import { useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { TriangleAlert } from 'lucide-react'
import { makeGoalSchema, type GoalFormData } from '@/schemas/onboarding'
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
  FormDescription,
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

  const currentWeight = profile?.current_weight_kg ?? 0
  const schema = useMemo(() => makeGoalSchema(currentWeight), [currentWeight])

  const form = useForm<GoalFormData>({
    resolver: zodResolver(schema),
    defaultValues: { startDate: todayISO() },
  })

  const targetWeightKg = useWatch({ control: form.control, name: 'targetWeightKg' })
  const targetDate = useWatch({ control: form.control, name: 'targetDate' })

  const rawLossKg =
    targetWeightKg && currentWeight
      ? +(currentWeight - targetWeightKg).toFixed(1)
      : null

  // 감량 전용이므로 0 이하는 계산하지 않는다. 제출은 스키마가 막고, 그 전까지
  // 화면에는 음수 대신 '-' 를 보여 준다.
  const lossKg = rawLossKg !== null && rawLossKg > 0 ? rawLossKg : null

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
      start_date: data.startDate,
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
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>시작일</FormLabel>
                      <FormControl>
                        <Input type="date" max={todayISO()} {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormDescription>
                        이 날부터 식사를 기록한 날의 적자를 누적합니다. 시작 체중은
                        시작일과 관계없이 프로필의 현재 체중({currentWeight} kg)을 씁니다
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
