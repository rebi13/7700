import { create } from 'zustand'
import type { ProfileRow, ProfileInsert, ProfileUpdate } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { calculateBMR, calculateTDEE } from '@/utils/calculations'
import { useAuthStore } from '@/stores/authStore'

interface ProfileState {
  profile: ProfileRow | null
  profileChecked: boolean
  bmr: number | null
  tdee: number | null
  isLoading: boolean
  error: string | null
  fetchProfile: () => Promise<void>
  createProfile: (data: Omit<ProfileInsert, 'user_id'>) => Promise<void>
  updateProfile: (data: ProfileUpdate) => Promise<void>
  clearError: () => void
}

function computeMetrics(p: ProfileRow): { bmr: number; tdee: number } | null {
  if (!p.gender || !p.activity_level) return null
  const bmr = calculateBMR({
    weightKg: p.current_weight_kg,
    heightCm: p.height_cm,
    birthDate: p.birth_date,
    gender: p.gender,
  })
  return { bmr, tdee: calculateTDEE(bmr, p.activity_level) }
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  profileChecked: false,
  bmr: null,
  tdee: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    const user = useAuthStore.getState().user
    if (!user) return

    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      set({ profile: null, bmr: null, tdee: null, profileChecked: true, isLoading: false })
      return
    }

    const metrics = computeMetrics(data)
    set({
      profile: data,
      bmr: metrics?.bmr ?? null,
      tdee: metrics?.tdee ?? null,
      profileChecked: true,
      isLoading: false,
    })
  },

  createProfile: async (data) => {
    const user = useAuthStore.getState().user
    if (!user) return

    set({ isLoading: true, error: null })
    const { data: created, error } = await supabase
      .from('profiles')
      .insert({ ...data, user_id: user.id })
      .select()
      .single()

    if (error || !created) {
      set({ error: error?.message ?? '저장 실패', isLoading: false })
      return
    }

    const metrics = computeMetrics(created)
    set({
      profile: created,
      bmr: metrics?.bmr ?? null,
      tdee: metrics?.tdee ?? null,
      profileChecked: true,
      isLoading: false,
    })
  },

  updateProfile: async (data) => {
    const user = useAuthStore.getState().user
    if (!user) return

    set({ isLoading: true, error: null })
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !updated) {
      set({ error: error?.message ?? '수정 실패', isLoading: false })
      return
    }

    const metrics = computeMetrics(updated)
    set({
      profile: updated,
      bmr: metrics?.bmr ?? null,
      tdee: metrics?.tdee ?? null,
      isLoading: false,
    })
  },

  clearError: () => set({ error: null }),
}))
