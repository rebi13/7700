import type { ActivityLevel, Gender } from '@/types/database'

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'other', label: '기타' },
]

export const GENDER_LABEL: Record<Gender, string> = {
  male: '남성',
  female: '여성',
  other: '기타',
}

export const ACTIVITY_OPTIONS: {
  value: ActivityLevel
  label: string
  desc: string
}[] = [
  { value: 'sedentary', label: '비활동적', desc: '운동 거의 안 함' },
  { value: 'light', label: '가벼운 활동', desc: '주 1-3회 운동' },
  { value: 'moderate', label: '보통 활동', desc: '주 3-5회 운동' },
  { value: 'active', label: '활동적', desc: '주 6-7회 운동' },
  { value: 'very_active', label: '매우 활동적', desc: '하루 2회 운동' },
]

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: '비활동적',
  light: '가벼운 활동',
  moderate: '보통 활동',
  active: '활동적',
  very_active: '매우 활동적',
}
