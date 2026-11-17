import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { resolveFunctionError } from '@/lib/functions'
import type { ParsedLogItem } from '../../supabase/functions/_shared/parse-log.logic'

export type { ParsedLogItem }

export interface EstimateResult {
  calories: number
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  confidence: 'high' | 'medium' | 'low'
  note: string
}

interface AiState {
  isEstimating: boolean
  error: string | null
  estimateCalories: (foodName: string, mealType?: string) => Promise<EstimateResult | null>
  isParsing: boolean
  /** 자연어 하루 기록을 항목으로 나눈다. 실패하면 error 에 안내 문구를 남기고 null */
  parseLog: (text: string, weightKg?: number | null) => Promise<ParsedLogItem[] | null>
}

export const useAiStore = create<AiState>((set) => ({
  isEstimating: false,
  error: null,

  estimateCalories: async (foodName, mealType) => {
    set({ isEstimating: true, error: null })
    const { data, error } = await supabase.functions.invoke('estimate-calories', {
      body: { food_name: foodName, meal_type: mealType },
    })
    if (error || !data) {
      set({
        isEstimating: false,
        error: await resolveFunctionError(error, '추정 실패'),
      })
      return null
    }
    set({ isEstimating: false })
    return data as EstimateResult
  },

  isParsing: false,

  parseLog: async (text, weightKg) => {
    set({ isParsing: true, error: null })
    const { data, error } = await supabase.functions.invoke('parse-log', {
      body: { text, weight_kg: weightKg ?? null },
    })
    if (error || !Array.isArray(data?.items)) {
      set({
        isParsing: false,
        error: await resolveFunctionError(error, '기록을 정리하지 못했습니다'),
      })
      return null
    }
    set({ isParsing: false })
    return data.items as ParsedLogItem[]
  },
}))
