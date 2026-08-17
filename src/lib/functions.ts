import { FunctionsHttpError } from '@supabase/supabase-js'

/**
 * Edge Function 호출 실패 원인을 사람이 읽을 수 있는 메시지로 바꾼다.
 *
 * supabase-js 는 non-2xx 응답을 FunctionsHttpError 로 감싸는데, error.message 는
 * "Edge Function returned a non-2xx status code" 같은 고정 문구라 원인을 알 수 없다.
 * 실제 사유는 응답 본문의 { error } 필드에 들어 있으므로 그것을 꺼내 쓴다.
 */
export async function resolveFunctionError(
  error: unknown,
  fallback: string
): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (body?.error) return String(body.error)
    } catch {
      // 본문이 JSON 이 아니면 아래 기본 메시지로 넘어간다.
    }
  }
  // supabase-js 는 Error 하위 타입을 주지만, 테스트 목이나 다른 경로에서
  // { message } 형태의 평범한 객체가 올 수도 있으므로 속성으로 판별한다.
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error as { message?: unknown }
    if (typeof message === 'string' && message) return message
  }
  return fallback
}
