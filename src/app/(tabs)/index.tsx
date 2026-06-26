import { useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { useGoalStore } from '@/stores/goalStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { useFeedbackStore } from '@/stores/feedbackStore'
import { todayISO, formatDate } from '@/utils/date'

export default function HomeScreen() {
  const { user } = useAuthStore()
  const { tdee } = useProfileStore()
  const { activeGoal, daysRemaining, dailyDeficit } = useGoalStore()
  const { todaySummary, isLoading, calculateAndSave } = useSummaryStore()
  const { dailyFeedback, isGenerating, generateDailyFeedback, fetchDailyFeedback } =
    useFeedbackStore()

  const today = todayISO()

  useFocusEffect(
    useCallback(() => {
      calculateAndSave(today)
      fetchDailyFeedback(today)
    }, [calculateAndSave, fetchDailyFeedback, today])
  )

  const refresh = useCallback(async () => {
    await calculateAndSave(today)
  }, [calculateAndSave, today])

  const intake = todaySummary?.total_intake_calories ?? 0
  const exercise = todaySummary?.total_exercise_calories ?? 0
  const net = todaySummary?.net_calories ?? 0
  const delta = todaySummary?.calorie_delta ?? (tdee ?? 0)
  const cumulative = todaySummary?.cumulative_delta ?? 0
  const estimatedLoss = todaySummary?.estimated_weight_change_kg ?? 0

  const targetLoss = activeGoal
    ? activeGoal.start_weight_kg - activeGoal.target_weight_kg
    : 0
  const progressPct =
    targetLoss > 0 ? Math.min(100, Math.max(0, (estimatedLoss / targetLoss) * 100)) : 0

  const isDeltaPositive = delta >= 0

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* 헤더 */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>안녕하세요 👋</Text>
            <Text style={s.email}>{user?.email}</Text>
          </View>
          <Text style={s.date}>{formatDate(today)}</Text>
        </View>

        {isLoading && (
          <ActivityIndicator style={s.loader} size="large" color="#3b82f6" />
        )}

        {/* 오늘 칼로리 카드 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>오늘 칼로리</Text>
          <View style={s.row3}>
            <View style={s.statItem}>
              <Text style={s.statLabel}>섭취</Text>
              <Text style={s.statValue}>{intake.toLocaleString()}</Text>
              <Text style={s.statUnit}>kcal</Text>
            </View>
            <View style={s.divider} />
            <View style={s.statItem}>
              <Text style={s.statLabel}>운동 소모</Text>
              <Text style={[s.statValue, { color: '#10b981' }]}>{exercise.toLocaleString()}</Text>
              <Text style={s.statUnit}>kcal</Text>
            </View>
            <View style={s.divider} />
            <View style={s.statItem}>
              <Text style={s.statLabel}>순 칼로리</Text>
              <Text style={s.statValue}>{net.toLocaleString()}</Text>
              <Text style={s.statUnit}>kcal</Text>
            </View>
          </View>
        </View>

        {/* 오늘 적자/초과 + TDEE 카드 */}
        <View style={s.row2}>
          <View style={[s.card, s.flex1]}>
            <Text style={s.cardTitle}>오늘</Text>
            <Text
              style={[
                s.bigValue,
                { color: isDeltaPositive ? '#10b981' : '#ef4444' },
              ]}
            >
              {isDeltaPositive ? '-' : '+'}
              {Math.abs(delta).toLocaleString()}
            </Text>
            <Text style={s.bigUnit}>kcal {isDeltaPositive ? '적자' : '초과'}</Text>
          </View>

          <View style={[s.card, s.flex1, s.ml8]}>
            <Text style={s.cardTitle}>TDEE</Text>
            <Text style={[s.bigValue, { color: '#6366f1' }]}>
              {(tdee ?? 0).toLocaleString()}
            </Text>
            <Text style={s.bigUnit}>kcal / 일</Text>
            {dailyDeficit !== null && (
              <Text style={s.subNote}>목표 적자 {dailyDeficit.toLocaleString()} kcal</Text>
            )}
          </View>
        </View>

        {/* 목표 진행 카드 */}
        {activeGoal && (
          <View style={s.card}>
            <Text style={s.cardTitle}>목표 진행</Text>

            <View style={s.goalRow}>
              <View style={s.goalItem}>
                <Text style={s.goalLabel}>누적 적자</Text>
                <Text style={[s.goalValue, { color: cumulative >= 0 ? '#10b981' : '#ef4444' }]}>
                  {cumulative >= 0 ? '' : '-'}{Math.abs(cumulative).toLocaleString()} kcal
                </Text>
              </View>
              <View style={s.goalItem}>
                <Text style={s.goalLabel}>예상 감량</Text>
                <Text style={[s.goalValue, { color: '#3b82f6' }]}>
                  {estimatedLoss.toFixed(2)} kg
                </Text>
              </View>
              <View style={s.goalItem}>
                <Text style={s.goalLabel}>남은 기간</Text>
                <Text style={s.goalValue}>
                  {daysRemaining !== null && daysRemaining > 0 ? `${daysRemaining}일` : '-'}
                </Text>
              </View>
            </View>

            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${progressPct}%` as any }]} />
            </View>
            <View style={s.progressLabel}>
              <Text style={s.progressText}>
                {activeGoal.start_weight_kg} kg → {activeGoal.target_weight_kg} kg
              </Text>
              <Text style={s.progressText}>{progressPct.toFixed(1)}%</Text>
            </View>
          </View>
        )}

        {/* AI 피드백 카드 */}
        <View style={s.card}>
          <View style={s.feedbackHeader}>
            <Text style={s.cardTitle}>오늘의 AI 피드백</Text>
            {dailyFeedback && (
              <TouchableOpacity
                onPress={() => generateDailyFeedback(today)}
                disabled={isGenerating}
              >
                <Text style={[s.regenBtn, isGenerating && { opacity: 0.4 }]}>다시 생성</Text>
              </TouchableOpacity>
            )}
          </View>
          {dailyFeedback ? (
            <Text style={s.feedbackText}>{dailyFeedback.feedback}</Text>
          ) : (
            <TouchableOpacity
              style={[s.feedbackBtn, isGenerating && s.feedbackBtnDisabled]}
              onPress={() => generateDailyFeedback(today)}
              disabled={isGenerating}
            >
              <Text style={s.feedbackBtnText}>
                {isGenerating ? '피드백 생성 중...' : '✨ AI 피드백 받기'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 새로고침 */}
        <TouchableOpacity style={s.refreshBtn} onPress={refresh} disabled={isLoading}>
          <Text style={s.refreshBtnText}>새로고침</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 20, paddingBottom: 40 },
  loader: { marginVertical: 16 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: { fontSize: 20, fontWeight: '700', color: '#111' },
  email: { fontSize: 13, color: '#888', marginTop: 2 },
  date: { fontSize: 13, color: '#888', marginTop: 4 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 12 },

  row3: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111' },
  statUnit: { fontSize: 11, color: '#aaa', marginTop: 2 },
  divider: { width: 1, height: 40, backgroundColor: '#f0f0f0' },

  row2: { flexDirection: 'row', marginBottom: 0 },
  flex1: { flex: 1 },
  ml8: { marginLeft: 8 },

  bigValue: { fontSize: 28, fontWeight: '800', marginBottom: 2 },
  bigUnit: { fontSize: 12, color: '#888' },
  subNote: { fontSize: 11, color: '#aaa', marginTop: 6 },

  goalRow: { flexDirection: 'row', marginBottom: 14 },
  goalItem: { flex: 1, alignItems: 'center' },
  goalLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  goalValue: { fontSize: 16, fontWeight: '700', color: '#111' },

  progressBg: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: { height: 8, backgroundColor: '#3b82f6', borderRadius: 4 },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 12, color: '#888' },

  feedbackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  regenBtn: { fontSize: 12, color: '#6366f1', fontWeight: '600' },
  feedbackText: { fontSize: 14, color: '#333', lineHeight: 22, marginTop: 4 },
  feedbackBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  feedbackBtnDisabled: { opacity: 0.5 },
  feedbackBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  refreshBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  refreshBtnText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
})
