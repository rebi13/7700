import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Modal,
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
import { useAiStore } from '@/stores/aiStore'
import type { EstimateResult } from '@/stores/aiStore'
import { todayISO } from '@/utils/date'
import type { MealType, MeasuredTiming, MealLogRow, ExerciseLogRow, WeightLogRow } from '@/types/database'

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

const CONFIDENCE_COLOR: Record<EstimateResult['confidence'], string> = {
  high: '#10b981',
  medium: '#f59e0b',
  low: '#ef4444',
}
const CONFIDENCE_LABEL: Record<EstimateResult['confidence'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
}

function MealForm({ date }: { date: string }) {
  const { addLog, isLoading } = useMealStore()
  const { estimateCalories, isEstimating } = useAiStore()
  const [aiNote, setAiNote] = useState<{ text: string; confidence: EstimateResult['confidence'] } | null>(null)
  const aiFilledCalories = useRef<number | null>(null)

  const foodNameRef = useRef<TextInput>(null)
  const caloriesRef = useRef<TextInput>(null)
  const proteinRef = useRef<TextInput>(null)
  const carbsRef = useRef<TextInput>(null)
  const fatRef = useRef<TextInput>(null)
  const memoRef = useRef<TextInput>(null)

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
  const foodName = watch('food_name')

  const handleAiEstimate = useCallback(async () => {
    if (!foodName) return
    const result = await estimateCalories(foodName, selectedMealType)
    if (!result) {
      Alert.alert('AI 추정 실패', 'AI 추정에 실패했습니다. 직접 입력해 주세요.')
      return
    }
    aiFilledCalories.current = result.calories
    setValue('calories', result.calories, { shouldValidate: true })
    if (result.protein_g != null) setValue('protein_g', result.protein_g)
    if (result.carbs_g != null) setValue('carbs_g', result.carbs_g)
    if (result.fat_g != null) setValue('fat_g', result.fat_g)
    setAiNote({ text: result.note, confidence: result.confidence })
    caloriesRef.current?.focus()
  }, [foodName, selectedMealType, estimateCalories, setValue])

  const onSubmit = async (data: MealFormData) => {
    Keyboard.dismiss()
    await addLog({ ...data, meal_date: date })
    const store = useMealStore.getState()
    if (!store.error) {
      await useSummaryStore.getState().calculateAndSave(date)
      reset({ meal_date: date, meal_type: undefined })
      setAiNote(null)
      aiFilledCalories.current = null
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
            ref={foodNameRef}
            style={s.input}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="예: 비빔밥"
            returnKeyType="next"
            onSubmitEditing={() => caloriesRef.current?.focus()}
          />
        )}
      />
      {errors.food_name && <Text style={s.error}>{errors.food_name.message}</Text>}

      <TouchableOpacity
        style={[s.aiBtn, (!foodName || isEstimating) && s.aiBtnDisabled]}
        onPress={handleAiEstimate}
        disabled={!foodName || isEstimating}
      >
        <Text style={s.aiBtnText}>{isEstimating ? '추정 중...' : 'AI 칼로리 추정'}</Text>
      </TouchableOpacity>

      <Text style={s.label}>칼로리 (kcal) *</Text>
      <Controller
        control={control}
        name="calories"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            ref={caloriesRef}
            style={s.input}
            value={value?.toString() ?? ''}
            onChangeText={(v) => {
              onChange(v)
              if (aiFilledCalories.current !== null && Number(v) !== aiFilledCalories.current) {
                setAiNote(null)
                aiFilledCalories.current = null
              }
            }}
            onBlur={onBlur}
            placeholder="예: 550"
            keyboardType="number-pad"
            returnKeyType="next"
            onSubmitEditing={() => proteinRef.current?.focus()}
          />
        )}
      />

      {aiNote && (
        <View style={s.aiNote}>
          <Text style={[s.aiNoteConfidence, { color: CONFIDENCE_COLOR[aiNote.confidence] }]}>
            ✓ AI 추정  신뢰도: {CONFIDENCE_LABEL[aiNote.confidence]}
          </Text>
          <Text style={s.aiNoteText}>{aiNote.text}</Text>
        </View>
      )}
      {errors.calories && <Text style={s.error}>{errors.calories.message}</Text>}

      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>단백질 (g)</Text>
          <Controller
            control={control}
            name="protein_g"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                ref={proteinRef}
                style={s.input}
                value={value?.toString() ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="0"
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => carbsRef.current?.focus()}
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
                ref={carbsRef}
                style={s.input}
                value={value?.toString() ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="0"
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => fatRef.current?.focus()}
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
                ref={fatRef}
                style={s.input}
                value={value?.toString() ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="0"
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => memoRef.current?.focus()}
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
            ref={memoRef}
            style={[s.input, s.multiline]}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="선택사항"
            multiline
            numberOfLines={2}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
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

  const exerciseNameRef = useRef<TextInput>(null)
  const caloriesBurnedRef = useRef<TextInput>(null)
  const durationRef = useRef<TextInput>(null)
  const memoRef = useRef<TextInput>(null)

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
    Keyboard.dismiss()
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
            ref={exerciseNameRef}
            style={s.input}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="예: 러닝"
            returnKeyType="next"
            onSubmitEditing={() => caloriesBurnedRef.current?.focus()}
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
            ref={caloriesBurnedRef}
            style={s.input}
            value={value?.toString() ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="예: 300"
            keyboardType="number-pad"
            returnKeyType="next"
            onSubmitEditing={() => durationRef.current?.focus()}
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
            ref={durationRef}
            style={s.input}
            value={value?.toString() ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="예: 30"
            keyboardType="number-pad"
            returnKeyType="next"
            onSubmitEditing={() => memoRef.current?.focus()}
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
            ref={memoRef}
            style={[s.input, s.multiline]}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="선택사항"
            multiline
            numberOfLines={2}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
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

  const weightRef = useRef<TextInput>(null)
  const memoRef = useRef<TextInput>(null)

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
    Keyboard.dismiss()
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
            ref={weightRef}
            style={s.input}
            value={value?.toString() ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="예: 68.5"
            keyboardType="decimal-pad"
            returnKeyType="next"
            onSubmitEditing={() => memoRef.current?.focus()}
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
            ref={memoRef}
            style={[s.input, s.multiline]}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="선택사항"
            multiline
            numberOfLines={2}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
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

// ─── 식사 수정 모달 ───────────────────────────────────────────────────────────

function MealEditModal({
  item,
  date,
  onClose,
}: {
  item: MealLogRow | null
  date: string
  onClose: () => void
}) {
  const { updateLog, fetchLogs, isLoading } = useMealStore()
  const { calculateAndSave } = useSummaryStore()

  const foodNameRef = useRef<TextInput>(null)
  const caloriesRef = useRef<TextInput>(null)
  const proteinRef = useRef<TextInput>(null)
  const carbsRef = useRef<TextInput>(null)
  const fatRef = useRef<TextInput>(null)
  const memoRef = useRef<TextInput>(null)

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<MealFormData>({ resolver: zodResolver(mealSchema) })
  const selectedMealType = watch('meal_type')

  useEffect(() => {
    if (item) {
      reset({
        food_name: item.food_name,
        calories: item.calories,
        meal_type: item.meal_type ?? undefined,
        meal_date: item.meal_date,
        protein_g: item.protein_g ?? undefined,
        carbs_g: item.carbs_g ?? undefined,
        fat_g: item.fat_g ?? undefined,
        memo: item.memo ?? undefined,
      })
    }
  }, [item, reset])

  const onSubmit = async (data: MealFormData) => {
    if (!item) return
    Keyboard.dismiss()
    await updateLog(item.id, {
      food_name: data.food_name,
      calories: data.calories,
      meal_type: data.meal_type,
      protein_g: data.protein_g ?? null,
      carbs_g: data.carbs_g ?? null,
      fat_g: data.fat_g ?? null,
      memo: data.memo ?? null,
    })
    await fetchLogs(date)
    await calculateAndSave(date)
    onClose()
  }

  return (
    <Modal visible={!!item} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={em.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={em.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={em.cancel}>취소</Text>
            </TouchableOpacity>
            <Text style={em.title}>식사 수정</Text>
            <TouchableOpacity onPress={handleSubmit(onSubmit)} disabled={isLoading}>
              <Text style={[em.save, isLoading && { opacity: 0.4 }]}>
                {isLoading ? '저장 중' : '저장'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={em.scroll} keyboardShouldPersistTaps="handled">
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
            <Controller control={control} name="food_name"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  ref={foodNameRef}
                  style={s.input}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  returnKeyType="next"
                  onSubmitEditing={() => caloriesRef.current?.focus()}
                />
              )}
            />
            {errors.food_name && <Text style={s.error}>{errors.food_name.message}</Text>}

            <Text style={s.label}>칼로리 (kcal) *</Text>
            <Controller control={control} name="calories"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  ref={caloriesRef}
                  style={s.input}
                  value={value?.toString() ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => proteinRef.current?.focus()}
                />
              )}
            />
            {errors.calories && <Text style={s.error}>{errors.calories.message}</Text>}

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>단백질 (g)</Text>
                <Controller control={control} name="protein_g"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                      ref={proteinRef}
                      style={s.input}
                      value={value?.toString() ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      returnKeyType="next"
                      onSubmitEditing={() => carbsRef.current?.focus()}
                    />
                  )}
                />
              </View>
              <View style={[{ flex: 1 }, s.mx4]}>
                <Text style={s.label}>탄수화물 (g)</Text>
                <Controller control={control} name="carbs_g"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                      ref={carbsRef}
                      style={s.input}
                      value={value?.toString() ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      returnKeyType="next"
                      onSubmitEditing={() => fatRef.current?.focus()}
                    />
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>지방 (g)</Text>
                <Controller control={control} name="fat_g"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                      ref={fatRef}
                      style={s.input}
                      value={value?.toString() ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      returnKeyType="next"
                      onSubmitEditing={() => memoRef.current?.focus()}
                    />
                  )}
                />
              </View>
            </View>

            <Text style={s.label}>메모</Text>
            <Controller control={control} name="memo"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  ref={memoRef}
                  style={[s.input, s.multiline]}
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline
                  numberOfLines={2}
                  placeholder="선택사항"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              )}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

// ─── 운동 수정 모달 ───────────────────────────────────────────────────────────

function ExerciseEditModal({
  item,
  date,
  onClose,
}: {
  item: ExerciseLogRow | null
  date: string
  onClose: () => void
}) {
  const { updateLog, fetchLogs, isLoading } = useExerciseStore()
  const { calculateAndSave } = useSummaryStore()

  const exerciseNameRef = useRef<TextInput>(null)
  const caloriesBurnedRef = useRef<TextInput>(null)
  const durationRef = useRef<TextInput>(null)
  const memoRef = useRef<TextInput>(null)

  const { control, handleSubmit, reset, formState: { errors } } =
    useForm<ExerciseFormData>({ resolver: zodResolver(exerciseSchema) })

  useEffect(() => {
    if (item) {
      reset({
        exercise_name: item.exercise_name,
        calories_burned: item.calories_burned,
        duration_minutes: item.duration_minutes ?? undefined,
        exercise_date: item.exercise_date,
        memo: item.memo ?? undefined,
      })
    }
  }, [item, reset])

  const onSubmit = async (data: ExerciseFormData) => {
    if (!item) return
    Keyboard.dismiss()
    await updateLog(item.id, {
      exercise_name: data.exercise_name,
      calories_burned: data.calories_burned,
      duration_minutes: data.duration_minutes ?? null,
      memo: data.memo ?? null,
    })
    await fetchLogs(date)
    await calculateAndSave(date)
    onClose()
  }

  return (
    <Modal visible={!!item} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={em.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={em.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={em.cancel}>취소</Text>
            </TouchableOpacity>
            <Text style={em.title}>운동 수정</Text>
            <TouchableOpacity onPress={handleSubmit(onSubmit)} disabled={isLoading}>
              <Text style={[em.save, isLoading && { opacity: 0.4 }]}>
                {isLoading ? '저장 중' : '저장'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={em.scroll} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>운동 이름 *</Text>
            <Controller control={control} name="exercise_name"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  ref={exerciseNameRef}
                  style={s.input}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  returnKeyType="next"
                  onSubmitEditing={() => caloriesBurnedRef.current?.focus()}
                />
              )}
            />
            {errors.exercise_name && <Text style={s.error}>{errors.exercise_name.message}</Text>}

            <Text style={s.label}>소모 칼로리 (kcal) *</Text>
            <Controller control={control} name="calories_burned"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  ref={caloriesBurnedRef}
                  style={s.input}
                  value={value?.toString() ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => durationRef.current?.focus()}
                />
              )}
            />
            {errors.calories_burned && <Text style={s.error}>{errors.calories_burned.message}</Text>}

            <Text style={s.label}>운동 시간 (분)</Text>
            <Controller control={control} name="duration_minutes"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  ref={durationRef}
                  style={s.input}
                  value={value?.toString() ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  placeholder="선택사항"
                  returnKeyType="next"
                  onSubmitEditing={() => memoRef.current?.focus()}
                />
              )}
            />

            <Text style={s.label}>메모</Text>
            <Controller control={control} name="memo"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  ref={memoRef}
                  style={[s.input, s.multiline]}
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline
                  numberOfLines={2}
                  placeholder="선택사항"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              )}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

