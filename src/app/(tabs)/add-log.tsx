import { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SafeAreaView } from 'react-native-safe-area-context'
import { mealSchema, type MealFormData } from '@/schemas/meal'
import { exerciseSchema, type ExerciseFormData } from '@/schemas/exercise'
import { weightSchema, type WeightFormData } from '@/schemas/weight'
import { useMealStore } from '@/stores/mealStore'
import { useExerciseStore } from '@/stores/exerciseStore'
import { useWeightStore } from '@/stores/weightStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { todayISO } from '@/utils/date'
import type { MealType, MeasuredTiming } from '@/types/database'

type TabType = 'meal' | 'exercise' | 'weight'

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '아침' },
  { value: 'lunch', label: '점심' },
  { value: 'dinner', label: '저녁' },
  { value: 'snack', label: '간식' },
  { value: 'late_night', label: '야식' },
]

const MEASURED_TIMINGS: { value: MeasuredTiming; label: string }[] = [
  { value: 'morning', label: '기상 직후' },
  { value: 'afternoon', label: '오후' },
  { value: 'evening', label: '저녁' },
  { value: 'after_workout', label: '운동 후' },
  { value: 'other', label: '기타' },
]

// ─── 식사 폼 ─────────────────────────────────────────────────────────────────

function MealForm({ date }: { date: string }) {
  const { addLog, isLoading } = useMealStore()
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MealFormData>({
    resolver: zodResolver(mealSchema),
    defaultValues: { meal_date: date, meal_type: undefined },
  })
  const selectedMealType = watch('meal_type')

  const onSubmit = async (data: MealFormData) => {
    await addLog({ ...data, meal_date: date })
    const store = useMealStore.getState()
    if (!store.error) {
      await useSummaryStore.getState().calculateAndSave(date)
      reset({ meal_date: date, meal_type: undefined })
      Alert.alert('저장 완료', '식사 기록이 저장되었습니다.')
    } else {
      Alert.alert('오류', store.error)
    }
  }

  return (
    <View>
      <Text style={s.label}>식사 종류 *</Text>
      <View style={s.row}>
        {MEAL_TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[s.chip, selectedMealType === t.value && s.chipActive]}
            onPress={() => setValue('meal_type', t.value, { shouldValidate: true })}
          >
            <Text style={[s.chipText, selectedMealType === t.value && s.chipTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.meal_type && <Text style={s.error}>{errors.meal_type.message}</Text>}

      <Text style={s.label}>음식 이름 *</Text>
      <Controller
        control={control}
        name="food_name"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            style={s.input}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="예: 비빔밥"
            returnKeyType="next"
          />
        )}
      />
      {errors.food_name && <Text style={s.error}>{errors.food_name.message}</Text>}

      <Text style={s.label}>칼로리 (kcal) *</Text>
      <Controller
        control={control}
        name="calories"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            style={s.input}
            value={value?.toString() ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="예: 550"
            keyboardType="number-pad"
            returnKeyType="next"
          />
        )}
      />
      {errors.calories && <Text style={s.error}>{errors.calories.message}</Text>}

      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>단백질 (g)</Text>
          <Controller
            control={control}
            name="protein_g"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={s.input}
                value={value?.toString() ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            )}
          />
        </View>
        <View style={[{ flex: 1 }, s.mx4]}>
          <Text style={s.label}>탄수화물 (g)</Text>
          <Controller
            control={control}
            name="carbs_g"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={s.input}
                value={value?.toString() ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            )}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>지방 (g)</Text>
          <Controller
            control={control}
            name="fat_g"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={s.input}
                value={value?.toString() ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            )}
          />
        </View>
      </View>

      <Text style={s.label}>메모</Text>
      <Controller
        control={control}
        name="memo"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            style={[s.input, s.multiline]}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="선택사항"
            multiline
            numberOfLines={2}
          />
        )}
      />

      <TouchableOpacity
        style={[s.submitBtn, isLoading && s.btnDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
      >
        <Text style={s.submitBtnText}>{isLoading ? '저장 중...' : '저장'}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── 운동 폼 ─────────────────────────────────────────────────────────────────

function ExerciseForm({ date }: { date: string }) {
  const { addLog, isLoading } = useExerciseStore()
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: { exercise_date: date },
  })

  const onSubmit = async (data: ExerciseFormData) => {
    await addLog({ ...data, exercise_date: date })
    const store = useExerciseStore.getState()
    if (!store.error) {
      await useSummaryStore.getState().calculateAndSave(date)
      reset({ exercise_date: date })
      Alert.alert('저장 완료', '운동 기록이 저장되었습니다.')
    } else {
      Alert.alert('오류', store.error)
    }
  }

  return (
    <View>
      <Text style={s.label}>운동 이름 *</Text>
      <Controller
        control={control}
        name="exercise_name"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            style={s.input}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="예: 러닝"
            returnKeyType="next"
          />
        )}
      />
      {errors.exercise_name && <Text style={s.error}>{errors.exercise_name.message}</Text>}

      <Text style={s.label}>소모 칼로리 (kcal) *</Text>
      <Controller
        control={control}
        name="calories_burned"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            style={s.input}
            value={value?.toString() ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="예: 300"
            keyboardType="number-pad"
            returnKeyType="next"
          />
        )}
      />
      {errors.calories_burned && <Text style={s.error}>{errors.calories_burned.message}</Text>}

      <Text style={s.label}>운동 시간 (분)</Text>
      <Controller
        control={control}
        name="duration_minutes"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            style={s.input}
            value={value?.toString() ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="예: 30"
            keyboardType="number-pad"
            returnKeyType="next"
          />
        )}
      />
      {errors.duration_minutes && <Text style={s.error}>{errors.duration_minutes.message}</Text>}

      <Text style={s.label}>메모</Text>
      <Controller
        control={control}
        name="memo"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            style={[s.input, s.multiline]}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="선택사항"
            multiline
            numberOfLines={2}
          />
        )}
      />

      <TouchableOpacity
        style={[s.submitBtn, isLoading && s.btnDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
      >
        <Text style={s.submitBtnText}>{isLoading ? '저장 중...' : '저장'}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── 체중 폼 ─────────────────────────────────────────────────────────────────

function WeightForm({ date }: { date: string }) {
  const { addLog, isLoading } = useWeightStore()
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WeightFormData>({
    resolver: zodResolver(weightSchema),
    defaultValues: { weight_date: date, measured_timing: null },
  })
  const selectedTiming = watch('measured_timing')

  const onSubmit = async (data: WeightFormData) => {
    await addLog({ ...data, weight_date: date })
    const store = useWeightStore.getState()
    if (!store.error) {
      reset({ weight_date: date, measured_timing: null })
      Alert.alert('저장 완료', '체중 기록이 저장되었습니다.')
    } else {
      Alert.alert('오류', store.error)
    }
  }

  return (
    <View>
      <Text style={s.label}>체중 (kg) *</Text>
      <Controller
        control={control}
        name="weight_kg"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            style={s.input}
            value={value?.toString() ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="예: 68.5"
            keyboardType="decimal-pad"
            returnKeyType="next"
          />
        )}
      />
      {errors.weight_kg && <Text style={s.error}>{errors.weight_kg.message}</Text>}

      <Text style={s.label}>측정 시간대</Text>
      <View style={s.row}>
        {MEASURED_TIMINGS.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[s.chip, selectedTiming === t.value && s.chipActive]}
            onPress={() =>
              setValue('measured_timing', selectedTiming === t.value ? null : t.value, {
                shouldValidate: true,
              })
            }
          >
            <Text style={[s.chipText, selectedTiming === t.value && s.chipTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>메모</Text>
      <Controller
        control={control}
        name="memo"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            style={[s.input, s.multiline]}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="선택사항"
            multiline
            numberOfLines={2}
          />
        )}
      />

      <TouchableOpacity
        style={[s.submitBtn, isLoading && s.btnDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
      >
        <Text style={s.submitBtnText}>{isLoading ? '저장 중...' : '저장'}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── 메인 화면 ───────────────────────────────────────────────────────────────

export default function AddLogScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('meal')
  const [selectedDate, setSelectedDate] = useState(todayISO())

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab)
  }, [])

  const TABS: { value: TabType; label: string }[] = [
    { value: 'meal', label: '식사' },
    { value: 'exercise', label: '운동' },
    { value: 'weight', label: '체중' },
  ]

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>기록 추가</Text>

          <Text style={s.label}>날짜</Text>
          <TextInput
            style={s.input}
            value={selectedDate}
            onChangeText={setSelectedDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />

          <View style={s.tabRow}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[s.tabBtn, activeTab === t.value && s.tabBtnActive]}
                onPress={() => handleTabChange(t.value)}
              >
                <Text style={[s.tabBtnText, activeTab === t.value && s.tabBtnTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.formContainer}>
            {activeTab === 'meal' && <MealForm date={selectedDate} />}
            {activeTab === 'exercise' && <ExerciseForm date={selectedDate} />}
            {activeTab === 'weight' && <WeightForm date={selectedDate} />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex1: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 20 },

  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fafafa',
  },
  multiline: { height: 64, textAlignVertical: 'top' },
  error: { fontSize: 12, color: '#ef4444', marginTop: 4 },

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  mx4: { marginHorizontal: 4 },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { fontSize: 13, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  tabRow: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    padding: 4,
    marginTop: 20,
    marginBottom: 8,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabBtnText: { fontSize: 14, color: '#888', fontWeight: '500' },
  tabBtnTextActive: { color: '#111', fontWeight: '700' },

  formContainer: { marginTop: 4 },

  submitBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
