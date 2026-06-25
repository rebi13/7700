# Phase 8 — AI 칼로리 힌트

## 목표

식사 기록 폼에서 음식 이름 입력 후 AI 버튼을 누르면  
`estimate-calories` Edge Function을 호출해 칼로리·영양소를 자동 입력한다.

---

## 변경 파일

| 파일 | 작업 |
|------|------|
| `src/app/(tabs)/add-log.tsx` | MealForm에 AI 추정 버튼 + 자동 입력 로직 추가 |
| `src/stores/aiStore.ts` | 신규 — Edge Function 호출 및 상태 관리 |

---

## UX 흐름

```
1. 음식 이름 입력 (예: "비빔밥")
2. [AI 추정] 버튼 탭
3. 로딩 스피너 표시
4. 응답 수신 → 칼로리·단백질·탄수화물·지방 필드 자동 입력
5. 신뢰도 + 근거 노트 표시 (예: "일반적인 비빔밥 1인분 기준")
6. 사용자가 값을 직접 수정 가능
7. 저장 버튼으로 최종 저장
```

---

## UI 변경 (MealForm)

### AI 추정 버튼

음식 이름 입력 필드 바로 아래에 위치.  
`food_name`이 비어 있으면 비활성화.

```
┌─────────────────────────────┐
│ 음식 이름 *                  │
│ [ 비빔밥                   ] │
│              [ 🤖 AI 추정 ] │  ← 오른쪽 정렬 작은 버튼
└─────────────────────────────┘
```

### 추정 결과 노트

AI 자동 입력 후 칼로리 필드 아래에 표시:

```
✓ AI 추정값  신뢰도: 높음
  일반적인 비빔밥 1인분 기준
```

- 신뢰도 색상: high → `#10b981`, medium → `#f59e0b`, low → `#ef4444`
- 사용자가 값을 수동 수정하면 노트 숨김

---

## aiStore.ts

```ts
interface AiState {
  isEstimating: boolean
  error: string | null
  estimateCalories: (foodName: string, mealType?: string) => Promise<EstimateResult | null>
}

interface EstimateResult {
  calories: number
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  confidence: 'high' | 'medium' | 'low'
  note: string
}
```

`estimateCalories`:
1. `set({ isEstimating: true, error: null })`
2. `supabase.functions.invoke('estimate-calories', { body: { food_name, meal_type } })`
3. 성공 시 `EstimateResult` 반환
4. 실패 시 `error` 상태 설정 후 `null` 반환

---

## MealForm 변경 포인트

```ts
const { estimateCalories, isEstimating } = useAiStore()
const [aiNote, setAiNote] = useState<{ text: string; confidence: string } | null>(null)

const handleAiEstimate = async () => {
  const foodName = watch('food_name')
  if (!foodName) return

  const result = await estimateCalories(foodName, watch('meal_type'))
  if (!result) return

  setValue('calories', result.calories, { shouldValidate: true })
  if (result.protein_g) setValue('protein_g', result.protein_g)
  if (result.carbs_g) setValue('carbs_g', result.carbs_g)
  if (result.fat_g) setValue('fat_g', result.fat_g)
  setAiNote({ text: result.note, confidence: result.confidence })
}
```

칼로리 필드 `onChange` 시 `setAiNote(null)`로 노트 초기화.

---

## 오류 처리

| 상황 | 처리 |
|------|------|
| 음식 이름 없음 | 버튼 비활성화 |
| 네트워크 오류 | Alert "AI 추정에 실패했습니다. 직접 입력해 주세요." |
| OpenAI 크레딧 없음 | 동일 Alert (Edge Function이 502 반환) |
| 응답 파싱 실패 | 동일 Alert |

---

## 범위 외 (추후)

- `llm_parse_logs` 테이블 기록 — Phase 10
- 운동 칼로리 소모 AI 추정 — Phase 9 확장
