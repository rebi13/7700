import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { todayISO, addDays } from '@/utils/date'
import type { WeightLogRow, WeightLogUpdate } from '@/types/database'
import type { WeightFormData } from '@/schemas/weight'

interface WeightState {
  logs: WeightLogRow[]
  sevenDayAvg: number | null
  isLoading: boolean
  error: string | null
  fetchLogs: (date: string) => Promise<void>
  fetchRecentLogs: (days?: number) => Promise<void>
  addLog: (data: WeightFormData) => Promise<void>
  updateLog: (id: string, data: WeightLogUpdate) => Promise<void>
  deleteLog: (id: string) => Promise<void>
  clearError: () => void
}

export const useWeightStore = create<WeightState>((set, get) => ({
  logs: [],
  sevenDayAvg: null,
  isLoading: false,
  error: null,

  fetchLogs: async (date) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('weight_date', date)
      .order('created_at', { ascending: true })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set({ logs: data ?? [], isLoading: false })
  },

  fetchRecentLogs: async (days = 7) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    set({ isLoading: true, error: null })
    const since = addDays(todayISO(), -(days - 1))
    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('weight_date', since)
      .order('weight_date', { ascending: false })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    const sevenDayAvg =
      data && data.length > 0
        ? data.reduce((sum, l) => sum + l.weight_kg, 0) / data.length
        : null
    set({ logs: data ?? [], sevenDayAvg, isLoading: false })
  },

  addLog: async (formData) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    set({ isLoading: true, error: null })
    const { error } = await supabase.from('weight_logs').insert({
      user_id: userId,
      weight_kg: formData.weight_kg,
      weight_date: formData.weight_date,
      measured_timing: formData.measured_timing ?? null,
      memo: formData.memo ?? null,
    })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    await get().fetchLogs(formData.weight_date)
  },

  updateLog: async (id, data) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase
      .from('weight_logs')
      .update(data as Record<string, unknown>)
      .eq('id', id)
    set({ isLoading: false })
    if (error) set({ error: error.message })
  },

  deleteLog: async (id) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase.from('weight_logs').delete().eq('id', id)
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set((state) => ({ logs: state.logs.filter((l) => l.id !== id), isLoading: false }))
  },

  clearError: () => set({ error: null }),
}))
