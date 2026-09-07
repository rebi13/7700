import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { buildEstimateUserMessage, parseEstimateResponse } from '../_shared/estimate-calories.logic.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a Korean food nutritionist. Given a food name, estimate the nutritional content for a realistic full portion that a Korean adult would actually eat in one sitting (not a minimal or diet-sized serving). If the food name specifies an amount (e.g. "밥 1공기", "김치찌개 1인분"), estimate for that stated amount. When in doubt, prefer the higher end of a normal restaurant portion rather than underestimating.
Respond ONLY with valid JSON in this exact format:
{
  "calories": <integer>,
  "protein_g": <number with 1 decimal>,
  "carbs_g": <number with 1 decimal>,
  "fat_g": <number with 1 decimal>,
  "confidence": "high" | "medium" | "low",
  "note": "<brief explanation in Korean, max 30 chars>"
}
Do not include any text outside the JSON.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let food_name: string
  let meal_type: string | undefined
  try {
    const body = await req.json()
    food_name = body.food_name
    meal_type = body.meal_type
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  if (!food_name) {
    return new Response(JSON.stringify({ error: 'food_name is required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const openAIRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      max_completion_tokens: 2000,
      reasoning_effort: 'low',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildEstimateUserMessage(food_name, meal_type) },
      ],
    }),
  })

  if (!openAIRes.ok) {
    const err = await openAIRes.text()
    return new Response(JSON.stringify({ error: `OpenAI error: ${err}` }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const openAIData = await openAIRes.json()
  const content = openAIData.choices?.[0]?.message?.content

  if (!content) {
    return new Response(JSON.stringify({ error: 'Empty response from OpenAI' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const result = parseEstimateResponse(JSON.parse(content))
    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid OpenAI response format' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
