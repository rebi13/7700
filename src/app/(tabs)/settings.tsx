import { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { useGoalStore } from '@/stores/goalStore'
import { useWeightStore } from '@/stores/weightStore'
import { useSummaryStore } from '@/stores/summaryStore'
import {
  profileSchema,
  goalSchema,
  type ProfileFormData,
  type GoalFormData,
} from '@/schemas/onboarding'
import { SkeletonCard } from '@/components/SkeletonCard'
import { ErrorBanner } from '@/components/ErrorBanner'
import { todayISO } from '@/utils/date'
import type { Gender, ActivityLevel } from '@/types/database'

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const GENDER_LABEL: Record<Gender, string> = { male: '남성', female: '여성', other: '기타' }
const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'other', label: '기타' },
]

const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: '비활동적',
  light: '가벼운 활동',
  moderate: '보통 활동',
  active: '활발한 활동',
  very_active: '매우 활발',
}
const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: '비활동적' },
  { value: 'light', label: '가벼운 활동' },
  { value: 'moderate', label: '보통' },
  { value: 'active', label: '활발' },
  { value: 'very_active', label: '매우 활발' },
]

// ─── 프로필 수정 모달 ──────────────────────────────────────────────────────────

function ProfileEditModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { profile, updateProfile, isLoading, error, clearError } = useProfileStore()
  const { addLog } = useWeightStore()
  const { calculateAndSave } = useSummaryStore()

  const heightRef = useRef<TextInput>(null)
  const weightRef = useRef<TextInput>(null)

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({ resolver: zodResolver(profileSchema) })

  const selectedGender = watch('gender')
  const selectedActivity = watch('activityLevel')

  useEffect(() => {
    if (visible && profile) {
      clearError()
      reset({
        heightCm: profile.height_cm,
        currentWeightKg: profile.current_weight_kg,
        birthDate: profile.birth_date,
        gender: profile.gender ?? undefined,
        activityLevel: profile.activity_level ?? undefined,
      })
    }
  }, [visible, profile, reset, clearError])

  const onSubmit = async (data: ProfileFormData) => {
    Keyboard.dismiss()
    const prevWeight = profile?.current_weight_kg
    await updateProfile({
      height_cm: data.heightCm,
      current_weight_kg: data.currentWeightKg,
      birth_date: data.birthDate,
      gender: data.gender,
      activity_level: data.activityLevel,
    })
    if (useProfileStore.getState().error) return

    if (prevWeight !== data.currentWeightKg) {
      await addLog({
        weight_kg: data.currentWeightKg,
        weight_date: todayISO(),
        measured_timing: null,
        memo: '프로필에서 수정',
      })
      await calculateAndSave(todayISO())
    }
    onClose()
    Alert.alert('저장 완료', '프로필이 업데이트되었습니다.')
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={ms.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={ms.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={ms.cancel}>취소</Text>
            </TouchableOpacity>
            <Text style={ms.headerTitle}>프로필 수정</Text>
            <TouchableOpacity onPress={handleSubmit(onSubmit)} disabled={isLoading}>
              <Text style={[ms.save, isLoading && { opacity: 0.4 }]}>
                {isLoading ? '저장 중' : '저장'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={ms.scroll} keyboardShouldPersistTaps="handled">
            {error && <ErrorBanner message={error} onDismiss={clearError} />}

            <Text style={ms.label}>키 (cm) *</Text>
            <Controller
              control={control}
              name="heightCm"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  ref={heightRef}
                  style={ms.input}
                  value={value?.toString() ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  placeholder="예: 175"
                  returnKeyType="next"
                  onSubmitEditing={() => weightRef.current?.focus()}
                />
              )}
            />
            {errors.heightCm && <Text style={ms.error}>{errors.heightCm.message}</Text>}

            <Text style={ms.label}>현재 체중 (kg) *</Text>
            <Controller
              control={control}
              name="currentWeightKg"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  ref={weightRef}
                  style={ms.input}
                  value={value?.toString() ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="decimal-pad"
                  placeholder="예: 70.5"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              )}
            />
            {errors.currentWeightKg && (
              <Text style={ms.error}>{errors.currentWeightKg.message}</Text>
            )}

            <Text style={ms.label}>생년월일 *</Text>
            <Controller
              control={control}
              name="birthDate"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  style={ms.input}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="YYYY-MM-DD"
                  returnKeyType="done"
                />
              )}
            />
            {errors.birthDate && <Text style={ms.error}>{errors.birthDate.message}</Text>}

            <Text style={ms.label}>성별 *</Text>
            <View style={ms.row}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  style={[ms.chip, selectedGender === g.value && ms.chipActive]}
                  onPress={() => setValue('gender', g.value, { shouldValidate: true })}
                >
                  <Text style={[ms.chipText, selectedGender === g.value && ms.chipTextActive]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.gender && <Text style={ms.error}>{errors.gender.message}</Text>}

            <Text style={ms.label}>활동 수준 *</Text>
            <View style={ms.row}>
              {ACTIVITY_LEVELS.map((a) => (
                <TouchableOpacity
                  key={a.value}
                  style={[ms.chip, selectedActivity === a.value && ms.chipActive]}
                  onPress={() => setValue('activityLevel', a.value, { shouldValidate: true })}
                >
                  <Text style={[ms.chipText, selectedActivity === a.value && ms.chipTextActive]}>
                    {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.activityLevel && <Text style={ms.error}>{errors.activityLevel.message}</Text>}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

// ─── 목표 수정 모달 ────────────────────────────────────────────────────────────

function GoalEditModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { activeGoal, updateGoal, isLoading, error, clearError } = useGoalStore()

  const targetWeightRef = useRef<TextInput>(null)

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<GoalFormData>({ resolver: zodResolver(goalSchema) })

  useEffect(() => {
    if (visible && activeGoal) {
      clearError()
      reset({
        targetWeightKg: activeGoal.target_weight_kg,
        targetDate: activeGoal.target_date,
      })
    }
  }, [visible, activeGoal, reset, clearError])

  const onSubmit = async (data: GoalFormData) => {
    Keyboard.dismiss()
    await updateGoal({
      target_weight_kg: data.targetWeightKg,
      target_date: data.targetDate,
    })
    if (useGoalStore.getState().error) return
    onClose()
    Alert.alert('저장 완료', '목표가 업데이트되었습니다.')
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={ms.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={ms.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={ms.cancel}>취소</Text>
            </TouchableOpacity>
            <Text style={ms.headerTitle}>목표 수정</Text>
            <TouchableOpacity onPress={handleSubmit(onSubmit)} disabled={isLoading}>
              <Text style={[ms.save, isLoading && { opacity: 0.4 }]}>
                {isLoading ? '저장 중' : '저장'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={ms.scroll} keyboardShouldPersistTaps="handled">
            {error && <ErrorBanner message={error} onDismiss={clearError} />}

            <Text style={ms.label}>목표 체중 (kg) *</Text>
            <Controller
              control={control}
              name="targetWeightKg"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  ref={targetWeightRef}
                  style={ms.input}
                  value={value?.toString() ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="decimal-pad"
                  placeholder="예: 65"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              )}
            />
            {errors.targetWeightKg && (
              <Text style={ms.error}>{errors.targetWeightKg.message}</Text>
            )}

            <Text style={ms.label}>목표일 *</Text>
            <Controller
              control={control}
              name="targetDate"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  style={ms.input}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="YYYY-MM-DD"
                  returnKeyType="done"
                />
              )}
            />
            {errors.targetDate && <Text style={ms.error}>{errors.targetDate.message}</Text>}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

// ─── 메인 설정 화면 ────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { signOut } = useAuthStore()
  const {
    profile, bmr, tdee, fetchProfile,
    isLoading: profileLoading, error: profileError, clearError: clearProfileError,
  } = useProfileStore()
  const {
    activeGoal, daysRemaining, dailyDeficit, fetchActiveGoal,
    isLoading: goalLoading, error: goalError, clearError: clearGoalError,
  } = useGoalStore()

  const [profileModalVisible, setProfileModalVisible] = useState(false)
  const [goalModalVisible, setGoalModalVisible] = useState(false)

  useFocusEffect(
    useCallback(() => {
      fetchProfile()
      fetchActiveGoal()
    }, [fetchProfile, fetchActiveGoal])
  )

  const handleLogout = useCallback(() => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ])
  }, [signOut])

  const combinedError = profileError ?? goalError
  const clearCombinedError = profileError ? clearProfileError : clearGoalError

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>설정</Text>

        {combinedError && (
          <ErrorBanner message={combinedError} onDismiss={clearCombinedError} />
        )}

        {/* 프로필 섹션 */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>프로필</Text>
            {profile && (
              <TouchableOpacity onPress={() => setProfileModalVisible(true)}>
                <Text style={s.editBtn}>수정 →</Text>
              </TouchableOpacity>
            )}
          </View>
          {profileLoading ? (
            <SkeletonCard rows={4} />
          ) : profile ? (
            <View style={s.infoGrid}>
              <InfoRow label="키" value={`${profile.height_cm} cm`} />
              <InfoRow label="현재 체중" value={`${profile.current_weight_kg} kg`} />
              <InfoRow label="생년월일" value={profile.birth_date} />
              <InfoRow
                label="성별"
                value={profile.gender ? GENDER_LABEL[profile.gender] : '미설정'}
              />
              <InfoRow
                label="활동 수준"
                value={profile.activity_level ? ACTIVITY_LABEL[profile.activity_level] : '미설정'}
              />
              {bmr && <InfoRow label="기초 대사량" value={`${Math.round(bmr)} kcal`} />}
              {tdee && <InfoRow label="유지 칼로리" value={`${Math.round(tdee)} kcal`} />}
            </View>
          ) : (
            <Text style={s.empty}>프로필 정보가 없습니다.</Text>
          )}
        </View>

        {/* 목표 섹션 */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>목표</Text>
            {activeGoal && (
              <TouchableOpacity onPress={() => setGoalModalVisible(true)}>
                <Text style={s.editBtn}>수정 →</Text>
              </TouchableOpacity>
            )}
          </View>
          {goalLoading ? (
            <SkeletonCard rows={3} />
          ) : activeGoal ? (
            <View style={s.infoGrid}>
              <InfoRow label="목표 체중" value={`${activeGoal.target_weight_kg} kg`} />
              <InfoRow label="목표일" value={activeGoal.target_date} />
              {daysRemaining !== null && (
                <InfoRow label="남은 일수" value={`${daysRemaining}일`} />
              )}
              {dailyDeficit !== null && (
                <InfoRow label="일일 필요 적자" value={`${Math.round(dailyDeficit)} kcal`} />
              )}
            </View>
          ) : (
            <Text style={s.empty}>설정된 목표가 없습니다.</Text>
          )}
        </View>

        {/* 계정 섹션 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>계정</Text>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Text style={s.logoutBtnText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ProfileEditModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />
      <GoalEditModal
        visible={goalModalVisible}
        onClose={() => setGoalModalVisible(false)}
      />
    </SafeAreaView>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  )
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 20 },

  section: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  editBtn: { fontSize: 14, color: '#3b82f6', fontWeight: '600' },

  infoGrid: { gap: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 14, color: '#777' },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#111' },

  empty: { fontSize: 14, color: '#aaa', textAlign: 'center', paddingVertical: 8 },

  logoutBtn: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
})

const ms = StyleSheet.create({
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  cancel: { fontSize: 15, color: '#888' },
  save: { fontSize: 15, fontWeight: '700', color: '#3b82f6' },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },
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
  error: { fontSize: 12, color: '#ef4444', marginTop: 4 },

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
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
})