// ─── 체중 수정 모달 ───────────────────────────────────────────────────────────

function WeightEditModal({
  item,
  date,
  onClose,
}: {
  item: WeightLogRow | null
  date: string
  onClose: () => void
}) {
  const { updateLog, fetchLogs, isLoading } = useWeightStore()

  const weightRef = useRef<TextInput>(null)
  const memoRef = useRef<TextInput>(null)

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<WeightFormData>({ resolver: zodResolver(weightSchema) })
  const selectedTiming = watch('measured_timing')

  useEffect(() => {
    if (item) {
      reset({
        weight_kg: item.weight_kg,
        weight_date: item.weight_date,
        measured_timing: item.measured_timing ?? null,
        memo: item.memo ?? undefined,
      })
    }
  }, [item, reset])

  const onSubmit = async (data: WeightFormData) => {
    if (!item) return
    Keyboard.dismiss()
    await updateLog(item.id, {
      weight_kg: data.weight_kg,
      measured_timing: data.measured_timing ?? null,
      memo: data.memo ?? null,
    })
    await fetchLogs(date)
    onClose()
  }

  return (
    <Modal visible={!!item} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={em.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={em.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={em.cancel}>취소</Text>
            </TouchableOpacity>
            <Text style={em.title}>체중 수정</Text>
            <TouchableOpacity onPress={handleSubmit(onSubmit)} disabled={isLoading}>
              <Text style={[em.save, isLoading && { opacity: 0.4 }]}>
                {isLoading ? '저장 중' : '저장'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={em.scroll} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>체중 (kg) *</Text>
            <Controller control={control} name="weight_kg"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  ref={weightRef}
                  style={s.input}
                  value={value?.toString() ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => memoRef.current?.focus()}
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
            <Controller control={control} name="memo"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  ref={memoRef}
                  style={[s.input, s.multiline]}
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline
                  numberOfLines={2}
                  placeholder="선택사항"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              )}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

// ─── 메인 화면 ───────────────────────────────────────────────────────────────

export default function AddLogScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('meal')
  const [selectedDate, setSelectedDate] = useState(todayISO())

  const mealLogs = useMealStore((st) => st.logs)
  const exerciseLogs = useExerciseStore((st) => st.logs)
  const weightLogs = useWeightStore((st) => st.logs)
  const fetchMealLogs = useMealStore((st) => st.fetchLogs)
  const fetchExerciseLogs = useExerciseStore((st) => st.fetchLogs)
  const fetchWeightLogs = useWeightStore((st) => st.fetchLogs)
  const deleteMealLog = useMealStore((st) => st.deleteLog)
  const deleteExerciseLog = useExerciseStore((st) => st.deleteLog)
  const deleteWeightLog = useWeightStore((st) => st.deleteLog)
  const { calculateAndSave } = useSummaryStore()

  const [editingMeal, setEditingMeal] = useState<MealLogRow | null>(null)
  const [editingExercise, setEditingExercise] = useState<ExerciseLogRow | null>(null)
  const [editingWeight, setEditingWeight] = useState<WeightLogRow | null>(null)

  useEffect(() => {
    if (activeTab === 'meal') fetchMealLogs(selectedDate)
    else if (activeTab === 'exercise') fetchExerciseLogs(selectedDate)
    else if (activeTab === 'weight') fetchWeightLogs(selectedDate)
  }, [activeTab, selectedDate, fetchMealLogs, fetchExerciseLogs, fetchWeightLogs])

  const handleDelete = useCallback((id: string, type: TabType) => {
    Alert.alert('삭제', '이 기록을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          if (type === 'meal') {
            await deleteMealLog(id)
            await calculateAndSave(selectedDate)
          } else if (type === 'exercise') {
            await deleteExerciseLog(id)
            await calculateAndSave(selectedDate)
          } else {
            await deleteWeightLog(id)
          }
        },
      },
    ])
  }, [deleteMealLog, deleteExerciseLog, deleteWeightLog, calculateAndSave, selectedDate])

  const handleTabChange = useCallback((tab: TabType) => {
    Keyboard.dismiss()
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
            style={s.dateInput}
            value={selectedDate}
            onChangeText={setSelectedDate}
            placeholder="YYYY-MM-DD"
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

          <View style={s.listSection}>
            <Text style={s.listTitle}>기록 목록</Text>

            {activeTab === 'meal' && (
              mealLogs.length === 0
                ? <Text style={s.listEmpty}>이 날짜에 식사 기록이 없습니다.</Text>
                : mealLogs.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={s.logRow}
                      onPress={() => setEditingMeal(item)}
                    >
                      <View style={s.logRowLeft}>
                        <Text style={s.logRowName}>{item.food_name}</Text>
                        {item.meal_type && (
                          <Text style={s.logRowSub}>
                            {MEAL_TYPES.find((t) => t.value === item.meal_type)?.label}
                          </Text>
                        )}
                      </View>
                      <View style={s.logRowRight}>
                        <Text style={s.logRowCal}>{item.calories} kcal</Text>
                        <TouchableOpacity
                          style={s.deleteBtn}
                          onPress={() => handleDelete(item.id, 'meal')}
                        >
                          <Text style={s.deleteBtnText}>삭제</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))
            )}

            {activeTab === 'exercise' && (
              exerciseLogs.length === 0
                ? <Text style={s.listEmpty}>이 날짜에 운동 기록이 없습니다.</Text>
                : exerciseLogs.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={s.logRow}
                      onPress={() => setEditingExercise(item)}
                    >
                      <View style={s.logRowLeft}>
                        <Text style={s.logRowName}>{item.exercise_name}</Text>
                        {item.duration_minutes && (
                          <Text style={s.logRowSub}>{item.duration_minutes}분</Text>
                        )}
                      </View>
                      <View style={s.logRowRight}>
                        <Text style={s.logRowCal}>{item.calories_burned} kcal</Text>
                        <TouchableOpacity
                          style={s.deleteBtn}
                          onPress={() => handleDelete(item.id, 'exercise')}
                        >
                          <Text style={s.deleteBtnText}>삭제</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))
            )}

            {activeTab === 'weight' && (
              weightLogs.length === 0
                ? <Text style={s.listEmpty}>이 날짜에 체중 기록이 없습니다.</Text>
                : weightLogs.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={s.logRow}
                      onPress={() => setEditingWeight(item)}
                    >
                      <View style={s.logRowLeft}>
                        <Text style={s.logRowName}>{item.weight_kg} kg</Text>
                        {item.measured_timing && (
                          <Text style={s.logRowSub}>
                            {MEASURED_TIMINGS.find((t) => t.value === item.measured_timing)?.label}
                          </Text>
                        )}
                      </View>
                      <View style={s.logRowRight}>
                        <TouchableOpacity
                          style={s.deleteBtn}
                          onPress={() => handleDelete(item.id, 'weight')}
                        >
                          <Text style={s.deleteBtnText}>삭제</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <MealEditModal
        item={editingMeal}
        date={selectedDate}
        onClose={() => setEditingMeal(null)}
      />
      <ExerciseEditModal
        item={editingExercise}
        date={selectedDate}
        onClose={() => setEditingExercise(null)}
      />
      <WeightEditModal
        item={editingWeight}
        date={selectedDate}
        onClose={() => setEditingWeight(null)}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex1: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 20 },

  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 14 },

  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fafafa',
  },

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

  aiBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#6366f1',
  },
  aiBtnDisabled: { opacity: 0.4 },
  aiBtnText: { fontSize: 13, color: '#fff', fontWeight: '600' },

  aiNote: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  aiNoteConfidence: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  aiNoteText: { fontSize: 12, color: '#555' },

  submitBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  listSection: { marginTop: 24 },
  listTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 10 },
  listEmpty: { fontSize: 14, color: '#aaa', textAlign: 'center', paddingVertical: 12 },

  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logRowLeft: { flex: 1 },
  logRowName: { fontSize: 14, fontWeight: '600', color: '#111' },
  logRowSub: { fontSize: 12, color: '#888', marginTop: 2 },
  logRowRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logRowCal: { fontSize: 14, color: '#555' },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  deleteBtnText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
})

const em = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#111' },
  cancel: { fontSize: 15, color: '#888' },
  save: { fontSize: 15, fontWeight: '700', color: '#3b82f6' },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
})
