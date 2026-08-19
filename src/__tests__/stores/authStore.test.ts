/**
 * 비밀번호 재설정이 window.location.origin 으로 도착지를 만들기 때문에
 * 이 파일만 jsdom 에서 돌린다. 나머지 스토어 테스트는 node 환경 그대로다.
 *
 * @jest-environment jsdom
 */
import { AuthError } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/authStore'

const mockSignUp = jest.fn()
const mockSignInWithPassword = jest.fn()
const mockResetPasswordForEmail = jest.fn()
const mockUpdateUser = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...a: unknown[]) => mockSignUp(...a),
      signInWithPassword: (...a: unknown[]) => mockSignInWithPassword(...a),
      resetPasswordForEmail: (...a: unknown[]) => mockResetPasswordForEmail(...a),
      updateUser: (...a: unknown[]) => mockUpdateUser(...a),
    },
  },
}))

beforeEach(() => {
  useAuthStore.setState({
    session: null,
    user: null,
    initialized: true,
    isLoading: false,
    error: null,
    awaitingEmailConfirmation: false,
    resetEmailSent: false,
    isRecovering: false,
  })
  mockSignUp.mockReset()
  mockSignInWithPassword.mockReset()
  mockResetPasswordForEmail.mockReset()
  mockUpdateUser.mockReset()
})

describe('signUp', () => {
  /**
   * 이메일 확인이 켜져 있으면 세션이 안 생겨 화면이 그대로 멈춘다.
   * 이 플래그가 없으면 사용자는 가입이 됐는지조차 알 수 없다.
   */
  it('세션이 없으면 이메일 인증 대기로 표시한다', async () => {
    mockSignUp.mockResolvedValue({ data: { user: {}, session: null }, error: null })

    await useAuthStore.getState().signUp('me@example.com', 'secret1')

    expect(useAuthStore.getState().awaitingEmailConfirmation).toBe(true)
    expect(useAuthStore.getState().error).toBeNull()
  })

  it('세션이 바로 생기면 대기 표시를 하지 않는다', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: {}, session: { access_token: 'x' } },
      error: null,
    })

    await useAuthStore.getState().signUp('me@example.com', 'secret1')

    expect(useAuthStore.getState().awaitingEmailConfirmation).toBe(false)
  })

  it('오류는 한국어로 옮겨 담는다', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthError('User already registered', 422, 'user_already_exists'),
    })

    await useAuthStore.getState().signUp('me@example.com', 'secret1')

    expect(useAuthStore.getState().error).toBe('이미 가입된 이메일입니다.')
    expect(useAuthStore.getState().awaitingEmailConfirmation).toBe(false)
    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})

describe('signIn', () => {
  it('오류를 한국어로 옮긴다', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {},
      error: new AuthError('Invalid login credentials', 400, 'invalid_credentials'),
    })

    await useAuthStore.getState().signIn('me@example.com', 'wrong')

    expect(useAuthStore.getState().error).toBe(
      '이메일 또는 비밀번호가 올바르지 않습니다.'
    )
  })

  it('성공하면 오류 없이 로딩을 내린다', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null })

    await useAuthStore.getState().signIn('me@example.com', 'secret1')

    expect(useAuthStore.getState().error).toBeNull()
    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})

describe('requestPasswordReset', () => {
  it('현재 주소를 기준으로 재설정 링크 도착지를 넘긴다', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })

    await useAuthStore.getState().requestPasswordReset('me@example.com')

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('me@example.com', {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    expect(useAuthStore.getState().resetEmailSent).toBe(true)
  })

  it('실패하면 보냈다고 표시하지 않는다', async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      data: {},
      error: new AuthError('Email rate limit exceeded', 429, 'over_email_send_rate_limit'),
    })

    await useAuthStore.getState().requestPasswordReset('me@example.com')

    expect(useAuthStore.getState().resetEmailSent).toBe(false)
    expect(useAuthStore.getState().error).toBe(
      '메일 발송 한도를 넘었습니다. 잠시 후 다시 시도해 주세요.'
    )
  })
})

describe('updatePassword', () => {
  it('성공하면 true 를 주고 복구 상태를 푼다', async () => {
    useAuthStore.setState({ isRecovering: true })
    mockUpdateUser.mockResolvedValue({ data: {}, error: null })

    const ok = await useAuthStore.getState().updatePassword('newsecret')

    expect(ok).toBe(true)
    expect(useAuthStore.getState().isRecovering).toBe(false)
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newsecret' })
  })

  it('실패하면 false 를 주고 오류를 한국어로 남긴다', async () => {
    mockUpdateUser.mockResolvedValue({
      data: {},
      error: new AuthError('New password should be different', 422, 'same_password'),
    })

    const ok = await useAuthStore.getState().updatePassword('oldsecret')

    expect(ok).toBe(false)
    expect(useAuthStore.getState().error).toBe('이전과 다른 비밀번호를 입력해 주세요.')
  })
})

describe('clearFlags', () => {
  it('오류와 안내 플래그를 한 번에 비운다', () => {
    useAuthStore.setState({
      error: '무언가',
      awaitingEmailConfirmation: true,
      resetEmailSent: true,
    })

    useAuthStore.getState().clearFlags()

    const s = useAuthStore.getState()
    expect(s.error).toBeNull()
    expect(s.awaitingEmailConfirmation).toBe(false)
    expect(s.resetEmailSent).toBe(false)
  })
})
