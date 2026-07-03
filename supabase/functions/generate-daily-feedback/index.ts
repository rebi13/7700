import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { buildFeedbackUserMessage, parseFeedbackResponse } from '../_shared/daily-feedback.logic.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `당신은 친근하고 전문적인 다이어트 코치입니다.
사용자의 하루 식사·운동 데이터를 보고 2–3문장의 짧고 격려가 담긴 피드백을 한국어로 작성하세요.
칭찬, 한 가지 개선점, 내일을 위한 짧은 조언 중 1–2가지를 포함하세요.
데이터가 없는 날도 동기부여가 되는 메시지를 작성하세요. 이모지는 1개 이하로 사용하세요.`

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  let target_date: string
  try {
    const body = await req.json()
    target_date = body.target_date
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!target_date) return json({ error: 'target_date is required' }, 400)

  const { data: existing } = await supabase
    .from('llm_feedbacks')
    .select('feedback')
    .eq('user_id', user.id)
    .eq('target_date', target_date)
    .eq('feedback_type', 'daily')
    .maybeSingle()

  if (existing) return json({ feedback: existing.feedback })

  const [mealsRes, exerciseRes, summaryRes, goalRes] = await Promise.all([
    supabase
      .from('meal_logs')
      .select('food_name, calories, meal_type')
      .eq('user_id', user.id)
      .eq('meal_date', target_date),
    supabase
      .from('exercise_logs')
      .select('exercise_name, calories_burned, duration_minutes')
      .eq('user_id', user.id)
      .eq('exercise_date', target_date),
    supabase
      .from('daily_summaries')
      .select('total_intake_calories, total_exercise_calories, calorie_delta')
      .eq('user_id', user.id)
      .eq('summary_date', target_date)
      .maybeSingle(),
    supabase
      .from('goals')
      .select('target_weight_kg, start_weight_kg, target_date')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
  ])

  const userMessage = buildFeedbackUserMessage({
    targetDate: target_date,
    meals: mealsRes.data ?? [],
    exercises: exerciseRes.data ?? [],
    summary: summaryRes.data ?? null,
    goal: goalRes.data ?? null,
  })

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return json({ error: 'OpenAI API key not configured' }, 500)

  const openAIRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  })

  if (!openAIRes.ok) {
    const err = await openAIRes.text()
    return json({ error: `OpenAI error: ${err}` }, 502)
  }

  const openAIData = await openAIRes.json()

  let feedback: string
  try {
    feedback = parseFeedbackResponse(openAIData.choices?.[0]?.message?.content)
  } catch {
    return json({ error: 'Empty response from OpenAI' }, 502)
  }

  await supabase.from('llm_feedbacks').insert({
    user_id: user.id,
    feedback_type: 'daily',
    target_date,
    feedback,
  })

  return json({ feedback })
})
