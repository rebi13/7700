import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { translateAuthError } from '@/lib/auth-errors'

interface AuthState {
  session: Session | null
  user: User | null
  initialized: boolean
  isLoading: boolean
  error: string | null
  /** 가입은 됐지만 이메일 인증을 기다리는 상태. 세션이 없어 화면이 안 넘어간다. */
  awaitingEmailConfirmation: boolean
  /** 비밀번호 재설정 메일을 보냈는지 */
  resetEmailSent: boolean
  /** 복구 링크로 들어와 비밀번호를 바꿀 수 있는 상태인지 */
  isRecovering: boolean
  initialize: () => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<boolean>
  clearError: () => void
  clearFlags: () => void
}

// StrictMode 의 이펙트 이중 실행으로 onAuthStateChange 구독이 중복되지 않도록 한다.
let authSubscribed = false

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  initialized: false,
  isLoading: false,
  error: null,
  awaitingEmailConfirmation: false,
  resetEmailSent: false,
  isRecovering: false,

  initialize: async () => {
    if (authSubscribed) return
    authSubscribed = true

    const {
      data: { session },
    } = await supabase.auth.getSession()

    set({ session, user: session?.user ?? null, initialized: true })

    supabase.auth.onAuthStateChange((event, session) => {
      set({ session, user: session?.user ?? null })
      // 복구 링크로 들어오면 임시 세션이 생긴다. 이때만 비밀번호를 바꿀 수 있다.
      if (event === 'PASSWORD_RECOVERY') set({ isRecovering: true })
    })
  },

  signUp: async (email, password) => {
    set({
      isLoading: true,
      error: null,
      awaitingEmailConfirmation: false,
    })
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      set({ error: translateAuthError(error, '가입에 실패했습니다.'), isLoading: false })
      return
    }

    // 이메일 확인이 켜져 있으면 세션이 생기지 않는다. 이 경우 화면이 넘어가지 않으므로
    // 메일함을 확인하라고 알려야 한다. 꺼져 있으면 바로 세션이 생겨 온보딩으로 넘어간다.
    set({
      isLoading: false,
      awaitingEmailConfirmation: data.session === null,
    })
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({
        error: translateAuthError(error, '로그인에 실패했습니다.'),
        isLoading: false,
      })
    } else {
      set({ isLoading: false })
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null })
    await supabase.auth.signOut()
    set({ session: null, user: null, isLoading: false, isRecovering: false })
  },

  requestPasswordReset: async (email) => {
    set({ isLoading: true, error: null, resetEmailSent: false })
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      set({
        error: translateAuthError(error, '메일 발송에 실패했습니다.'),
        isLoading: false,
      })
      return
    }

    // 가입되지 않은 주소인지는 알려주지 않는다 — 계정 존재 여부가 새 나가지 않도록.
    set({ isLoading: false, resetEmailSent: true })
  },

  updatePassword: async (password) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      set({
        error: translateAuthError(error, '비밀번호 변경에 실패했습니다.'),
        isLoading: false,
      })
      return false
    }

    set({ isLoading: false, isRecovering: false })
    return true
  },

  clearError: () => set({ error: null }),
  clearFlags: () =>
    set({ error: null, awaitingEmailConfirmation: false, resetEmailSent: false }),
}))
