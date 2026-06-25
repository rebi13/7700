# Phase 7 — Supabase Edge Functions

## 목표

Phase 8의 AI 칼로리 힌트 기능을 위한 Edge Function을 구축한다.  
음식 이름을 입력받아 OpenAI GPT로 칼로리·영양소를 추정하고 반환한다.

---

## 구조

```
supabase/
└── functions/
    └── estimate-calories/
        └── index.ts
```

---

## Edge Function: `estimate-calories`

### 요청

```
POST /functions/v1/estimate-calories
Authorization: Bearer <supabase-user-jwt>
Content-Type: application/json

{
  "food_name": "비빔밥",
  "meal_type": "lunch"   // optional
}
```

### 응답

```json
{
  "calories": 550,
  "protein_g": 18.0,
  "carbs_g": 85.0,
  "fat_g": 12.0,
  "confidence": "medium",
  "note": "일반적인 비빔밥 1인분 기준"
}
```

### 오류 응답

```json
{ "error": "food_name is required" }
```

---

## 구현 상세

### 인증

요청 헤더의 `Authorization: Bearer` JWT 존재 여부만 확인한다.

```ts
const authHeader = req.headers.get('Authorization')
if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
```

### OpenAI 모델

- 모델: `gpt-4o-mini` (속도·비용 최적화)
- max_tokens: 256
- response_format: `{ type: 'json_object' }` (JSON 응답 강제)

### 시스템 프롬프트

```
You are a Korean food nutritionist. Given a food name, estimate the nutritional content for a typical Korean serving size.
Respond ONLY with valid JSON in this exact format:
{
  "calories": <integer>,
  "protein_g": <number with 1 decimal>,
  "carbs_g": <number with 1 decimal>,
  "fat_g": <number with 1 decimal>,
  "confidence": "high" | "medium" | "low",
  "note": "<brief explanation in Korean, max 30 chars>"
}
```

### Edge Function 코드 구조

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { food_name, meal_type } = await req.json()
  if (!food_name) {
    return new Response(JSON.stringify({ error: 'food_name is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const openAIRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 256,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `음식: ${food_name}${meal_type ? `, 식사 종류: ${meal_type}` : ''}` },
      ],
    }),
  })

  const openAIData = await openAIRes.json()
  const result = JSON.parse(openAIData.choices[0].message.content)

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

---

## 환경 변수

Supabase Dashboard → Project Settings → Edge Functions → Secrets에 추가:

| 키 | 값 |
|---|---|
| `OPENAI_API_KEY` | OpenAI API 키 |

로컬 개발 시 `supabase/functions/.env`:
```
OPENAI_API_KEY=sk-...
```

---

## 클라이언트 연동 (Phase 8에서 구현)

```ts
const { data, error } = await supabase.functions.invoke('estimate-calories', {
  body: { food_name: '비빔밥', meal_type: 'lunch' },
})
```

---

## 배포

```bash
# Supabase CLI 설치 (최초 1회)
brew install supabase/tap/supabase

# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref ymhvepzhtorrdanvgluf

# 시크릿 설정
supabase secrets set OPENAI_API_KEY=sk-...

# 배포
supabase functions deploy estimate-calories
```

---

## 범위 외 (추후)

- 운동 칼로리 소모 추정 함수 — Phase 8 확장
- 로그 저장 (`llm_parse_logs` 테이블) — Phase 8에서 함께 구현
- Rate limiting — Phase 10
