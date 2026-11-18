import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { MAX_INPUT_LENGTH, parseParseResponse } from '../_shared/parse-log.logic.ts'
import { buildParseRequestBody } from '../_shared/parse-log.prompt.ts'
import { CORS_HEADERS, guardAiRequest, json } from '../_shared/ai-guard.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  // 입력 검사를 한도 차감보다 먼저 한다. 형식이 틀린 요청으로 횟수를 깎지 않는다.
  let text: unknown
  try {
    const body = await req.json()
    text = body.text
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (typeof text !== 'string' || !text.trim()) {
    return json({ error: 'text is required' }, 400)
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return json({ error: 'Input too long' }, 400)
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    return json({ error: 'OpenAI API key not configured' }, 500)
  }

  const guard = await guardAiRequest(req, 'parse_log')
  if (!guard.ok) return guard.response

  const openAIRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    // 프롬프트·예시·모델 설정은 평가 스크립트와 공유한다(_shared/parse-log.prompt.ts).
    body: JSON.stringify(buildParseRequestBody(text)),
  })

  if (!openAIRes.ok) {
    return json({ error: `OpenAI error: ${await openAIRes.text()}` }, 502)
  }

  const openAIData = await openAIRes.json()
  const content = openAIData.choices?.[0]?.message?.content
  if (!content) {
    return json({ error: 'Empty response from OpenAI' }, 502)
  }

  try {
    return json({
      items: parseParseResponse(JSON.parse(content)),
      remaining: guard.remaining,
      limit: guard.limit,
    })
  } catch {
    return json({ error: 'Invalid OpenAI response format' }, 502)
  }
})
