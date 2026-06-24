import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { MealLogRow, MealLogUpdate } from '@/types/database'
import type { MealFormData } from '@/schemas/meal'

interface MealState {
  logs: MealLogRow[]
  isLoading: boolean
  error: string | null
  fetchLogs: (date: string) => Promise<void>
  addLog: (data: MealFormData) => Promise<void>
  updateLog: (id: string, data: MealLogUpdate) => Promise<void>
  deleteLog: (id: string) => Promise<void>
  clearError: () => void
}

export const useMealStore = create<MealState>((set, get) => ({
  logs: [],
  isLoading: false,
  error: null,

  fetchLogs: async (date) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('meal_date', date)
      .order('created_at', { ascending: true })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set({ logs: data ?? [], isLoading: false })
  },

  addLog: async (formData) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    set({ isLoading: true, error: null })
    const { error } = await supabase.from('meal_logs').insert({
      user_id: userId,
      food_name: formData.food_name,
      calories: formData.calories,
      meal_type: formData.meal_type,
      meal_date: formData.meal_date,
      protein_g: formData.protein_g ?? null,
      carbs_g: formData.carbs_g ?? null,
      fat_g: formData.fat_g ?? null,
      memo: formData.memo ?? null,
    })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    await get().fetchLogs(formData.meal_date)
  },

  updateLog: async (id, data) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase
      .from('meal_logs')
      .update(data as Record<string, unknown>)
      .eq('id', id)
    set({ isLoading: false })
    if (error) set({ error: error.message })
  },

  deleteLog: async (id) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase.from('meal_logs').delete().eq('id', id)
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set((state) => ({ logs: state.logs.filter((l) => l.id !== id), isLoading: false }))
  },

  clearError: () => set({ error: null }),
}))
