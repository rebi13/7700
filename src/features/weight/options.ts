import type { MeasuredTiming } from '@/types/database'

export const MEASURED_TIMINGS: { value: MeasuredTiming; label: string }[] = [
  { value: 'morning', label: '기상 직후' },
  { value: 'afternoon', label: '오후' },
  { value: 'evening', label: '저녁' },
  { value: 'after_workout', label: '운동 후' },
  { value: 'other', label: '기타' },
]

export const MEASURED_TIMING_LABEL: Record<MeasuredTiming, string> = {
  morning: '기상 직후',
  afternoon: '오후',
  evening: '저녁',
  after_workout: '운동 후',
  other: '기타',
}
