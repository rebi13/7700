import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { LlmFeedbackRow } from '@/types/database'

interface FeedbackState {
  dailyFeedback: LlmFeedbackRow | null
  isGenerating: boolean
  error: string | null
  fetchDailyFeedback: (date: string) => Promise<void>
  generateDailyFeedback: (date: string) => Promise<void>
  clearDailyFeedback: () => void
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  dailyFeedback: null,
  isGenerating: false,
  error: null,

  fetchDailyFeedback: async (date) => {
    const { data } = await supabase
      .from('llm_feedbacks')
      .select('*')
      .eq('target_date', date)
      .eq('feedback_type', 'daily')
      .maybeSingle()
    set({ dailyFeedback: data ?? null })
  },

  generateDailyFeedback: async (date) => {
    set({ isGenerating: true, error: null })
    const { data, error } = await supabase.functions.invoke('generate-daily-feedback', {
      body: { target_date: date },
    })
    if (error || !data?.feedback) {
      set({ isGenerating: false, error: error?.message ?? '피드백 생성 실패' })
      return
    }
    const { data: row } = await supabase
      .from('llm_feedbacks')
      .select('*')
      .eq('target_date', date)
      .eq('feedback_type', 'daily')
      .maybeSingle()
    set({ dailyFeedback: row ?? null, isGenerating: false })
  },

  clearDailyFeedback: () => set({ dailyFeedback: null }),
}))
