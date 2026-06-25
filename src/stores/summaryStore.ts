import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { estimateWeightChange } from '@/utils/calculations'
import { todayISO, addDays } from '@/utils/date'
import type { DailySummaryRow } from '@/types/database'

interface SummaryState {
  todaySummary: DailySummaryRow | null
  recentSummaries: DailySummaryRow[]
  isLoading: boolean
  error: string | null
  fetchSummary: (date: string) => Promise<void>
  calculateAndSave: (date: string) => Promise<void>
  fetchRecentSummaries: (days?: number) => Promise<void>
}

export const useSummaryStore = create<SummaryState>((set) => ({
  todaySummary: null,
  recentSummaries: [],
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

    const { data: prevRows } = await supabase
      .from('daily_summaries')
      .select('cumulative_delta')
      .eq('user_id', userId)
      .lt('summary_date', date)
      .order('summary_date', { ascending: false })
      .limit(1)

    const prevCumulative = prevRows?.[0]?.cumulative_delta ?? 0
    const cumulativeDelta = prevCumulative + calorieDelta

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
          cumulative_delta: cumulativeDelta,
          estimated_weight_change_kg: estimateWeightChange(cumulativeDelta),
        },
        { onConflict: 'user_id,summary_date' }
      )
      .select()
      .single()

    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    // 오늘 날짜를 계산한 경우에만 todaySummary를 업데이트
    if (date === todayISO()) {
      set({ todaySummary: saved, isLoading: false })
    } else {
      set({ isLoading: false })
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
}))
