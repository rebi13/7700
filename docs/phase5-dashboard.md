# Phase 5: 대시보드 & 계산 구현 가이드

일일 칼로리 계산 및 목표 진행 현황을 보여주는 홈 대시보드를 구현합니다.

---

## 📋 목차

1. [파일 구조](#1-파일-구조)
2. [Summary Store](#2-summary-store)
3. [홈 대시보드 화면](#3-홈-대시보드-화면)
4. [검증](#4-검증)

---

## 1. 파일 구조

Phase 5 완료 후 변경·생성되는 파일 목록:

```
src/
├── stores/
│   └── summaryStore.ts      ← 5.1 일일 요약 계산 및 저장
└── app/
    └── (tabs)/
        └── index.tsx        ← 5.2 홈 대시보드 화면 (기존 플레이스홀더 교체)
```

---

## 2. Summary Store

**파일:** `src/stores/summaryStore.ts`

### 역할

날짜별로 식사·운동 기록을 집계하여 칼로리 요약을 계산하고, `daily_summaries` 테이블에 upsert한다.

### 계산 공식

```
총 섭취 칼로리  = 해당 날짜 meal_logs.calories 합계
총 소모 칼로리  = 해당 날짜 exercise_logs.calories_burned 합계
순 칼로리       = 총 섭취 - 총 소모
칼로리 적자     = TDEE - 순 칼로리   (양수 = 적자, 음수 = 초과)
누적 적자       = 이전 날짜까지의 cumulative_delta + 오늘 calorie_delta
예상 감량(kg)   = 누적 적자 / 7700
```

### 상태

| 필드           | 타입                      | 설명        |
| -------------- | ------------------------- | ----------- |
| `todaySummary` | `DailySummaryRow \| null` | 오늘 요약   |
| `isLoading`    | `boolean`                 | 로딩 상태   |
| `error`        | `string \| null`          | 에러 메시지 |

### 액션

| 함수                     | 설명                             |
| ------------------------ | -------------------------------- |
| `fetchSummary(date)`     | 특정 날짜의 요약 조회            |
| `calculateAndSave(date)` | 계산 후 `daily_summaries` upsert |

### 구현 패턴

```ts
import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "@/stores/profileStore";
import { estimateWeightChange } from "@/utils/calculations";
import type { DailySummaryRow } from "@/types/database";

export const useSummaryStore = create<SummaryState>((set) => ({
  todaySummary: null,
  isLoading: false,
  error: null,

  fetchSummary: async (date) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    set({ isLoading: true, error: null });
    const { data } = await supabase
      .from("daily_summaries")
      .select("*")
      .eq("user_id", userId)
      .eq("summary_date", date)
      .maybeSingle();
    set({ todaySummary: data ?? null, isLoading: false });
  },

  calculateAndSave: async (date) => {
    const userId = useAuthStore.getState().user?.id;
    const tdee = useProfileStore.getState().tdee;
    if (!userId || tdee === null) return;

    set({ isLoading: true, error: null });

    // 식사 합계
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("calories")
      .eq("user_id", userId)
      .eq("meal_date", date);
    const totalIntake = (meals ?? []).reduce((s, m) => s + m.calories, 0);

    // 운동 합계
    const { data: exercises } = await supabase
      .from("exercise_logs")
      .select("calories_burned")
      .eq("user_id", userId)
      .eq("exercise_date", date);
    const totalExercise = (exercises ?? []).reduce(
      (s, e) => s + e.calories_burned,
      0,
    );

    const netCalories = totalIntake - totalExercise;
    const calorieDelta = tdee - netCalories; // 양수 = 목표 달성, 음수 = 초과

    // 직전 날짜의 cumulative_delta 조회
    const { data: prevSummaries } = await supabase
      .from("daily_summaries")
      .select("cumulative_delta")
      .eq("user_id", userId)
      .lt("summary_date", date)
      .order("summary_date", { ascending: false })
      .limit(1);
    const prevCumulative = prevSummaries?.[0]?.cumulative_delta ?? 0;
    const cumulativeDelta = prevCumulative + calorieDelta;

    const row = {
      user_id: userId,
      summary_date: date,
      total_intake_calories: totalIntake,
      total_exercise_calories: totalExercise,
      net_calories: netCalories,
      calorie_delta: calorieDelta,
      cumulative_delta: cumulativeDelta,
      estimated_weight_change_kg: estimateWeightChange(cumulativeDelta),
    };

    const { data: saved, error } = await supabase
      .from("daily_summaries")
      .upsert(row, { onConflict: "user_id,summary_date" })
      .select()
      .single();

    if (error) {
      set({ error: error.message, isLoading: false });
      return;
    }
    set({ todaySummary: saved, isLoading: false });
  },
}));
```

### `calculateAndSave` 호출 시점

기록 저장 직후 호출하여 대시보드가 항상 최신 상태를 반영하도록 한다:

- `mealStore.addLog()` / `mealStore.deleteLog()` 완료 후
- `exerciseStore.addLog()` / `exerciseStore.deleteLog()` 완료 후
- `add-log.tsx`의 저장 성공 콜백에서 `summaryStore.calculateAndSave(selectedDate)` 호출

> ⚠️ `upsert`의 conflict key가 `user_id,summary_date`이므로 Supabase에서 해당 복합 unique 제약이 설정되어 있어야 한다. Phase 1 SQL 설정 확인 필요.

---

## 3. 홈 대시보드 화면

**파일:** `src/app/(tabs)/index.tsx` (기존 플레이스홀더 교체)

### UI 구성

```
┌─────────────────────────────────────┐
│ 안녕하세요, OO님  [날짜]            │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 오늘 칼로리                     │ │
│ │  섭취: X kcal  소모: X kcal     │ │
│ │  순 칼로리: X kcal              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌────────────┐  ┌────────────────┐  │
│ │ 오늘 적자  │  │ TDEE           │  │
│ │ X kcal     │  │ X kcal         │  │
│ └────────────┘  └────────────────┘  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 목표 진행                       │ │
│ │ 누적 적자: X kcal               │ │
│ │ 예상 감량: X.X kg               │ │
│ │ 목표: X kg 감량 / D일 남음      │ │
│ │ [=======>          ] XX%        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [새로고침]                          │
└─────────────────────────────────────┘
```

### 데이터 흐름

```
화면 마운트
  → summaryStore.fetchSummary(오늘)
  → todaySummary 없으면 summaryStore.calculateAndSave(오늘) 자동 호출
  → profileStore에서 tdee 읽기
  → goalStore에서 목표/남은 일수/daily_deficit 읽기
```

### 카드별 표시 내용

**오늘 칼로리 카드**

| 항목      | 값                                          |
| --------- | ------------------------------------------- |
| 섭취      | `todaySummary.total_intake_calories` kcal   |
| 운동 소모 | `todaySummary.total_exercise_calories` kcal |
| 순 칼로리 | `todaySummary.net_calories` kcal            |

**오늘 적자/초과 카드**

- `calorie_delta > 0`: 초록색 "적자 X kcal" (목표 달성 중)
- `calorie_delta < 0`: 빨간색 "초과 X kcal" (목표 초과)
- `calorie_delta = 0`: 회색 "정확히 TDEE"

**목표 진행 카드**

| 항목      | 계산                                                           |
| --------- | -------------------------------------------------------------- |
| 누적 적자 | `cumulative_delta` kcal                                        |
| 예상 감량 | `estimated_weight_change_kg` kg                                |
| 목표 감량 | `goal.start_weight_kg - goal.target_weight_kg` kg              |
| 진행률    | `estimated_weight_change_kg / 목표감량 × 100` % (0~100 클램프) |
| 남은 일수 | `goalStore.daysRemaining` 일                                   |

### 빈 상태 처리

- 오늘 기록이 없는 경우: 모든 수치 `0` 표시 (null 대신)
- 목표가 없는 경우: 목표 카드 숨김 (AuthGuard가 항상 목표 있음을 보장하므로 이론적으로 미발생)
- TDEE를 구할 수 없는 경우: "프로필을 완성해 주세요" 메시지

### 새로고침

수동 새로고침 버튼: `summaryStore.calculateAndSave(오늘)` 재호출

---

## 4. 검증

### 체크리스트

- [ ] 기록 없는 날: 모든 수치 0 정상 표시
- [ ] 식사 기록 추가 후 새로고침 → 섭취 칼로리 반영
- [ ] 운동 기록 추가 후 새로고침 → 소모 칼로리 반영
- [ ] 칼로리 적자 계산 정확도: `TDEE - (식사합계 - 운동합계)`
- [ ] 누적 적자: 여러 날 데이터 입력 후 오늘 값 정확성 확인
- [ ] 예상 감량: `누적 적자 / 7700` 맞는지 확인
- [ ] Supabase `daily_summaries` 테이블에 upsert 저장 확인
- [ ] 동일 날짜 중복 계산 시 기존 row 업데이트 (insert 아님) 확인

### 수동 테스트 시나리오

1. 오늘 식사 기록: 아침 300kcal + 점심 600kcal = 900kcal
2. 오늘 운동 기록: 러닝 200kcal
3. 순 칼로리 = 900 - 200 = 700kcal
4. TDEE = 2000kcal (예시)
5. 오늘 적자 = 2000 - 700 = **1300kcal** → 대시보드에서 확인

---

## 참고

- 전체 로드맵: `docs/phase-roadmap.md`
- 커밋 컨벤션: `docs/commit-convention.md`
- 데이터베이스 타입: `src/types/database.ts`
- Phase 6에서 차트 및 날짜 범위 선택 기능 추가 예정
