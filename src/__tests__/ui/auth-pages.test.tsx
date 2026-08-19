import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/lib/supabase', () => ({ supabase: {} }))

jest.mock('@tanstack/react-router', () => ({
  // 라우터 없이 화면만 그리기 위한 최소 대체물
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

import { useAuthStore } from '@/stores/authStore'
import { SignInPage } from '@/features/auth/SignInPage'
import { SignUpPage } from '@/features/auth/SignUpPage'

const signIn = jest.fn()
const signUp = jest.fn()

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
    signIn,
    signUp,
    ...overrides,
  })
}

beforeEach(() => {
  signIn.mockReset().mockResolvedValue(undefined)
  signUp.mockReset().mockResolvedValue(undefined)
  resetStore()
})

describe('SignInPage', () => {
  it('빈 폼으로 제출하면 로그인하지 않는다', async () => {
    render(<SignInPage />)

    await userEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText('유효한 이메일을 입력해 주세요')).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('비밀번호가 짧으면 로그인하지 않는다', async () => {
    render(<SignInPage />)
    await userEvent.type(screen.getByLabelText('이메일'), 'me@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), '123')

    await userEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(
      await screen.findByText('비밀번호는 최소 6자 이상이어야 합니다')
    ).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('올바로 입력하면 이메일과 비밀번호를 넘긴다', async () => {
    render(<SignInPage />)
    await userEvent.type(screen.getByLabelText('이메일'), 'me@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'secret1')

    await userEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('me@example.com', 'secret1'))
  })

  it('스토어 오류를 배너로 보여준다', () => {
    // 한국어로 옮겨진 문구가 그대로 화면에 닿는지 확인한다.
    resetStore({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' })

    render(<SignInPage />)

    expect(
      screen.getByText('이메일 또는 비밀번호가 올바르지 않습니다.')
    ).toBeInTheDocument()
  })

  it('비밀번호 찾기와 회원가입으로 가는 길을 둔다', () => {
    render(<SignInPage />)

    expect(screen.getByRole('link', { name: '비밀번호를 잊으셨나요?' })).toHaveAttribute(
      'href',
      '/forgot-password'
    )
    expect(screen.getByRole('link', { name: '회원가입' })).toHaveAttribute(
      'href',
      '/sign-up'
    )
  })
})

describe('SignUpPage', () => {
  it('비밀번호 확인이 다르면 가입하지 않는다', async () => {
    render(<SignUpPage />)
    await userEvent.type(screen.getByLabelText('이메일'), 'me@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'secret1')
    await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'secret2')

    await userEvent.click(screen.getByRole('button', { name: '가입하기' }))

    expect(await screen.findByText('비밀번호가 일치하지 않습니다')).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('올바로 입력하면 가입을 요청한다', async () => {
    render(<SignUpPage />)
    await userEvent.type(screen.getByLabelText('이메일'), 'me@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'secret1')
    await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'secret1')

    await userEvent.click(screen.getByRole('button', { name: '가입하기' }))

    await waitFor(() => expect(signUp).toHaveBeenCalledWith('me@example.com', 'secret1'))
  })

  /**
   * 이메일 확인이 켜져 있으면 가입해도 세션이 안 생겨 화면이 그대로 멈춘다.
   * 이 안내가 없으면 사용자는 가입이 됐는지조차 알 수 없다.
   */
  it('이메일 인증 대기가 되면 폼 대신 안내를 보여준다', async () => {
    signUp.mockImplementation(async () => {
      useAuthStore.setState({ awaitingEmailConfirmation: true })
    })
    render(<SignUpPage />)
    await userEvent.type(screen.getByLabelText('이메일'), 'me@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'secret1')
    await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'secret1')

    await userEvent.click(screen.getByRole('button', { name: '가입하기' }))

    expect(await screen.findByText('인증 메일을 보냈습니다')).toBeInTheDocument()
    expect(screen.getByText(/me@example.com/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '가입하기' })).not.toBeInTheDocument()
  })

  it('세션이 바로 생기는 경우에는 안내를 띄우지 않는다', async () => {
    // 이메일 확인이 꺼져 있으면 AuthGuard 가 온보딩으로 넘긴다. 폼이 그대로 있어야 한다.
    render(<SignUpPage />)
    await userEvent.type(screen.getByLabelText('이메일'), 'me@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'secret1')
    await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'secret1')

    await userEvent.click(screen.getByRole('button', { name: '가입하기' }))

    await waitFor(() => expect(signUp).toHaveBeenCalled())
    expect(screen.queryByText('인증 메일을 보냈습니다')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '가입하기' })).toBeInTheDocument()
  })

  it('이미 가입된 이메일 오류를 한국어로 보여준다', () => {
    resetStore({ error: '이미 가입된 이메일입니다.' })

    render(<SignUpPage />)

    expect(screen.getByText('이미 가입된 이메일입니다.')).toBeInTheDocument()
  })
})
