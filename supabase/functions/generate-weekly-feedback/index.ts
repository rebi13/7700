import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  buildWeeklyFeedbackUserMessage,
  parseWeeklyFeedbackResponse,
  getWeekRange,
} from '../_shared/weekly-feedback.logic.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `당신은 친근하고 전문적인 다이어트 코치입니다.
사용자의 일주일 식사·운동 통계를 보고 3–5문장의 주간 피드백을 한국어로 작성하세요.
잘한 점, 개선할 점, 다음 주 목표를 포함하세요.
데이터가 부족해도 동기부여가 되는 메시지를 작성하세요. 이모지는 1개 이하로 사용하세요.`

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

  const { weekStart, weekEnd } = getWeekRange(target_date)

  const { data: existing } = await supabase
    .from('llm_feedbacks')
    .select('feedback')
    .eq('user_id', user.id)
    .eq('target_date', weekStart)
    .eq('feedback_type', 'weekly')
    .maybeSingle()

  if (existing) return json({ feedback: existing.feedback })

  const [summariesRes, weightsRes, goalRes] = await Promise.all([
    supabase
      .from('daily_summaries')
      .select('summary_date, total_intake_calories, total_exercise_calories, calorie_delta')
      .eq('user_id', user.id)
      .gte('summary_date', weekStart)
      .lte('summary_date', weekEnd),
    supabase
      .from('weight_logs')
      .select('weight_date, weight_kg')
      .eq('user_id', user.id)
      .gte('weight_date', weekStart)
      .lte('weight_date', weekEnd),
    supabase
      .from('goals')
      .select('target_weight_kg, start_weight_kg, target_date')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
  ])

  const userMessage = buildWeeklyFeedbackUserMessage({
    weekStart,
    weekEnd,
    summaries: summariesRes.data ?? [],
    weights: weightsRes.data ?? [],
    goal: goalRes.data ?? null,
  })

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return json({ error: 'OpenAI API key not configured' }, 500)

  const openAIRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 350,
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
    feedback = parseWeeklyFeedbackResponse(openAIData.choices?.[0]?.message?.content)
  } catch {
    return json({ error: 'Empty response from OpenAI' }, 502)
  }

  await supabase.from('llm_feedbacks').insert({
    user_id: user.id,
    feedback_type: 'weekly',
    target_date: weekStart,
    feedback,
  })

  return json({ feedback })
})
