import { useEffect, useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { useWeightStore } from '@/stores/weightStore'
import { useSummaryStore } from '@/stores/summaryStore'
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
import { todayISO } from '@/utils/date'
import { getWeekRange } from '../../../supabase/functions/_shared/weekly-feedback.logic'

/** YYYY-MM-DD → M/D */
const shortDate = (iso: string) => iso.slice(5).replace('-', '/')

export function StatsPage() {
  const {
    logs: weightLogs,
    fetchRecentLogs,
    isLoading: weightLoading,
  } = useWeightStore()
  const {
    recentSummaries,
    fetchRecentSummaries,
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

  useEffect(() => {
    fetchRecentLogs(30)
    fetchRecentSummaries(30)
    fetchWeeklyFeedback(weekStart)
  }, [fetchRecentLogs, fetchRecentSummaries, fetchWeeklyFeedback, weekStart])

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
      recentSummaries.slice(-7).map((summary) => ({
        date: shortDate(summary.summary_date),
        delta: summary.calorie_delta,
        amount: Math.abs(summary.calorie_delta),
      })),
    [recentSummaries]
  )

  const cumulativeData = useMemo(
    () =>
      recentSummaries.map((summary) => ({
        date: shortDate(summary.summary_date),
        cumulative: summary.cumulative_delta,
      })),
    [recentSummaries]
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
                일별 칼로리 적자/초과 (최근 7일)
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
                누적 칼로리 적자 (최근 30일)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cumulativeData.length < 2 ? (
                <EmptyState
                  message="데이터가 충분하지 않습니다"
                  sub="2일 이상의 기록이 필요합니다"
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
