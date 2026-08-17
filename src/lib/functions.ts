import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'

/** OpenAI 가 돌려주는 error.code / error.type 에 대한 사용자 안내 */
const OPENAI_MESSAGES: Record<string, string> = {
  insufficient_quota: 'AI 사용량이 모두 소진되었습니다. 관리자에게 문의해 주세요.',
  rate_limit_exceeded: '요청이 몰리고 있습니다. 잠시 후 다시 시도해 주세요.',
  rate_limit_error: '요청이 몰리고 있습니다. 잠시 후 다시 시도해 주세요.',
  invalid_api_key: 'AI 서비스 인증에 실패했습니다. 관리자에게 문의해 주세요.',
  model_not_found: 'AI 모델을 사용할 수 없습니다. 관리자에게 문의해 주세요.',
  context_length_exceeded: '입력이 너무 깁니다. 기록을 줄여서 다시 시도해 주세요.',
  server_error: 'AI 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
}

/** Edge Function 이 직접 만들어 보내는 고정 문구에 대한 사용자 안내 */
const FUNCTION_MESSAGES: Record<string, string> = {
  'OpenAI API key not configured':
    'AI 서비스가 설정되지 않았습니다. 관리자에게 문의해 주세요.',
  'Empty response from OpenAI':
    'AI 응답이 비어 있습니다. 잠시 후 다시 시도해 주세요.',
  Unauthorized: '로그인이 만료되었습니다. 다시 로그인해 주세요.',
}

const NETWORK_MESSAGE = '네트워크 연결을 확인한 뒤 다시 시도해 주세요.'

/**
 * Edge Function 이 보낸 error 문자열을 사용자 안내로 옮긴다.
 *
 * 함수는 OpenAI 실패를 `OpenAI error: {원본 JSON}` 형태로 감싸 보내므로,
 * 중첩된 JSON 에서 code/type 을 꺼내 매핑한다. 모르는 코드는 OpenAI 가 준
 * 영문 message 를, 그것도 못 찾으면 원문을 그대로 남겨 진단할 수 있게 한다.
 */
export function translateFunctionError(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  if (FUNCTION_MESSAGES[trimmed]) return FUNCTION_MESSAGES[trimmed]

  const nested = extractOpenAIError(trimmed)
  if (nested) {
    const key = nested.code ?? nested.type
    if (key && OPENAI_MESSAGES[key]) return OPENAI_MESSAGES[key]
    // 모르는 코드라도 JSON 덩어리 대신 문장 하나만 보여준다.
    if (nested.message) return nested.message
  }

  return trimmed
}

/** `OpenAI error: {...}` 안에 감싸인 OpenAI 오류 객체를 꺼낸다 */
function extractOpenAIError(
  raw: string
): { code?: string; type?: string; message?: string } | null {
  const start = raw.indexOf('{')
  if (start === -1) return null

  try {
    const parsed = JSON.parse(raw.slice(start))
    const err = parsed?.error
    if (!err || typeof err !== 'object') return null
    return {
      code: typeof err.code === 'string' ? err.code : undefined,
      type: typeof err.type === 'string' ? err.type : undefined,
      message: typeof err.message === 'string' ? err.message : undefined,
    }
  } catch {
    return null
  }
}

/**
 * Edge Function 호출 실패 원인을 사람이 읽을 수 있는 메시지로 바꾼다.
 *
 * supabase-js 는 non-2xx 응답을 FunctionsHttpError 로 감싸는데, error.message 는
 * "Edge Function returned a non-2xx status code" 같은 고정 문구라 원인을 알 수 없다.
 * 실제 사유는 응답 본문의 { error } 필드에 들어 있으므로 그것을 꺼내 옮긴다.
 */
export async function resolveFunctionError(
  error: unknown,
  fallback: string
): Promise<string> {
  if (error instanceof FunctionsFetchError) return NETWORK_MESSAGE

  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (body?.error) return translateFunctionError(String(body.error))
    } catch {
      // 본문이 JSON 이 아니면 아래 기본 처리로 넘어간다.
    }
  }

  // supabase-js 는 Error 하위 타입을 주지만, 테스트 목이나 다른 경로에서
  // { message } 형태의 평범한 객체가 올 수도 있으므로 속성으로 판별한다.
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error as { message?: unknown }
    if (typeof message === 'string' && message) {
      return translateFunctionError(message)
    }
  }

  return fallback
}
