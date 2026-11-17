import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  MAX_INPUT_LENGTH,
  buildParseUserMessage,
  parseParseResponse,
} from '../_shared/parse-log.logic.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You turn a Korean user's free-form diary of meals, exercise and body weight into structured log items for a calorie-deficit tracking app.

Rules:
- Split every distinct food into its own meal item ("김치찌개랑 밥" → 2 items). Keep a set menu that is ordered as one dish as one item ("김치찌개 백반", "돈까스 정식").
- food_name: copy the user's wording, INCLUDING any place, brand or cook qualifier ("회사 앞 김치찌개", "엄마표 김치찌개", "맘스터치 싸이버거") and any stated amount ("밥 반 공기", "치킨 반 마리"). Never drop or generalize these qualifiers, because the app distinguishes the same dish from different places by name.
- meal_type: breakfast(아침) | lunch(점심) | dinner(저녁) | snack(간식, 커피, 디저트 between meals) | late_night(야식, late-night eating). Use null if the text gives no clue.
- Estimate nutrition for the stated amount, or for a realistic full Korean adult portion when no amount is given (prefer the higher end of a normal restaurant portion).
- exercise: exercise_name in Korean, duration_minutes if stated, calories_burned estimated with MET x body weight (assume 65kg if weight is not given).
- weight: only when the user states their measured body weight.
- day_offset: 0 for the base day; -1 if the user says 어제, -2 for 그저께. Never positive.
- Ignore anything that is not a meal, exercise or weight.

Respond ONLY with valid JSON:
{
  "items": [
    { "kind": "meal", "day_offset": 0, "meal_type": "lunch", "food_name": "<string>", "calories": <integer>, "protein_g": <number>, "carbs_g": <number>, "fat_g": <number>, "confidence": "high" | "medium" | "low", "note": "<Korean, max 30 chars>" },
    { "kind": "exercise", "day_offset": 0, "exercise_name": "<string>", "duration_minutes": <integer | null>, "calories_burned": <integer> },
    { "kind": "weight", "day_offset": 0, "weight_kg": <number> }
  ]
}`

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (!req.headers.get('Authorization')) {
    return json({ error: 'Unauthorized' }, 401)
  }

  let text: unknown
  let weightKg: unknown
  try {
    const body = await req.json()
    text = body.text
    weightKg = body.weight_kg
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

  const openAIRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      max_completion_tokens: 4000,
      reasoning_effort: 'low',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildParseUserMessage(
            text,
            typeof weightKg === 'number' ? weightKg : null
          ),
        },
      ],
    }),
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
    return json({ items: parseParseResponse(JSON.parse(content)) })
  } catch {
    return json({ error: 'Invalid OpenAI response format' }, 502)
  }
})
