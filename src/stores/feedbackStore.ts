import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { LlmFeedbackRow } from '@/types/database'

interface FeedbackState {
  dailyFeedback: LlmFeedbackRow | null
  weeklyFeedback: LlmFeedbackRow | null
  isGenerating: boolean
  isGeneratingWeekly: boolean
  error: string | null
  fetchDailyFeedback: (date: string) => Promise<void>
  generateDailyFeedback: (date: string) => Promise<void>
  fetchWeeklyFeedback: (weekStart: string) => Promise<void>
  generateWeeklyFeedback: (date: string) => Promise<void>
  clearDailyFeedback: () => void
  clearError: () => void
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  dailyFeedback: null,
  weeklyFeedback: null,
  isGenerating: false,
  isGeneratingWeekly: false,
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

  fetchWeeklyFeedback: async (weekStart) => {
    const { data } = await supabase
      .from('llm_feedbacks')
      .select('*')
      .eq('target_date', weekStart)
      .eq('feedback_type', 'weekly')
      .maybeSingle()
    set({ weeklyFeedback: data ?? null })
  },

  generateWeeklyFeedback: async (date) => {
    set({ isGeneratingWeekly: true, error: null })
    const { data, error } = await supabase.functions.invoke('generate-weekly-feedback', {
      body: { target_date: date },
    })
    if (error || !data?.feedback) {
      set({ isGeneratingWeekly: false, error: error?.message ?? '주간 피드백 생성 실패' })
      return
    }
    const { data: row } = await supabase
      .from('llm_feedbacks')
      .select('*')
      .eq('target_date', date)
      .eq('feedback_type', 'weekly')
      .maybeSingle()
    set({ weeklyFeedback: row ?? null, isGeneratingWeekly: false })
  },

  clearDailyFeedback: () => set({ dailyFeedback: null }),
  clearError: () => set({ error: null }),
}))
