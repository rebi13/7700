import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import { goalSchema, type GoalFormData } from '@/schemas/onboarding'
import { useGoalStore } from '@/stores/goalStore'
import { useProfileStore } from '@/stores/profileStore'
import { calculateDailyDeficit, calculateTDEE, calculateBMR } from '@/utils/calculations'
import { getDaysRemaining, todayISO } from '@/utils/date'

export default function GoalScreen() {
  const router = useRouter()
  const { createGoal, isLoading, error } = useGoalStore()
  const { profile, tdee } = useProfileStore()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
  })

  const targetWeightKg = useWatch({ control, name: 'targetWeightKg' })
  const targetDate = useWatch({ control, name: 'targetDate' })

  const currentWeight = profile?.current_weight_kg ?? 0

  const lossKg =
    targetWeightKg && currentWeight ? +(currentWeight - targetWeightKg).toFixed(1) : null

  const daysLeft =
    targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)
      ? getDaysRemaining(targetDate)
      : null

  const dailyDeficit =
    lossKg && daysLeft && daysLeft > 0
      ? calculateDailyDeficit({
          startWeightKg: currentWeight,
          targetWeightKg,
          targetDate,
        })
      : null

  const recommendedIntake =
    tdee && dailyDeficit ? tdee - dailyDeficit : null

  const onSubmit = async (data: GoalFormData) => {
    await createGoal({
      start_weight_kg: currentWeight,
      target_weight_kg: data.targetWeightKg,
      start_date: todayISO(),
      target_date: data.targetDate,
    })
    if (!useGoalStore.getState().error) {
      router.replace('/(tabs)')
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>목표 설정</Text>
        <Text style={styles.subtitle}>목표 체중과 달성 기간을 입력해 주세요</Text>

        {/* 목표 체중 */}
        <View style={styles.field}>
          <Text style={styles.label}>목표 체중 (kg)</Text>
          <Controller
            control={control}
            name="targetWeightKg"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.targetWeightKg && styles.inputError]}
                placeholder="예: 65"
                keyboardType="numeric"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value?.toString() ?? ''}
              />
            )}
          />
          {errors.targetWeightKg && (
            <Text style={styles.fieldError}>{errors.targetWeightKg.message}</Text>
          )}
        </View>

        {/* 목표일 */}
        <View style={styles.field}>
          <Text style={styles.label}>목표일</Text>
          <Controller
            control={control}
            name="targetDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.targetDate && styles.inputError]}
                placeholder="YYYY-MM-DD (예: 2026-12-31)"
                keyboardType="numeric"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value ?? ''}
              />
            )}
          />
          {errors.targetDate && (
            <Text style={styles.fieldError}>{errors.targetDate.message}</Text>
          )}
        </View>

        {/* 자동 계산 결과 */}
        {(lossKg !== null || daysLeft !== null) && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>자동 계산 결과</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>감량 목표</Text>
              <Text style={styles.summaryVal}>
                {lossKg !== null ? `${lossKg} kg` : '-'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>남은 기간</Text>
              <Text style={styles.summaryVal}>
                {daysLeft !== null && daysLeft > 0 ? `${daysLeft}일` : '-'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>하루 필요 적자</Text>
              <Text style={[styles.summaryVal, dailyDeficit && dailyDeficit > 1000 && styles.summaryWarn]}>
                {dailyDeficit !== null ? `${dailyDeficit} kcal` : '-'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>일일 섭취 권장</Text>
              <Text style={styles.summaryVal}>
                {recommendedIntake !== null ? `${recommendedIntake} kcal` : '-'}
              </Text>
            </View>
            {dailyDeficit !== null && dailyDeficit > 1000 && (
              <Text style={styles.warnText}>
                ⚠️ 하루 적자가 1000 kcal를 초과합니다. 목표일을 늘리는 것을 권장합니다.
              </Text>
            )}
          </View>
        )}

        {error && <Text style={styles.serverError}>{error}</Text>}

        <TouchableOpacity
          style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          <Text style={styles.submitBtnText}>{isLoading ? '저장 중...' : '시작하기'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 32 },
  field: { marginBottom: 24 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputError: { borderColor: '#ef4444' },
  fieldError: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  serverError: { color: '#ef4444', textAlign: 'center', marginBottom: 12 },
  summaryBox: {
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 12 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryKey: { fontSize: 14, color: '#555' },
  summaryVal: { fontSize: 14, fontWeight: '600', color: '#333' },
  summaryWarn: { color: '#ef4444' },
  warnText: { fontSize: 12, color: '#ef4444', marginTop: 8, lineHeight: 18 },
  submitBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
