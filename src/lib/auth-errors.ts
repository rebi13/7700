import { AuthError } from '@supabase/supabase-js'

/**
 * supabase-js 가 주는 error.code 에 대한 사용자 안내.
 * 코드는 auth-js 의 ErrorCode 목록을 따른다.
 */
const CODE_MESSAGES: Record<string, string> = {
  invalid_credentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
  email_not_confirmed: '이메일 인증이 아직 안 됐습니다. 메일함을 확인해 주세요.',
  user_already_exists: '이미 가입된 이메일입니다.',
  email_exists: '이미 가입된 이메일입니다.',
  user_not_found: '가입되지 않은 이메일입니다.',
  weak_password: '비밀번호가 너무 단순합니다. 더 복잡하게 만들어 주세요.',
  same_password: '이전과 다른 비밀번호를 입력해 주세요.',
  otp_expired: '링크가 만료됐습니다. 다시 요청해 주세요.',
  session_not_found: '로그인이 만료됐습니다. 다시 로그인해 주세요.',
  signup_disabled: '현재 회원가입을 받지 않습니다.',
  over_email_send_rate_limit:
    '메일 발송 한도를 넘었습니다. 잠시 후 다시 시도해 주세요.',
  over_request_rate_limit: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.',
  validation_failed: '입력값을 다시 확인해 주세요.',
}

/**
 * code 가 없던 시절의 응답이나 코드가 안 붙는 오류를 위한 문구 매칭.
 * 부분 일치로 본다 — 서버가 뒤에 세부 내용을 덧붙이는 경우가 있다.
 */
const MESSAGE_PATTERNS: [pattern: string, message: string][] = [
  ['Invalid login credentials', '이메일 또는 비밀번호가 올바르지 않습니다.'],
  ['Email not confirmed', '이메일 인증이 아직 안 됐습니다. 메일함을 확인해 주세요.'],
  ['User already registered', '이미 가입된 이메일입니다.'],
  ['Password should be at least', '비밀번호는 최소 6자 이상이어야 합니다.'],
  ['Unable to validate email address', '이메일 형식이 올바르지 않습니다.'],
  ['Email rate limit exceeded', '메일 발송 한도를 넘었습니다. 잠시 후 다시 시도해 주세요.'],
  ['For security purposes', '보안을 위해 잠시 후 다시 시도해 주세요.'],
  [
    'New password should be different',
    '이전과 다른 비밀번호를 입력해 주세요.',
  ],
  ['Token has expired or is invalid', '링크가 만료됐습니다. 다시 요청해 주세요.'],
  ['Auth session missing', '로그인이 만료됐습니다. 다시 로그인해 주세요.'],
]

const NETWORK_MESSAGE = '네트워크 연결을 확인한 뒤 다시 시도해 주세요.'

/**
 * 인증 오류를 한국어 안내로 옮긴다.
 *
 * supabase-js 는 영문 메시지를 그대로 주기 때문에 옮기지 않으면
 * "Invalid login credentials" 같은 문장이 사용자에게 그대로 노출된다.
 * 모르는 오류는 원문을 남겨 진단할 수 있게 한다.
 */
export function translateAuthError(error: unknown, fallback: string): string {
  if (!error) return fallback

  if (error instanceof AuthError) {
    if (error.code && CODE_MESSAGES[error.code]) return CODE_MESSAGES[error.code]
    // 네트워크 단절은 code 없이 status 0 으로 온다.
    if (error.status === 0) return NETWORK_MESSAGE
  }

  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : ''

  if (!message) return fallback

  for (const [pattern, translated] of MESSAGE_PATTERNS) {
    if (message.includes(pattern)) return translated
  }

  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return NETWORK_MESSAGE
  }

  return message
}
