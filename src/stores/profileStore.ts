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

function computeMetrics(p: ProfileRow): { bmr: number | null; tdee: number | null } {
  // BMR 은 표시용. 성별이 있으면 계산해 둔다.
  const bmr = p.gender
    ? calculateBMR({
        weightKg: p.current_weight_kg,
        heightCm: p.height_cm,
        birthDate: p.birth_date,
        gender: p.gender,
      })
    : null

  // 직접 입력한 유지 칼로리가 있으면 그 값을 TDEE 로 쓴다.
  if (p.custom_tdee != null) return { bmr, tdee: p.custom_tdee }

  // 없으면 활동 수준으로 자동 계산한다.
  if (bmr != null && p.activity_level) {
    return { bmr, tdee: calculateTDEE(bmr, p.activity_level) }
  }
  return { bmr, tdee: null }
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
      bmr: metrics.bmr,
      tdee: metrics.tdee,
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
      bmr: metrics.bmr,
      tdee: metrics.tdee,
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
      bmr: metrics.bmr,
      tdee: metrics.tdee,
      isLoading: false,
    })
  },

  clearError: () => set({ error: null }),
}))
