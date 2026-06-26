# Phase 12 — LLM 일일 피드백

## 목표

하루의 식사·운동 데이터를 기반으로 AI가 짧은 피드백 메시지를 생성한다.  
홈 화면에 "오늘의 AI 피드백" 카드로 표시.

---

## 새 파일 / 변경 파일

| 파일 | 작업 |
|------|------|
| `supabase/functions/generate-daily-feedback/index.ts` | 신규 — Edge Function |
| `src/stores/feedbackStore.ts` | 신규 — 피드백 상태 관리 |
| `src/app/(tabs)/index.tsx` | 홈 화면에 피드백 카드 추가 |

---

## Edge Function: generate-daily-feedback

**요청**
```json
{ "target_date": "2026-06-26" }
```

**처리 순서**
1. 같은 날 이미 생성된 피드백이 있으면 그대로 반환 (재생성 방지)
2. `meal_logs`, `exercise_logs`, `daily_summaries`, `goals` 조회
3. OpenAI gpt-4o-mini 호출 (한국어 2–3문장 피드백)
4. `llm_feedbacks` 테이블에 저장 후 응답

**응답**
```json
{ "feedback": "오늘 식사 조절을 잘 하셨네요! ..." }
```

---

## feedbackStore

```ts
interface FeedbackState {
  dailyFeedback: LlmFeedbackRow | null
  isGenerating: boolean
  error: string | null
  fetchDailyFeedback: (date: string) => Promise<void>
  generateDailyFeedback: (date: string) => Promise<void>
}
```

- `fetchDailyFeedback` — DB에 기존 피드백이 있으면 로드
- `generateDailyFeedback` — Edge Function 호출 후 저장된 피드백 재조회

---

## UI (홈 화면 하단)

```
┌─ 오늘의 AI 피드백 ──────────────────────────┐
│                                              │
│  (피드백 없을 때)                             │
│  [✨ AI 피드백 받기]                          │
│                                              │
│  (생성 후)                                   │
│  "오늘 식사 조절을 잘 하셨네요!              │
│   운동까지 하셨으니 내일도 화이팅!"           │
│                          [다시 생성]         │
└──────────────────────────────────────────────┘
```

- 탭 진입 시 `fetchDailyFeedback(today)` 자동 호출
- "다시 생성" 버튼: 기존 피드백을 지우고 재생성

---

## 범위 외 (추후)

- 주간 피드백 (generate-weekly-feedback)
- 통계 탭에 주간 피드백 표시
- 푸시 알림으로 매일 저녁 피드백 전송
