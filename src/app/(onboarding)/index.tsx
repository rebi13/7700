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
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import { profileSchema, type ProfileFormData } from '@/schemas/onboarding'
import { useProfileStore } from '@/stores/profileStore'
import type { Gender, ActivityLevel } from '@/types/database'

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'other', label: '기타' },
]

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary', label: '비활동적', desc: '운동 거의 안 함' },
  { value: 'light', label: '가벼운 활동', desc: '주 1-3회 운동' },
  { value: 'moderate', label: '보통 활동', desc: '주 3-5회 운동' },
  { value: 'active', label: '활동적', desc: '주 6-7회 운동' },
  { value: 'very_active', label: '매우 활동적', desc: '하루 2회 운동' },
]

export default function ProfileScreen() {
  const router = useRouter()
  const { createProfile, isLoading, error } = useProfileStore()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  const onSubmit = async (data: ProfileFormData) => {
    await createProfile({
      height_cm: data.heightCm,
      current_weight_kg: data.currentWeightKg,
      birth_date: data.birthDate,
      gender: data.gender,
      activity_level: data.activityLevel,
    })
    if (!useProfileStore.getState().error) {
      router.push('/(onboarding)/goal')
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>프로필 설정</Text>
        <Text style={styles.subtitle}>정확한 칼로리 계산을 위해 정보를 입력해 주세요</Text>

        {/* 키 */}
        <View style={styles.field}>
          <Text style={styles.label}>키 (cm)</Text>
          <Controller
            control={control}
            name="heightCm"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.heightCm && styles.inputError]}
                placeholder="예: 170"
                keyboardType="numeric"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value?.toString() ?? ''}
              />
            )}
          />
          {errors.heightCm && <Text style={styles.fieldError}>{errors.heightCm.message}</Text>}
        </View>

        {/* 현재 체중 */}
        <View style={styles.field}>
          <Text style={styles.label}>현재 체중 (kg)</Text>
          <Controller
            control={control}
            name="currentWeightKg"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.currentWeightKg && styles.inputError]}
                placeholder="예: 70"
                keyboardType="numeric"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value?.toString() ?? ''}
              />
            )}
          />
          {errors.currentWeightKg && (
            <Text style={styles.fieldError}>{errors.currentWeightKg.message}</Text>
          )}
        </View>

        {/* 생년월일 */}
        <View style={styles.field}>
          <Text style={styles.label}>생년월일</Text>
          <Controller
            control={control}
            name="birthDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.birthDate && styles.inputError]}
                placeholder="YYYY-MM-DD (예: 1995-03-15)"
                keyboardType="numeric"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value ?? ''}
              />
            )}
          />
          {errors.birthDate && <Text style={styles.fieldError}>{errors.birthDate.message}</Text>}
        </View>

        {/* 성별 */}
        <View style={styles.field}>
          <Text style={styles.label}>성별</Text>
          <Controller
            control={control}
            name="gender"
            render={({ field: { onChange, value } }) => (
              <View style={styles.buttonGroup}>
                {GENDER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.groupBtn, value === opt.value && styles.groupBtnActive]}
                    onPress={() => onChange(opt.value)}
                  >
                    <Text
                      style={[styles.groupBtnText, value === opt.value && styles.groupBtnTextActive]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
          {errors.gender && <Text style={styles.fieldError}>{errors.gender.message}</Text>}
        </View>

        {/* 활동 수준 */}
        <View style={styles.field}>
          <Text style={styles.label}>활동 수준</Text>
          <Controller
            control={control}
            name="activityLevel"
            render={({ field: { onChange, value } }) => (
              <View>
                {ACTIVITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.activityBtn, value === opt.value && styles.activityBtnActive]}
                    onPress={() => onChange(opt.value)}
                  >
                    <Text
                      style={[
                        styles.activityBtnLabel,
                        value === opt.value && styles.activityBtnLabelActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      style={[
                        styles.activityBtnDesc,
                        value === opt.value && styles.activityBtnDescActive,
                      ]}
                    >
                      {opt.desc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
          {errors.activityLevel && (
            <Text style={styles.fieldError}>{errors.activityLevel.message}</Text>
          )}
        </View>

        {error && <Text style={styles.serverError}>{error}</Text>}

        <TouchableOpacity
          style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          <Text style={styles.submitBtnText}>{isLoading ? '저장 중...' : '다음'}</Text>
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
  buttonGroup: { flexDirection: 'row', gap: 8 },
  groupBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  groupBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  groupBtnText: { fontSize: 14, fontWeight: '600', color: '#555' },
  groupBtnTextActive: { color: '#fff' },
  activityBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  activityBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  activityBtnLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  activityBtnLabelActive: { color: '#fff' },
  activityBtnDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  activityBtnDescActive: { color: 'rgba(255,255,255,0.8)' },
  submitBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
