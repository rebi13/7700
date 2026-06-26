import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

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

  // 이미 생성된 피드백이 있으면 재사용
  const { data: existing } = await supabase
    .from('llm_feedbacks')
    .select('feedback')
    .eq('user_id', user.id)
    .eq('target_date', target_date)
    .eq('feedback_type', 'daily')
    .maybeSingle()

  if (existing) return json({ feedback: existing.feedback })

  // 해당 날짜 데이터 수집
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

  const meals = mealsRes.data ?? []
  const exercises = exerciseRes.data ?? []
  const summary = summaryRes.data
  const goal = goalRes.data

  const mealLines = meals.length > 0
    ? meals.map((m: { food_name: string; calories: number }) => `- ${m.food_name} ${m.calories}kcal`).join('\n')
    : '없음'

  const exerciseLines = exercises.length > 0
    ? exercises.map((e: { exercise_name: string; calories_burned: number; duration_minutes: number | null }) =>
        `- ${e.exercise_name} ${e.calories_burned}kcal${e.duration_minutes ? ` (${e.duration_minutes}분)` : ''}`
      ).join('\n')
    : '없음'

  const summaryLine = summary
    ? `섭취 ${summary.total_intake_calories}kcal / 운동 소모 ${summary.total_exercise_calories}kcal / 칼로리 적자 ${summary.calorie_delta}kcal`
    : '데이터 없음'

  const goalLine = goal
    ? `목표 체중 ${goal.target_weight_kg}kg (시작 ${goal.start_weight_kg}kg), 목표일 ${goal.target_date}`
    : '없음'

  const userMessage = `날짜: ${target_date}

[식사]
${mealLines}

[운동]
${exerciseLines}

[오늘 요약]
${summaryLine}

[다이어트 목표]
${goalLine}`

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
  const feedback: string = openAIData.choices?.[0]?.message?.content?.trim() ?? ''
  if (!feedback) return json({ error: 'Empty response from OpenAI' }, 502)

  await supabase.from('llm_feedbacks').insert({
    user_id: user.id,
    feedback_type: 'daily',
    target_date,
    feedback,
  })

  return json({ feedback })
})
