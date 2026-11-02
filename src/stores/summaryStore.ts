import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { todayISO, addDays } from '@/utils/date'
import type { DailySummaryRow } from '@/types/database'

interface SummaryState {
  todaySummary: DailySummaryRow | null
  recentSummaries: DailySummaryRow[]
  /** 목표 기준일부터의 요약. 누적 적자는 저장하지 않고 이 목록에서 계산한다. */
  goalSummaries: DailySummaryRow[]
  goalSummariesSince: string | null
  isLoading: boolean
  error: string | null
  fetchSummary: (date: string) => Promise<void>
  calculateAndSave: (date: string) => Promise<void>
  fetchRecentSummaries: (days?: number) => Promise<void>
  fetchGoalSummaries: (startDate: string) => Promise<void>
  clearError: () => void
}

/** 같은 날짜의 요약을 새 값으로 바꾸고 날짜 순을 지킨다. */
function mergeSummary(list: DailySummaryRow[], saved: DailySummaryRow): DailySummaryRow[] {
  return [...list.filter((s) => s.summary_date !== saved.summary_date), saved].sort((a, b) =>
    a.summary_date.localeCompare(b.summary_date)
  )
}

export const useSummaryStore = create<SummaryState>((set, get) => ({
  todaySummary: null,
  recentSummaries: [],
  goalSummaries: [],
  goalSummariesSince: null,
  isLoading: false,
  error: null,

  fetchSummary: async (date) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    set({ isLoading: true, error: null })
    const { data } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('summary_date', date)
      .maybeSingle()
    set({ todaySummary: data ?? null, isLoading: false })
  },

  calculateAndSave: async (date) => {
    const userId = useAuthStore.getState().user?.id
    const tdee = useProfileStore.getState().tdee
    if (!userId || tdee === null) return

    set({ isLoading: true, error: null })

    const [{ data: meals }, { data: exercises }] = await Promise.all([
      supabase
        .from('meal_logs')
        .select('calories')
        .eq('user_id', userId)
        .eq('meal_date', date),
      supabase
        .from('exercise_logs')
        .select('calories_burned')
        .eq('user_id', userId)
        .eq('exercise_date', date),
    ])

    const totalIntake = (meals ?? []).reduce((s, m) => s + m.calories, 0)
    const totalExercise = (exercises ?? []).reduce((s, e) => s + e.calories_burned, 0)
    const netCalories = totalIntake - totalExercise
    const calorieDelta = tdee - netCalories

    const { data: saved, error } = await supabase
      .from('daily_summaries')
      .upsert(
        {
          user_id: userId,
          summary_date: date,
          total_intake_calories: totalIntake,
          total_exercise_calories: totalExercise,
          net_calories: netCalories,
          calorie_delta: calorieDelta,
        },
        { onConflict: 'user_id,summary_date' }
      )
      .select()
      .single()

    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    // 누적 적자가 바로 반영되도록 기준일 이후 요약이면 목록에도 넣는다.
    const since = get().goalSummariesSince
    const goalSummaries =
      since !== null && date >= since ? mergeSummary(get().goalSummaries, saved) : get().goalSummaries
    // 오늘 날짜를 계산한 경우에만 todaySummary를 업데이트
    if (date === todayISO()) {
      set({ todaySummary: saved, goalSummaries, isLoading: false })
    } else {
      set({ goalSummaries, isLoading: false })
    }
  },

  fetchRecentSummaries: async (days = 30) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    set({ isLoading: true, error: null })
    const since = addDays(todayISO(), -(days - 1))
    const { data, error } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .gte('summary_date', since)
      .order('summary_date', { ascending: true })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set({ recentSummaries: data ?? [], isLoading: false })
  },

  fetchGoalSummaries: async (startDate) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    const { data, error } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .gte('summary_date', startDate)
      .order('summary_date', { ascending: true })
    if (error) {
      set({ error: error.message })
      return
    }
    set({ goalSummaries: data ?? [], goalSummariesSince: startDate })
  },

  clearError: () => set({ error: null }),
}))
