import { AuthError } from '@supabase/supabase-js'
import { translateAuthError } from '@/lib/auth-errors'

/** supabase-js 가 실제로 던지는 형태 — message · status · code 를 갖춘 AuthError */
function authError(message: string, status = 400, code?: string) {
  return new AuthError(message, status, code)
}

describe('translateAuthError', () => {
  describe('error.code 로 매핑', () => {
    it('잘못된 자격 증명을 한국어로 바꾼다', () => {
      expect(
        translateAuthError(
          authError('Invalid login credentials', 400, 'invalid_credentials'),
          'fallback'
        )
      ).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
    })

    it('이메일 미인증을 한국어로 바꾼다', () => {
      expect(
        translateAuthError(
          authError('Email not confirmed', 400, 'email_not_confirmed'),
          'fallback'
        )
      ).toBe('이메일 인증이 아직 안 됐습니다. 메일함을 확인해 주세요.')
    })

    it('이미 가입된 이메일을 한국어로 바꾼다', () => {
      expect(
        translateAuthError(authError('User already registered', 422, 'user_already_exists'), 'fallback')
      ).toBe('이미 가입된 이메일입니다.')
    })

    it('만료된 링크를 한국어로 바꾼다', () => {
      expect(
        translateAuthError(authError('Token has expired', 403, 'otp_expired'), 'fallback')
      ).toBe('링크가 만료됐습니다. 다시 요청해 주세요.')
    })

    it('메일 발송 한도를 한국어로 바꾼다', () => {
      expect(
        translateAuthError(
          authError('Email rate limit exceeded', 429, 'over_email_send_rate_limit'),
          'fallback'
        )
      ).toBe('메일 발송 한도를 넘었습니다. 잠시 후 다시 시도해 주세요.')
    })
  })

  describe('code 가 없으면 문구로 매핑', () => {
    it('영문 메시지를 부분 일치로 알아본다', () => {
      expect(translateAuthError(authError('Invalid login credentials'), 'fallback')).toBe(
        '이메일 또는 비밀번호가 올바르지 않습니다.'
      )
    })

    it('뒤에 세부 내용이 붙어도 알아본다', () => {
      expect(
        translateAuthError(
          authError('Password should be at least 6 characters.'),
          'fallback'
        )
      ).toBe('비밀번호는 최소 6자 이상이어야 합니다.')
    })

    it('AuthError 가 아닌 평범한 객체도 처리한다', () => {
      expect(translateAuthError({ message: 'User already registered' }, 'fallback')).toBe(
        '이미 가입된 이메일입니다.'
      )
    })
  })

  describe('네트워크', () => {
    it('status 0 은 연결 문제로 본다', () => {
      expect(translateAuthError(authError('fetch failed', 0), 'fallback')).toBe(
        '네트워크 연결을 확인한 뒤 다시 시도해 주세요.'
      )
    })

    it('Failed to fetch 도 연결 문제로 본다', () => {
      expect(translateAuthError({ message: 'Failed to fetch' }, 'fallback')).toBe(
        '네트워크 연결을 확인한 뒤 다시 시도해 주세요.'
      )
    })
  })

  describe('그 외', () => {
    it('모르는 오류는 진단을 위해 원문을 남긴다', () => {
      expect(translateAuthError(authError('Something brand new'), 'fallback')).toBe(
        'Something brand new'
      )
    })

    it('오류가 없으면 기본 문구를 쓴다', () => {
      expect(translateAuthError(null, '로그인에 실패했습니다.')).toBe(
        '로그인에 실패했습니다.'
      )
    })

    it('메시지가 비어 있으면 기본 문구를 쓴다', () => {
      expect(translateAuthError({ message: '' }, '로그인에 실패했습니다.')).toBe(
        '로그인에 실패했습니다.'
      )
    })
  })
})
