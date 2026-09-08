import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import { DateNavigator } from '@/features/dashboard/DateNavigator'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { useGoalStore } from '@/stores/goalStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { useFeedbackStore } from '@/stores/feedbackStore'
import { SkeletonCard } from '@/components/SkeletonCard'
import { ErrorBanner } from '@/components/ErrorBanner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { formatDateShort, todayISO } from '@/utils/date'
import { cn } from '@/lib/utils'

export function HomePage() {
  const { user } = useAuthStore()
  const { tdee } = useProfileStore()
  const { activeGoal, daysRemaining, dailyDeficit } = useGoalStore()
  const {
    todaySummary,
    isLoading,
    error: summaryError,
    calculateAndSave,
    fetchSummary,
    clearError: clearSummaryError,
  } = useSummaryStore()
  const {
    dailyFeedback,
    isGenerating,
    error: feedbackError,
    generateDailyFeedback,
    fetchDailyFeedback,
    clearError: clearFeedbackError,
  } = useFeedbackStore()

  const today = todayISO()
  const userId = user?.id
  const [selectedDate, setSelectedDate] = useState(today)
  const isToday = selectedDate === today
  const dayLabel = isToday ? '오늘' : formatDateShort(selectedDate)

  // 오늘은 최신 기록으로 다시 계산해 보여 주고, 지난 날짜는 저장된 요약을 읽어 온다.
  // (기록 추가·수정·삭제가 그날의 요약을 항상 갱신해 두므로 저장본이 최신이다.)
  const loadSummary = useCallback(
    (date: string) => {
      if (date === todayISO()) {
        if (useProfileStore.getState().tdee === null) return
        return calculateAndSave(date)
      }
      return fetchSummary(date)
    },
    [calculateAndSave, fetchSummary]
  )

  // 스토어는 userId·tdee 가 없으면 조용히 빠져나간다. 세션 복원과 프로필 조회는
  // AuthGuard 가 비동기로 처리하므로, 준비된 뒤에 다시 부르도록 의존성에 넣는다.
  useEffect(() => {
    if (!userId) return
    fetchDailyFeedback(selectedDate)
  }, [userId, fetchDailyFeedback, selectedDate])

  useEffect(() => {
    if (!userId) return
    loadSummary(selectedDate)
  }, [userId, tdee, loadSummary, selectedDate])

  const intake = todaySummary?.total_intake_calories ?? 0
  const exercise = todaySummary?.total_exercise_calories ?? 0
  const net = todaySummary?.net_calories ?? 0
  const delta = todaySummary?.calorie_delta ?? tdee ?? 0
  const cumulative = todaySummary?.cumulative_delta ?? 0
  const estimatedLoss = todaySummary?.estimated_weight_change_kg ?? 0

  const targetLoss = activeGoal
    ? activeGoal.start_weight_kg - activeGoal.target_weight_kg
    : 0
  const progressPct =
    targetLoss > 0
      ? Math.min(100, Math.max(0, (estimatedLoss / targetLoss) * 100))
      : 0

  const isDeltaPositive = delta >= 0
  // 배너를 띄운 쪽의 에러를 지워야 닫기가 실제로 동작한다.
  const error = summaryError ?? feedbackError
  const clearError = summaryError ? clearSummaryError : clearFeedbackError

  return (
    <div className="flex flex-col gap-3 p-4 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">안녕하세요 👋</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <DateNavigator date={selectedDate} onChange={setSelectedDate} />
      </header>

      {error && <ErrorBanner message={error} onDismiss={clearError} />}

      {isLoading ? (
        <>
          <SkeletonCard height={100} />
          <SkeletonCard height={80} />
          <SkeletonCard height={120} />
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {dayLabel} 칼로리
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center">
              <Stat label="섭취" value={intake} />
              <Separator orientation="vertical" className="h-10" />
              <Stat label="운동 소모" value={exercise} className="text-deficit" />
              <Separator orientation="vertical" className="h-10" />
              <Stat label="순 칼로리" value={net} />
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {dayLabel}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={cn(
                    'text-3xl font-extrabold tabular-nums',
                    isDeltaPositive ? 'text-deficit' : 'text-surplus'
                  )}
                >
                  {isDeltaPositive ? '-' : '+'}
                  {Math.abs(delta).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  kcal {isDeltaPositive ? '적자' : '초과'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  TDEE
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-extrabold tabular-nums">
                  {(tdee ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">kcal / 일</p>
                {dailyDeficit !== null && (
                  <p className="mt-1.5 text-xs text-muted-foreground/70">
                    목표 적자 {dailyDeficit.toLocaleString()} kcal
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {activeGoal && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  목표 진행
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex">
                  <Stat
                    label="누적 적자"
                    display={`${cumulative >= 0 ? '' : '-'}${Math.abs(cumulative).toLocaleString()} kcal`}
                    size="sm"
                    className={cumulative >= 0 ? 'text-deficit' : 'text-surplus'}
                  />
                  <Stat
                    label="예상 감량"
                    display={`${estimatedLoss.toFixed(2)} kg`}
                    size="sm"
                  />
                  <Stat
                    label="남은 기간"
                    display={
                      daysRemaining !== null && daysRemaining > 0
                        ? `${daysRemaining}일`
                        : '-'
                    }
                    size="sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Progress value={progressPct} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {activeGoal.start_weight_kg} kg → {activeGoal.target_weight_kg} kg
                    </span>
                    <span className="tabular-nums">{progressPct.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* AI 피드백 카드 — 요약 로딩과 무관하게 항상 표시 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {isToday ? '오늘의' : dayLabel} AI 피드백
          </CardTitle>
          {dailyFeedback && (
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => generateDailyFeedback(selectedDate)}
                disabled={isGenerating}
              >
                다시 생성
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {isGenerating ? (
            <SkeletonCard rows={3} />
          ) : dailyFeedback ? (
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {dailyFeedback.feedback}
            </p>
          ) : (
            <Button className="w-full" onClick={() => generateDailyFeedback(selectedDate)}>
              <Sparkles />
              AI 피드백 받기
            </Button>
          )}
        </CardContent>
      </Card>

      <Button
        variant="outline"
        onClick={() => loadSummary(selectedDate)}
        disabled={isLoading}
      >
        <RefreshCw />
        새로고침
      </Button>
    </div>
  )
}

function Stat({
  label,
  value,
  display,
  className,
  size = 'lg',
}: {
  label: string
  value?: number
  display?: string
  className?: string
  size?: 'sm' | 'lg'
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          'font-bold tabular-nums',
          size === 'lg' ? 'text-xl' : 'text-base',
          className
        )}
      >
        {display ?? value?.toLocaleString()}
      </span>
      {display === undefined && (
        <span className="text-[11px] text-muted-foreground/70">kcal</span>
      )}
    </div>
  )
}
