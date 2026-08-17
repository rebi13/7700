import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { resolveFunctionError } from '@/lib/functions'

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
}))
