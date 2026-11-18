import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { ExerciseLogRow, ExerciseLogUpdate } from '@/types/database'
import type { ExerciseFormData } from '@/schemas/exercise'

interface ExerciseState {
  logs: ExerciseLogRow[]
  isLoading: boolean
  error: string | null
  fetchLogs: (date: string) => Promise<void>
  /** 화면 목록(logs)을 건드리지 않고 그날 기록만 읽는다. 실패하면 빈 배열 */
  peekLogs: (date: string) => Promise<ExerciseLogRow[]>
  addLog: (data: ExerciseFormData) => Promise<void>
  updateLog: (id: string, data: ExerciseLogUpdate) => Promise<void>
  deleteLog: (id: string) => Promise<void>
  clearError: () => void
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  logs: [],
  isLoading: false,
  error: null,

  fetchLogs: async (date) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_date', date)
      .order('created_at', { ascending: true })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set({ logs: data ?? [], isLoading: false })
  },

  peekLogs: async (date) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return []
    const { data, error } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_date', date)
    if (error) return []
    return data ?? []
  },

  addLog: async (formData) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    set({ isLoading: true, error: null })
    const { error } = await supabase.from('exercise_logs').insert({
      user_id: userId,
      exercise_name: formData.exercise_name,
      calories_burned: formData.calories_burned,
      duration_minutes: formData.duration_minutes ?? null,
      exercise_date: formData.exercise_date,
      memo: formData.memo ?? null,
    })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    await get().fetchLogs(formData.exercise_date)
  },

  updateLog: async (id, data) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase
      .from('exercise_logs')
      .update(data as Record<string, unknown>)
      .eq('id', id)
    set({ isLoading: false })
    if (error) set({ error: error.message })
  },

  deleteLog: async (id) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase.from('exercise_logs').delete().eq('id', id)
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set((state) => ({ logs: state.logs.filter((l) => l.id !== id), isLoading: false }))
  },

  clearError: () => set({ error: null }),
}))
