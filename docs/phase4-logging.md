# Phase 4: 핵심 로깅 - 수동 입력 구현 가이드

식사, 운동, 체중 기록의 CRUD를 구현합니다.

---

## 📋 목차

1. [파일 구조](#1-파일-구조)
2. [Zod 스키마](#2-zod-스키마)
3. [식사 Store](#3-식사-store)
4. [운동 Store](#4-운동-store)
5. [체중 Store](#5-체중-store)
6. [탭 네비게이터 확장](#6-탭-네비게이터-확장)
7. [기록 추가 화면](#7-기록-추가-화면)
8. [검증](#8-검증)

---

## 1. 파일 구조

Phase 4 완료 후 생성되는 파일 목록:

```
src/
├── schemas/
│   ├── meal.ts              ← 4.1 식사 Zod 스키마
│   ├── exercise.ts          ← 4.2 운동 Zod 스키마
│   └── weight.ts            ← 4.3 체중 Zod 스키마
├── stores/
│   ├── mealStore.ts         ← 4.1 식사 상태 관리
│   ├── exerciseStore.ts     ← 4.2 운동 상태 관리
│   └── weightStore.ts       ← 4.3 체중 상태 관리
└── app/
    └── (tabs)/
        ├── _layout.tsx      ← 탭 추가 (홈 + 기록 + 통계)
        ├── index.tsx        ← 홈 (기존, Phase 5에서 완성)
        └── add-log.tsx      ← 4.4 기록 추가 화면
```

---

## 2. Zod 스키마

### 2-1. 식사 스키마

**파일:** `src/schemas/meal.ts`

```ts
import { z } from 'zod'

export const mealSchema = z.object({
  food_name: z.string().min(1, '음식 이름을 입력해 주세요').max(100),
  calories: z.coerce
    .number({ invalid_type_error: '칼로리를 입력해 주세요' })
    .int('정수로 입력해 주세요')
    .min(1, '칼로리는 1kcal 이상이어야 합니다')
    .max(9999, '칼로리는 9999kcal 이하여야 합니다'),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'late_night'] as const, {
    errorMap: () => ({ message: '식사 종류를 선택해 주세요' }),
  }),
  meal_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식으로 입력해 주세요'),
  protein_g: z.coerce.number().min(0).max(999).nullable().optional(),
  carbs_g: z.coerce.number().min(0).max(999).nullable().optional(),
  fat_g: z.coerce.number().min(0).max(999).nullable().optional(),
  memo: z.string().max(200).nullable().optional(),
})

export type MealFormData = z.infer<typeof mealSchema>
```

**meal_type 한국어 레이블:**

| 값 | 표시 |
|----|------|
| `breakfast` | 아침 |
| `lunch` | 점심 |
| `dinner` | 저녁 |
| `snack` | 간식 |
| `late_night` | 야식 |

---

### 2-2. 운동 스키마

**파일:** `src/schemas/exercise.ts`

```ts
import { z } from 'zod'

export const exerciseSchema = z.object({
  exercise_name: z.string().min(1, '운동 이름을 입력해 주세요').max(100),
  calories_burned: z.coerce
    .number({ invalid_type_error: '소모 칼로리를 입력해 주세요' })
    .int('정수로 입력해 주세요')
    .min(1, '소모 칼로리는 1kcal 이상이어야 합니다')
    .max(9999, '소모 칼로리는 9999kcal 이하여야 합니다'),
  duration_minutes: z.coerce
    .number()
    .int('정수로 입력해 주세요')
    .min(1, '1분 이상이어야 합니다')
    .max(1440, '하루를 초과할 수 없습니다')
    .nullable()
    .optional(),
  exercise_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식으로 입력해 주세요'),
  memo: z.string().max(200).nullable().optional(),
})

export type ExerciseFormData = z.infer<typeof exerciseSchema>
```

---

### 2-3. 체중 스키마

**파일:** `src/schemas/weight.ts`

```ts
import { z } from 'zod'

export const weightSchema = z.object({
  weight_kg: z.coerce
    .number({ invalid_type_error: '체중을 입력해 주세요' })
    .min(30, '체중은 30kg 이상이어야 합니다')
    .max(300, '체중은 300kg 이하여야 합니다'),
  weight_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식으로 입력해 주세요'),
  measured_timing: z.enum(
    ['morning', 'afternoon', 'evening', 'after_workout', 'other'] as const,
    { errorMap: () => ({ message: '측정 시간대를 선택해 주세요' }) }
  ).nullable().optional(),
  memo: z.string().max(200).nullable().optional(),
})

export type WeightFormData = z.infer<typeof weightSchema>
```

**measured_timing 한국어 레이블:**

| 값 | 표시 |
|----|------|
| `morning` | 기상 직후 |
| `afternoon` | 오후 |
| `evening` | 저녁 |
| `after_workout` | 운동 후 |
| `other` | 기타 |

---

## 3. 식사 Store

**파일:** `src/stores/mealStore.ts`

### 상태

| 필드 | 타입 | 설명 |
|------|------|------|
| `logs` | `MealLogRow[]` | 조회된 식사 기록 목록 |
| `isLoading` | `boolean` | 로딩 상태 |
| `error` | `string \| null` | 에러 메시지 |

### 액션

| 함수 | 파라미터 | 설명 |
|------|----------|------|
| `fetchLogs(date)` | `date: string` | 특정 날짜의 식사 기록 조회 |
| `addLog(data)` | `MealFormData` | 식사 기록 추가 |
| `updateLog(id, data)` | `id: string, MealLogUpdate` | 식사 기록 수정 |
| `deleteLog(id)` | `id: string` | 식사 기록 삭제 |

### 구현 패턴

```ts
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { MealLogRow, MealLogUpdate } from '@/types/database'
import type { MealFormData } from '@/schemas/meal'

interface MealStore {
  logs: MealLogRow[]
  isLoading: boolean
  error: string | null
  fetchLogs: (date: string) => Promise<void>
  addLog: (data: MealFormData) => Promise<void>
  updateLog: (id: string, data: MealLogUpdate) => Promise<void>
  deleteLog: (id: string) => Promise<void>
}

export const useMealStore = create<MealStore>((set) => ({
  logs: [],
  isLoading: false,
  error: null,

  fetchLogs: async (date) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('meal_date', date)
      .order('created_at', { ascending: true })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set({ logs: data ?? [], isLoading: false })
  },

  addLog: async (formData) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    set({ isLoading: true, error: null })
    const { error } = await supabase.from('meal_logs').insert({
      user_id: userId,
      food_name: formData.food_name,
      calories: formData.calories,
      meal_type: formData.meal_type,
      meal_date: formData.meal_date,
      protein_g: formData.protein_g ?? null,
      carbs_g: formData.carbs_g ?? null,
      fat_g: formData.fat_g ?? null,
      memo: formData.memo ?? null,
    })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    // 목록 다시 조회
    await useMealStore.getState().fetchLogs(formData.meal_date)
  },

  updateLog: async (id, data) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase
      .from('meal_logs')
      .update(data)
      .eq('id', id)
    set({ isLoading: false })
    if (error) set({ error: error.message })
  },

  deleteLog: async (id) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase.from('meal_logs').delete().eq('id', id)
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set((state) => ({
      logs: state.logs.filter((l) => l.id !== id),
      isLoading: false,
    }))
  },
}))
```

---

## 4. 운동 Store

**파일:** `src/stores/exerciseStore.ts`

식사 Store와 동일한 패턴으로 구현. 테이블 `exercise_logs`, 날짜 필드 `exercise_date`.

### 상태

| 필드 | 타입 | 설명 |
|------|------|------|
| `logs` | `ExerciseLogRow[]` | 조회된 운동 기록 목록 |
| `isLoading` | `boolean` | 로딩 상태 |
| `error` | `string \| null` | 에러 메시지 |

### 액션

| 함수 | 파라미터 | 설명 |
|------|----------|------|
| `fetchLogs(date)` | `date: string` | 특정 날짜의 운동 기록 조회 |
| `addLog(data)` | `ExerciseFormData` | 운동 기록 추가 |
| `updateLog(id, data)` | `id: string, ExerciseLogUpdate` | 운동 기록 수정 |
| `deleteLog(id)` | `id: string` | 운동 기록 삭제 |

```ts
// insert 시 필드 매핑
{
  user_id: userId,
  exercise_name: formData.exercise_name,
  calories_burned: formData.calories_burned,
  duration_minutes: formData.duration_minutes ?? null,
  exercise_date: formData.exercise_date,
  memo: formData.memo ?? null,
}
```

---

## 5. 체중 Store

**파일:** `src/stores/weightStore.ts`

### 상태

| 필드 | 타입 | 설명 |
|------|------|------|
| `logs` | `WeightLogRow[]` | 조회된 체중 기록 목록 |
| `sevenDayAvg` | `number \| null` | 최근 7일 평균 체중 |
| `isLoading` | `boolean` | 로딩 상태 |
| `error` | `string \| null` | 에러 메시지 |

### 액션

| 함수 | 파라미터 | 설명 |
|------|----------|------|
| `fetchLogs(date)` | `date: string` | 특정 날짜의 체중 기록 조회 |
| `fetchRecentLogs(days?)` | `days = 7` | 최근 N일 기록 조회 후 평균 계산 |
| `addLog(data)` | `WeightFormData` | 체중 기록 추가 |
| `updateLog(id, data)` | `id: string, WeightLogUpdate` | 체중 기록 수정 |
| `deleteLog(id)` | `id: string` | 체중 기록 삭제 |

### 7일 평균 계산

```ts
// fetchRecentLogs 내부
const sevenDayAvg =
  data.length > 0
    ? data.reduce((sum, l) => sum + l.weight_kg, 0) / data.length
    : null
set({ logs: data ?? [], sevenDayAvg, isLoading: false })
```

```ts
// insert 시 필드 매핑
{
  user_id: userId,
  weight_kg: formData.weight_kg,
  weight_date: formData.weight_date,
  measured_timing: formData.measured_timing ?? null,
  memo: formData.memo ?? null,
}
```

---

## 6. 탭 네비게이터 확장

**파일:** `src/app/(tabs)/_layout.tsx`

현재 홈 탭 1개 → 홈 + 기록추가 탭 2개로 확장.

```tsx
import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{ title: '홈', tabBarLabel: '홈' }}
      />
      <Tabs.Screen
        name="add-log"
        options={{ title: '기록', tabBarLabel: '기록' }}
      />
    </Tabs>
  )
}
```

> Phase 5(대시보드), Phase 6(통계) 구현 시 탭 추가 예정.

---

## 7. 기록 추가 화면

**파일:** `src/app/(tabs)/add-log.tsx`

### UI 구성

```
┌─────────────────────────────────────┐
│ 날짜 선택: [2026-06-24]             │
├─────────────────────────────────────┤
│ [식사]   [운동]   [체중]            │  ← 탭 선택
├─────────────────────────────────────┤
│                                     │
│  (선택된 탭에 따라 폼 표시)         │
│                                     │
│  [저장]                             │
└─────────────────────────────────────┘
```

### 날짜 선택

- 기본값: 오늘 날짜 (`todayISO()`)
- TextInput으로 `YYYY-MM-DD` 직접 입력 (키보드 숫자패드)
- 미래 날짜는 허용하지 않음 (Zod로 검증하지 않고 저장 후 기록에 남음 — 의도적 허용)

### 상태 관리

```tsx
const [activeTab, setActiveTab] = useState<'meal' | 'exercise' | 'weight'>('meal')
const [selectedDate, setSelectedDate] = useState(todayISO())
```

탭 변경 시 각 폼의 `reset()` 호출 (이전 입력값 초기화).

### 식사 폼 필드

| 필드 | 컴포넌트 | 필수 |
|------|----------|------|
| 식사 종류 | 버튼 선택 (5개) | 필수 |
| 음식 이름 | TextInput | 필수 |
| 칼로리 (kcal) | TextInput, 숫자 | 필수 |
| 단백질 (g) | TextInput, 숫자 | 선택 |
| 탄수화물 (g) | TextInput, 숫자 | 선택 |
| 지방 (g) | TextInput, 숫자 | 선택 |
| 메모 | TextInput | 선택 |

### 운동 폼 필드

| 필드 | 컴포넌트 | 필수 |
|------|----------|------|
| 운동 이름 | TextInput | 필수 |
| 소모 칼로리 (kcal) | TextInput, 숫자 | 필수 |
| 운동 시간 (분) | TextInput, 숫자 | 선택 |
| 메모 | TextInput | 선택 |

### 체중 폼 필드

| 필드 | 컴포넌트 | 필수 |
|------|----------|------|
| 체중 (kg) | TextInput, 소수점 | 필수 |
| 측정 시간대 | 버튼 선택 (5개) | 선택 |
| 메모 | TextInput | 선택 |

### 저장 흐름

```
폼 submit
  → zodResolver 유효성 검사
  → 실패: 에러 메시지 표시
  → 성공: store.addLog(data) 호출
           ↓
           성공: 폼 리셋 + "저장되었습니다" 알림
           실패: 에러 메시지 표시
```

---

## 8. 검증

### 체크리스트

- [ ] 식사 기록 추가 → `meal_logs` 테이블에 저장 확인
- [ ] 운동 기록 추가 → `exercise_logs` 테이블에 저장 확인
- [ ] 체중 기록 추가 → `weight_logs` 테이블에 저장 확인
- [ ] 필수 항목 빈칸 시 한국어 에러 메시지 표시
- [ ] 날짜 변경 시 해당 날짜의 기록이 정상 조회됨
- [ ] 탭 전환 시 폼 초기화됨
- [ ] 저장 성공 시 폼 리셋됨

### 수동 테스트 시나리오

**식사 기록:**
1. "점심 / 비빔밥 / 550kcal / 단백질 15g" 입력 → 저장
2. Supabase Dashboard에서 `meal_logs` 테이블 확인
3. 칼로리 0 입력 → "1kcal 이상이어야 합니다" 에러 확인

**운동 기록:**
1. "런닝 / 300kcal / 30분" 입력 → 저장
2. Supabase Dashboard에서 `exercise_logs` 테이블 확인

**체중 기록:**
1. "68.5kg / 기상 직후" 입력 → 저장
2. Supabase Dashboard에서 `weight_logs` 테이블 확인
3. 동일 날짜 여러 번 기록 가능한지 확인 (허용 사항)

---

## 참고

- 전체 로드맵: `docs/phase-roadmap.md`
- 커밋 컨벤션: `docs/commit-convention.md`
- 데이터베이스 타입: `src/types/database.ts`
- Phase 5에서 일일 요약(`daily_summaries`) 계산 로직 추가 예정
