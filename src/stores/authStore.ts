import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  initialized: boolean
  isLoading: boolean
  error: string | null
  initialize: () => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

// StrictMode 의 이펙트 이중 실행으로 onAuthStateChange 구독이 중복되지 않도록 한다.
let authSubscribed = false

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  initialized: false,
  isLoading: false,
  error: null,

  initialize: async () => {
    if (authSubscribed) return
    authSubscribed = true

    const {
      data: { session },
    } = await supabase.auth.getSession()

    set({ session, user: session?.user ?? null, initialized: true })

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null })
    })
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      set({ error: error.message, isLoading: false })
    } else {
      set({ isLoading: false })
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ error: error.message, isLoading: false })
    } else {
      set({ isLoading: false })
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null })
    await supabase.auth.signOut()
    set({ session: null, user: null, isLoading: false })
  },

  clearError: () => set({ error: null }),
}))
