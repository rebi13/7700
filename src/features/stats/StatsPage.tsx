import { useEffect, useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useWeightStore } from '@/stores/weightStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { useGoalStore } from '@/stores/goalStore'
import { useFeedbackStore } from '@/stores/feedbackStore'
import { WeightTrendChart } from '@/features/stats/WeightTrendChart'
import { DeltaBarChart } from '@/features/stats/DeltaBarChart'
import { CumulativeDeltaChart } from '@/features/stats/CumulativeDeltaChart'
import { SkeletonCard } from '@/components/SkeletonCard'
import { EmptyState } from '@/components/EmptyState'
import { ErrorBanner } from '@/components/ErrorBanner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cumulativeDeltaSeries, isRecordedDay } from '@/utils/calculations'
import { formatDateShort, todayISO } from '@/utils/date'
import { getWeekRange } from '../../../supabase/functions/_shared/weekly-feedback.logic'

/** YYYY-MM-DD → M/D */
const shortDate = (iso: string) => iso.slice(5).replace('-', '/')

export function StatsPage() {
  const userId = useAuthStore((st) => st.user?.id)
  const {
    logs: weightLogs,
    fetchRecentLogs,
    isLoading: weightLoading,
  } = useWeightStore()
  const {
    recentSummaries,
    fetchRecentSummaries,
    goalSummaries,
    fetchGoalSummaries,
    isLoading: summaryLoading,
  } = useSummaryStore()
  const {
    weeklyFeedback,
    isGeneratingWeekly,
    error: feedbackError,
    fetchWeeklyFeedback,
    generateWeeklyFeedback,
    clearError,
  } = useFeedbackStore()

  const today = todayISO()
  const { weekStart } = getWeekRange(today)

  // 세션 복원 전에는 스토어가 빈손으로 돌아오므로 userId 가 생긴 뒤에 부른다.
  useEffect(() => {
    if (!userId) return
    fetchRecentLogs(30)
    fetchRecentSummaries(30)
    fetchWeeklyFeedback(weekStart)
  }, [userId, fetchRecentLogs, fetchRecentSummaries, fetchWeeklyFeedback, weekStart])

  const startDate = useGoalStore((st) => st.activeGoal?.start_date)
  useEffect(() => {
    if (!userId || !startDate) return
    fetchGoalSummaries(startDate)
  }, [userId, startDate, fetchGoalSummaries])

  const isLoading = weightLoading || summaryLoading

  const weightData = useMemo(
    () =>
      [...weightLogs]
        .sort((a, b) => a.weight_date.localeCompare(b.weight_date))
        .map((log) => ({
          date: shortDate(log.weight_date),
          weight: log.weight_kg,
        })),
    [weightLogs]
  )

  const deltaData = useMemo(
    () =>
      // 식사를 기록하지 않은 날은 TDEE 전체가 적자로 보이므로 막대에서 뺀다.
      recentSummaries.filter(isRecordedDay).slice(-7).map((summary) => ({
        date: shortDate(summary.summary_date),
        delta: summary.calorie_delta,
        amount: Math.abs(summary.calorie_delta),
      })),
    [recentSummaries]
  )

  // 목표 기준일부터 식사를 기록한 날만 이어 붙인다.
  const cumulativeData = useMemo(
    () =>
      startDate
        ? cumulativeDeltaSeries(goalSummaries, startDate).map((point) => ({
            date: shortDate(point.date),
            cumulative: point.cumulative,
          }))
        : [],
    [goalSummaries, startDate]
  )

  return (
    <div className="flex flex-col gap-3 p-4 sm:p-6">
      <h1 className="text-xl font-bold">통계</h1>

      {feedbackError && (
        <ErrorBanner message={feedbackError} onDismiss={clearError} />
      )}

      {isLoading ? (
        <>
          <SkeletonCard height={200} />
          <SkeletonCard height={200} />
          <SkeletonCard height={200} />
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                체중 추이 (최근 30일)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weightData.length < 2 ? (
                <EmptyState
                  message={
                    weightData.length === 0
                      ? '체중 기록이 없습니다'
                      : '데이터가 더 필요합니다'
                  }
                  sub="기록 탭에서 체중을 입력해 주세요"
                />
              ) : (
                <WeightTrendChart data={weightData} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                일별 칼로리 적자/초과 (최근 기록 7일)
              </CardTitle>
              <CardAction>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-deficit" />
                    적자
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-surplus" />
                    초과
                  </span>
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              {deltaData.length === 0 ? (
                <EmptyState
                  message="칼로리 기록이 없습니다"
                  sub="기록 탭에서 식사·운동을 추가해 주세요"
                />
              ) : (
                <DeltaBarChart data={deltaData} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                누적 칼로리 적자
                {startDate && ` (${formatDateShort(startDate)}부터)`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cumulativeData.length < 2 ? (
                <EmptyState
                  message="데이터가 충분하지 않습니다"
                  sub="기준일 이후 식사를 기록한 날이 2일 이상 필요합니다"
                />
              ) : (
                <CumulativeDeltaChart data={cumulativeData} />
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            이번 주 AI 피드백
          </CardTitle>
          {weeklyFeedback && (
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => generateWeeklyFeedback(today)}
                disabled={isGeneratingWeekly}
              >
                다시 생성
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {isGeneratingWeekly ? (
            <SkeletonCard rows={4} />
          ) : weeklyFeedback ? (
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {weeklyFeedback.feedback}
            </p>
          ) : (
            <Button
              className="w-full"
              onClick={() => generateWeeklyFeedback(today)}
            >
              <Sparkles />
              주간 AI 피드백 받기
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
