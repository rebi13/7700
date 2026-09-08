import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { normalizeFoodName, escapeLike } from '@/utils/foodName'
import type { FoodRow, FoodSource } from '@/types/database'

export interface UpsertFoodInput {
  displayName: string
  calories: number
  protein_g?: number | null
  carbs_g?: number | null
  fat_g?: number | null
  source: FoodSource
  confidence?: 'high' | 'medium' | 'low' | null
  note?: string | null
  /** true 면 이미 있는 음식은 건드리지 않는다(신규 AI 추정이 사용자 교정값을 덮지 않게). */
  ignoreDuplicates?: boolean
}

interface FoodState {
  /** 자동완성용 최근 search 결과 */
  suggestions: FoodRow[]
  lookup: (name: string) => Promise<FoodRow | null>
  search: (prefix: string) => Promise<FoodRow[]>
  upsertFromEstimate: (input: UpsertFoodInput) => Promise<void>
  recordUsage: (normalizedName: string) => Promise<void>
  clearSuggestions: () => void
}

/**
 * 사용자별 음식 라이브러리. 이름→영양을 캐시해 AI 호출을 줄이고 값을 통일한다.
 * 모든 쓰기는 best-effort 다 — 실패해도 식사 저장이나 추정을 막지 않는다.
 */
export const useFoodStore = create<FoodState>((set) => ({
  suggestions: [],

  lookup: async (name) => {
    const userId = useAuthStore.getState().user?.id
    const norm = normalizeFoodName(name)
    if (!userId || !norm) return null
    const { data, error } = await supabase
      .from('foods')
      .select('*')
      .eq('user_id', userId)
      .eq('normalized_name', norm)
      .maybeSingle()
    if (error) return null
    return data ?? null
  },

  search: async (prefix) => {
    const userId = useAuthStore.getState().user?.id
    const norm = normalizeFoodName(prefix)
    if (!userId || norm.length < 1) {
      set({ suggestions: [] })
      return []
    }
    const { data, error } = await supabase
      .from('foods')
      .select('*')
      .eq('user_id', userId)
      .ilike('normalized_name', `${escapeLike(norm)}%`)
      .order('use_count', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(8)
    if (error) {
      set({ suggestions: [] })
      return []
    }
    const rows = data ?? []
    set({ suggestions: rows })
    return rows
  },

  upsertFromEstimate: async (input) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    // use_count 는 절대 보내지 않는다 — 업서트가 기본값 1 로 리셋시키므로 recordUsage 로만 올린다.
    await supabase.from('foods').upsert(
      {
        user_id: userId,
        normalized_name: normalizeFoodName(input.displayName),
        display_name: input.displayName.trim(),
        calories: input.calories,
        protein_g: input.protein_g ?? null,
        carbs_g: input.carbs_g ?? null,
        fat_g: input.fat_g ?? null,
        source: input.source,
        confidence: input.confidence ?? null,
        note: input.note ?? null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,normalized_name',
        ignoreDuplicates: input.ignoreDuplicates ?? false,
      }
    )
  },

  recordUsage: async (normalizedName) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId || !normalizedName) return
    const { data } = await supabase
      .from('foods')
      .select('use_count')
      .eq('user_id', userId)
      .eq('normalized_name', normalizedName)
      .maybeSingle()
    if (!data) return
    await supabase
      .from('foods')
      .update({ use_count: data.use_count + 1, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('normalized_name', normalizedName)
  },

  clearSuggestions: () => set({ suggestions: [] }),
}))
