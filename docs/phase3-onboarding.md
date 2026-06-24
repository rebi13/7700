# Phase 3: 온보딩 플로우 구현 가이드

사용자 프로필 및 목표를 설정하는 온보딩 화면을 구현합니다.

---

## 📋 목차

1. [파일 구조](#1-파일-구조)
2. [계산 유틸리티](#2-계산-유틸리티)
3. [날짜 유틸리티](#3-날짜-유틸리티)
4. [온보딩 스키마 (Zod)](#4-온보딩-스키마-zod)
5. [Profile Store (Zustand)](#5-profile-store-zustand)
6. [Goal Store (Zustand)](#6-goal-store-zustand)
7. [Expo Router 구조 추가](#7-expo-router-구조-추가)
8. [프로필 입력 화면](#8-프로필-입력-화면)
9. [목표 설정 화면](#9-목표-설정-화면)
10. [검증](#10-검증)

---

## 1. 파일 구조

Phase 3 완료 후 생성되는 파일 목록:

```
src/
├── utils/
│   ├── calculations.ts          ← 3.1 BMR/TDEE/적자 계산
│   └── date.ts                  ← 3.2 날짜 포맷/계산
├── schemas/
│   └── onboarding.ts            ← 3.5 Zod 검증 스키마
├── stores/
│   ├── profileStore.ts          ← 3.3 프로필 상태 관리
│   └── goalStore.ts             ← 3.4 목표 상태 관리
└── app/
    └── (onboarding)/
        ├── _layout.tsx          ← 온보딩 그룹 레이아웃
        ├── index.tsx            ← 3.6 프로필 입력 화면
        └── goal.tsx             ← 3.7 목표 설정 화면
```

---

## 2. 계산 유틸리티

**파일:** `src/utils/calculations.ts`

### calculateAge(birthDate: string): number
생년월일 → 현재 나이 계산

### calculateBMR(params): number
Mifflin-St Jeor 공식으로 기초대사량 계산

```
남성: (10 × 체중kg) + (6.25 × 키cm) - (5 × 나이) + 5
여성: (10 × 체중kg) + (6.25 × 키cm) - (5 × 나이) - 161
other: 남성/여성 평균값
```

| 파라미터 | 타입 |
|---------|------|
| weightKg | number |
| heightCm | number |
| birthDate | string |
| gender | Gender |

### calculateTDEE(bmr: number, activityLevel: ActivityLevel): number
BMR × 활동 계수

| 활동 수준 | 계수 |
|----------|------|
| sedentary | 1.2 |
| light | 1.375 |
| moderate | 1.55 |
| active | 1.725 |
| very_active | 1.9 |

### calculateDailyDeficit(params): number
목표 달성을 위한 하루 필요 칼로리 적자

```
총 감량 칼로리 = 감량량(kg) × 7700
하루 적자 = 총 감량 칼로리 / 남은 일수
```

| 파라미터 | 타입 |
|---------|------|
| startWeightKg | number |
| targetWeightKg | number |
| targetDate | string |

### estimateWeightChange(calorieDelta: number): number
칼로리 적자/초과 → 예상 체중 변화(kg)

```
체중 변화 = 칼로리 적자 / 7700
```

---

## 3. 날짜 유틸리티

**파일:** `src/utils/date.ts`

### formatDate(date: string | Date): string
`2026-06-24` → `2026년 6월 24일`

### formatDateShort(date: string | Date): string
`2026-06-24` → `6/24`

### toISODate(date: Date): string
Date 객체 → `YYYY-MM-DD` 문자열

### getDaysRemaining(targetDate: string): number
오늘부터 목표일까지 남은 일수

### addDays(date: string, days: number): string
날짜에 일수 더하기

---

## 4. 온보딩 스키마 (Zod)

**파일:** `src/schemas/onboarding.ts`

### profileSchema

| 필드 | 타입 | 규칙 |
|------|------|------|
| heightCm | number | 100 이상 250 이하 |
| currentWeightKg | number | 30 이상 300 이하 |
| birthDate | string | YYYY-MM-DD, 과거 날짜만 |
| gender | enum | male / female / other |
| activityLevel | enum | sedentary ~ very_active |

### goalSchema

| 필드 | 타입 | 규칙 |
|------|------|------|
| targetWeightKg | number | 30 이상 300 이하 |
| targetDate | string | 오늘 이후 날짜만 |

---

## 5. Profile Store (Zustand)

**파일:** `src/stores/profileStore.ts`

### 상태

| 필드 | 타입 | 설명 |
|------|------|------|
| profile | ProfileRow \| null | 현재 프로필 |
| bmr | number \| null | 자동 계산된 BMR |
| tdee | number \| null | 자동 계산된 TDEE |
| isLoading | boolean | 로딩 상태 |
| error | string \| null | 에러 메시지 |

### 액션

| 함수 | 설명 |
|------|------|
| `fetchProfile()` | Supabase에서 프로필 조회, BMR/TDEE 자동 계산 |
| `createProfile(data)` | 신규 프로필 생성 |
| `updateProfile(data)` | 프로필 수정, BMR/TDEE 재계산 |

BMR/TDEE는 프로필 로드/업데이트 시 자동 계산하여 store에 저장.

---

## 6. Goal Store (Zustand)

**파일:** `src/stores/goalStore.ts`

### 상태

| 필드 | 타입 | 설명 |
|------|------|------|
| activeGoal | GoalRow \| null | 현재 활성 목표 |
| daysRemaining | number \| null | 목표일까지 남은 일수 |
| dailyDeficit | number \| null | 하루 필요 적자 (kcal) |
| isLoading | boolean | 로딩 상태 |
| error | string \| null | 에러 메시지 |

### 액션

| 함수 | 설명 |
|------|------|
| `fetchActiveGoal()` | `is_active = true` 목표 조회, 파생값 자동 계산 |
| `createGoal(data)` | 기존 목표 비활성화 후 신규 목표 생성 |
| `updateGoal(data)` | 목표 수정, 파생값 재계산 |

---

## 7. Expo Router 구조 추가

### 온보딩 그룹 — `src/app/(onboarding)/_layout.tsx`

- 헤더 숨김
- 온보딩 전용 레이아웃

### Auth Guard 업데이트 — `src/app/_layout.tsx`

온보딩 완료 여부(프로필 존재 여부)에 따라 리다이렉션 추가:

```
세션 있음
  ├─ 프로필 없음 → /(onboarding) 이동
  └─ 프로필 있음 → /(tabs) 이동

세션 없음 → /(auth)/sign-in 이동
```

---

## 8. 프로필 입력 화면

**파일:** `src/app/(onboarding)/index.tsx`

### UI 구성

- **키 입력** (cm, 숫자 키패드)
- **현재 체중 입력** (kg, 숫자 키패드)
- **생년월일 입력** (YYYY-MM-DD 텍스트 입력)
- **성별 선택** (버튼 3개: 남성 / 여성 / 기타)
- **활동 수준 선택** (버튼 5개: 비활동적 ~ 매우 활동적)
- **다음** 버튼

### 제출 흐름

1. zodResolver로 유효성 검사
2. `profileStore.createProfile()` 호출
3. 성공 시 `/(onboarding)/goal`로 이동

---

## 9. 목표 설정 화면

**파일:** `src/app/(onboarding)/goal.tsx`

### UI 구성

- **목표 체중 입력** (kg)
- **목표일 입력** (YYYY-MM-DD)
- **자동 계산 표시** (입력값 변경 시 실시간 업데이트)
  - 감량량: X.X kg
  - 남은 일수: N일
  - 하루 필요 적자: N kcal
  - 예상 일일 섭취 권장: TDEE - 적자 kcal

### 제출 흐름

1. zodResolver로 유효성 검사
2. `goalStore.createGoal()` 호출
3. 성공 시 `/(tabs)`로 이동

---

## 10. 검증

- [ ] 프로필 입력 완료 → Supabase `profiles` 테이블에 저장 확인
- [ ] 목표 입력 완료 → Supabase `goals` 테이블에 저장 확인
- [ ] BMR/TDEE 계산값이 합리적인지 확인 (예: 175cm, 70kg, 30세 남성 → BMR ≈ 1680, TDEE moderate ≈ 2604)
- [ ] 하루 필요 적자 계산 확인
- [ ] 온보딩 완료 후 홈 탭으로 이동 확인
- [ ] 앱 재시작 시 프로필 있으면 온보딩 건너뜀 확인
- [ ] 유효성 에러 메시지 표시 확인

---

## 참고

- 전체 로드맵: `docs/phase-roadmap.md`
- 커밋 컨벤션: `docs/commit-convention.md`
