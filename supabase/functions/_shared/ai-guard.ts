import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

/**
 * AI 를 부르는 Edge Function 이 공통으로 거치는 관문: 로그인 확인과 일일 한도 차감.
 * Deno 전용(supabase-js jsr)이라 Jest 가 읽는 *.logic.ts 와 분리해 둔다.
 */

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export type AiFeature = 'parse_log' | 'estimate_calories'

/** 환경 변수로 기능별 한도를 바꿀 수 있다. 값이 이상하면 기본값을 쓴다. */
const DEFAULT_LIMITS: Record<AiFeature, { env: string; fallback: number }> = {
  parse_log: { env: 'AI_PARSE_LOG_DAILY_LIMIT', fallback: 20 },
  estimate_calories: { env: 'AI_ESTIMATE_DAILY_LIMIT', fallback: 50 },
}

export function dailyLimit(feature: AiFeature): number {
  const { env, fallback } = DEFAULT_LIMITS[feature]
  const n = Number(Deno.env.get(env))
  return Number.isInteger(n) && n > 0 ? n : fallback
}

export type GuardResult =
  | { ok: true; supabase: SupabaseClient; userId: string; remaining: number; limit: number }
  | { ok: false; response: Response }

/**
 * 요청자의 JWT 로 사용자를 확인하고 오늘 한도에서 1회를 차감한다.
 * 한도 확인이 실패하면 AI 를 부르지 않는다(비용 쪽으로 안전하게 닫는다).
 * 차감은 AI 호출 전에 한다. 호출 후에 세면 동시에 보낸 요청들이 한도를 넘길 수 있다.
 */
export async function guardAiRequest(req: Request, feature: AiFeature): Promise<GuardResult> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { ok: false, response: json({ error: 'Unauthorized' }, 401) }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, response: json({ error: 'Unauthorized' }, 401) }

  const limit = dailyLimit(feature)
  const { data, error } = await supabase.rpc('consume_ai_quota', {
    p_feature: feature,
    p_limit: limit,
  })
  if (error || typeof data !== 'number') {
    return { ok: false, response: json({ error: 'Quota check failed' }, 500) }
  }
  if (data < 0) {
    return { ok: false, response: json({ error: 'Daily AI limit reached', limit }, 429) }
  }
  return { ok: true, supabase, userId: user.id, remaining: data, limit }
}
