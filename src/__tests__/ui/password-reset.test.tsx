import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/lib/supabase', () => ({ supabase: {} }))
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const navigate = jest.fn()
jest.mock('@tanstack/react-router', () => ({
  // 라우터 없이 화면만 그리기 위한 최소 대체물
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => navigate,
}))

import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/lib/toast'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'

const requestPasswordReset = jest.fn()
const updatePassword = jest.fn()

function resetStore(overrides: Record<string, unknown> = {}) {
  useAuthStore.setState({
    session: null,
    user: null,
    initialized: true,
    isLoading: false,
    error: null,
    awaitingEmailConfirmation: false,
    resetEmailSent: false,
    isRecovering: false,
    requestPasswordReset,
    updatePassword,
    ...overrides,
  })
}

beforeEach(() => {
  navigate.mockReset()
  requestPasswordReset.mockReset().mockResolvedValue(undefined)
  updatePassword.mockReset().mockResolvedValue(true)
  ;(toast.success as jest.Mock).mockReset()
  resetStore()
})

describe('ForgotPasswordPage', () => {
  it('이메일 형식이 아니면 보내지 않는다', async () => {
    render(<ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText('이메일'), 'not-an-email')

    await userEvent.click(screen.getByRole('button', { name: /재설정 링크 받기/ }))

    expect(await screen.findByText('유효한 이메일을 입력해 주세요')).toBeInTheDocument()
    expect(requestPasswordReset).not.toHaveBeenCalled()
  })

  it('입력한 주소로 재설정을 요청한다', async () => {
    render(<ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText('이메일'), 'me@example.com')

    await userEvent.click(screen.getByRole('button', { name: /재설정 링크 받기/ }))

    await waitFor(() =>
      expect(requestPasswordReset).toHaveBeenCalledWith('me@example.com')
    )
  })

  it('보내고 나면 폼 대신 안내를 보여준다', async () => {
    // 화면은 진입할 때 clearFlags 로 상태를 비우므로, 미리 세팅하지 않고
    // 실제 흐름대로 스토어가 플래그를 올리게 한다.
    requestPasswordReset.mockImplementation(async () => {
      useAuthStore.setState({ resetEmailSent: true })
    })
    render(<ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText('이메일'), 'me@example.com')

    await userEvent.click(screen.getByRole('button', { name: /재설정 링크 받기/ }))

    expect(await screen.findByText('메일을 보냈습니다')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /재설정 링크 받기/ })
    ).not.toBeInTheDocument()
  })

  it('오류가 있으면 배너로 알린다', async () => {
    requestPasswordReset.mockImplementation(async () => {
      useAuthStore.setState({
        error: '메일 발송 한도를 넘었습니다. 잠시 후 다시 시도해 주세요.',
      })
    })
    render(<ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText('이메일'), 'me@example.com')

    await userEvent.click(screen.getByRole('button', { name: /재설정 링크 받기/ }))

    expect(
      await screen.findByText('메일 발송 한도를 넘었습니다. 잠시 후 다시 시도해 주세요.')
    ).toBeInTheDocument()
  })

  it('로그인으로 돌아가는 길을 남겨둔다', () => {
    render(<ForgotPasswordPage />)

    expect(screen.getByRole('link', { name: '로그인으로 돌아가기' })).toHaveAttribute(
      'href',
      '/sign-in'
    )
  })
})

describe('ResetPasswordPage', () => {
  const withRecoverySession = () =>
    resetStore({ session: { access_token: 'recovery' } as never, isRecovering: true })

  it('세션이 없으면 링크가 만료됐다고 알리고 폼을 감춘다', () => {
    resetStore({ session: null, initialized: true })

    render(<ResetPasswordPage />)

    expect(screen.getByText(/링크가 만료됐거나 이미 사용됐습니다/)).toBeInTheDocument()
    expect(screen.queryByLabelText('새 비밀번호')).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '재설정 링크 다시 받기' })
    ).toHaveAttribute('href', '/forgot-password')
  })

  it('비밀번호가 짧으면 바꾸지 않는다', async () => {
    withRecoverySession()
    render(<ResetPasswordPage />)

    await userEvent.type(screen.getByLabelText('새 비밀번호'), '123')
    await userEvent.type(screen.getByLabelText('비밀번호 확인'), '123')
    await userEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(
      await screen.findByText('비밀번호는 최소 6자 이상이어야 합니다')
    ).toBeInTheDocument()
    expect(updatePassword).not.toHaveBeenCalled()
  })

  it('두 입력이 다르면 바꾸지 않는다', async () => {
    withRecoverySession()
    render(<ResetPasswordPage />)

    await userEvent.type(screen.getByLabelText('새 비밀번호'), 'secret1')
    await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'secret2')
    await userEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(await screen.findByText('비밀번호가 일치하지 않습니다')).toBeInTheDocument()
    expect(updatePassword).not.toHaveBeenCalled()
  })

  it('성공하면 알리고 홈으로 보낸다', async () => {
    withRecoverySession()
    render(<ResetPasswordPage />)

    await userEvent.type(screen.getByLabelText('새 비밀번호'), 'newsecret')
    await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'newsecret')
    await userEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith('newsecret'))
    expect(toast.success).toHaveBeenCalledWith('비밀번호가 변경되었습니다')
    expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true })
  })

  it('실패하면 화면을 옮기지 않는다', async () => {
    withRecoverySession()
    updatePassword.mockResolvedValue(false)
    render(<ResetPasswordPage />)

    await userEvent.type(screen.getByLabelText('새 비밀번호'), 'newsecret')
    await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'newsecret')
    await userEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    await waitFor(() => expect(updatePassword).toHaveBeenCalled())
    expect(navigate).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })
})
