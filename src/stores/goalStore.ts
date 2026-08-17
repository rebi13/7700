import { create } from 'zustand'
import type { GoalRow, GoalInsert, GoalUpdate } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { calculateDailyDeficit } from '@/utils/calculations'
import { getDaysRemaining } from '@/utils/date'
import { useAuthStore } from '@/stores/authStore'

interface GoalState {
  activeGoal: GoalRow | null
  goalChecked: boolean
  daysRemaining: number | null
  dailyDeficit: number | null
  isLoading: boolean
  error: string | null
  fetchActiveGoal: () => Promise<void>
  createGoal: (data: Omit<GoalInsert, 'user_id'>) => Promise<void>
  updateGoal: (data: GoalUpdate) => Promise<void>
  clearError: () => void
}

function computeGoalMetrics(goal: GoalRow) {
  return {
    daysRemaining: getDaysRemaining(goal.target_date),
    dailyDeficit: calculateDailyDeficit({
      startWeightKg: goal.start_weight_kg,
      targetWeightKg: goal.target_weight_kg,
      targetDate: goal.target_date,
    }),
  }
}

export const useGoalStore = create<GoalState>((set, get) => ({
  activeGoal: null,
  goalChecked: false,
  daysRemaining: null,
  dailyDeficit: null,
  isLoading: false,
  error: null,

  fetchActiveGoal: async () => {
    const user = useAuthStore.getState().user
    if (!user) return

    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      // 목표가 없는 사용자도 정상 흐름이므로 single() 의 406 대신 null 을 받는다.
      .maybeSingle()

    if (error || !data) {
      set({ activeGoal: null, goalChecked: true, daysRemaining: null, dailyDeficit: null, isLoading: false })
      return
    }

    set({ activeGoal: data, goalChecked: true, ...computeGoalMetrics(data), isLoading: false })
  },

  createGoal: async (data) => {
    const user = useAuthStore.getState().user
    if (!user) return

    set({ isLoading: true, error: null })

    await supabase
      .from('goals')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_active', true)

    const { data: created, error } = await supabase
      .from('goals')
      .insert({ ...data, user_id: user.id, is_active: true })
      .select()
      .single()

    if (error || !created) {
      set({ error: error?.message ?? '저장 실패', isLoading: false })
      return
    }

    set({ activeGoal: created, goalChecked: true, ...computeGoalMetrics(created), isLoading: false })
  },

  updateGoal: async (data) => {
    const { activeGoal } = get()
    if (!activeGoal) return

    set({ isLoading: true, error: null })
    const { data: updated, error } = await supabase
      .from('goals')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', activeGoal.id)
      .select()
      .single()

    if (error || !updated) {
      set({ error: error?.message ?? '수정 실패', isLoading: false })
      return
    }

    set({ activeGoal: updated, ...computeGoalMetrics(updated), isLoading: false })
  },

  clearError: () => set({ error: null }),
}))
