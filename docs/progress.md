# 7700 개발 진행 현황

> 마지막 업데이트: 2026-07-03

---

## 완료된 Phase

### Phase 0–5: 기초 인프라 & 핵심 기능
| Phase | 내용 | 주요 파일 |
|-------|------|-----------|
| 0 | 프로젝트 초기 설정 (Expo, TypeScript, Zustand, Supabase) | `app.json`, `tsconfig.json` |
| 1 | Supabase 스키마 9개 테이블, RLS, TypeScript 타입 | `src/types/database.ts` |
| 2 | 이메일 인증, Expo Router, Auth Guard | `src/stores/authStore.ts`, `src/app/_layout.tsx` |
| 3 | 온보딩 (프로필·목표 입력, BMR/TDEE 계산) | `src/stores/profileStore.ts`, `src/stores/goalStore.ts` |
| 4 | 식사·운동·체중 수동 CRUD | `src/stores/mealStore.ts`, `src/stores/exerciseStore.ts`, `src/stores/weightStore.ts` |
| 5 | 대시보드 — 오늘 칼로리, 적자/초과, 누적 진행, 목표 진행률 | `src/stores/summaryStore.ts`, `src/app/(tabs)/index.tsx` |

### Phase 6: 통계 & 차트
- `react-native-gifted-charts` 기반 3종 차트
- 체중 LineChart (터치 툴팁), 칼로리 BarChart (색상 구분), 누적 적자 LineChart
- **파일**: `src/app/(tabs)/stats.tsx`

### Phase 7: Supabase Edge Functions
- `estimate-calories` Edge Function 구현 및 배포
- OpenAI gpt-4o-mini로 음식명 → 칼로리·영양소 추정
- **파일**: `supabase/functions/estimate-calories/index.ts`

### Phase 8: AI 칼로리 추정 버튼
- 식사 폼 내 "AI 칼로리 추정" 버튼 (음식명 입력 후 자동 채움)
- 신뢰도(높음/보통/낮음) 색상 표시
- **파일**: `src/stores/aiStore.ts`, `src/app/(tabs)/add-log.tsx`

### Phase 9: Apple HealthKit 연동
- `react-native-health` 사용, iOS 전용
- 운동 동기화: `getAnchoredWorkouts` → `exercise_logs` + 중복 방지(`health_workout_sync_logs`)
- 체중 동기화: `getWeightSamples` → `weight_logs` (날짜별 최신값)
- **파일**: `src/stores/healthStore.ts`

### Phase 10: 설정 화면
- 설정 탭 추가 (홈/기록/통계/설정)
- 프로필 수정 모달 (키·체중·생년월일·성별·활동 수준)
  - 체중 변경 시 weight_logs 자동 추가 + 일일 요약 재계산
- 목표 수정 모달 (목표 체중·목표일)
- 로그아웃 확인 Alert
- **파일**: `src/app/(tabs)/settings.tsx`

### Phase 11: 기록 목록 조회·수정·삭제
- 기록 탭 하단 날짜별 기록 목록 (식사/운동/체중 탭 연동)
- 행 탭 → 수정 모달 (각 타입별)
- [삭제] 버튼 → 확인 Alert → 삭제 후 일일 요약 재계산
- **파일**: `src/app/(tabs)/add-log.tsx` (수정)

### Phase 12: AI 일일 피드백
- `generate-daily-feedback` Edge Function 배포
  - 식사·운동·요약·목표 데이터 수집 → 한국어 2–3문장 피드백 생성
  - 당일 피드백 재사용 (중복 API 호출 방지)
- 홈 화면 "오늘의 AI 피드백" 카드
  - 탭 진입 시 기존 피드백 자동 로드
  - "다시 생성" 버튼으로 재생성 가능
- **파일**: `supabase/functions/generate-daily-feedback/index.ts`, `src/stores/feedbackStore.ts`

### Phase 13: 자동화 테스트 인프라
- jest-expo@53 + @testing-library/react-native 설정
- Edge Function 로직을 `_shared/` 순수 함수로 분리 (Deno API 없음 → Jest에서 직접 import)
- **유닛 테스트 51개** (0.7초 내 완료):
  - `utils/calculations`: BMR·TDEE·일일 적자·체중 변화
  - `logic/estimate-calories`: 프롬프트 빌드·응답 파싱·에러 케이스
  - `logic/daily-feedback`: 프롬프트 빌드·빈 데이터·응답 파싱
  - `logic/weekly-feedback`: 주간 범위 계산·통계 집계·프롬프트 빌드
  - `stores/aiStore`: `supabase.functions.invoke` mock → 성공·에러·로딩 전이
  - `stores/feedbackStore`: 일별·주별 생성·조회 케이스
- **파일**: `src/__tests__/`, `supabase/functions/_shared/`, `babel.config.js`

### Phase 14: 주간 피드백
- `generate-weekly-feedback` Edge Function 구현 (배포 대기)
  - 월~일 7일치 `daily_summaries`·`weight_logs` 집계
  - 기록 일수·운동 일수·평균 섭취·적자 달성 일수·체중 변화 계산
  - 같은 주 기존 피드백 재사용 (weekStart를 target_date로 저장)
- 통계 화면 하단 "이번 주 AI 피드백" 카드 추가
- `feedbackStore`에 `generateWeeklyFeedback`·`fetchWeeklyFeedback` 추가
- **파일**: `supabase/functions/generate-weekly-feedback/`, `supabase/functions/_shared/weekly-feedback.logic.ts`

### Phase 15: UX 개선
- **공통 컴포넌트** (`src/components/`):
  - `SkeletonCard`: Animated.loop 펄스, height 고정 또는 rows 라인 모드
  - `ErrorBanner`: 인라인 에러 표시 + 닫기 버튼
  - `EmptyState`: 메시지 + 서브텍스트
- **홈 화면**: 로딩 중 SkeletonCard 3개, AI 피드백 생성 중 SkeletonCard, ErrorBanner 적용
- **통계 화면**: 차트 로딩 중 SkeletonCard(200px), EmptyState에 서브텍스트 추가
- **기록 탭**: 포커스 체인 (음식명→칼로리→단백질→탄수화물→지방→메모 등), 저장·탭 전환 시 `Keyboard.dismiss()`
- **설정 화면**: 프로필·목표 로딩 중 SkeletonCard, store 에러 ErrorBanner, 모달 내 포커스 체인·키보드 dismiss
- `profileStore`·`goalStore`에 `clearError()` 추가

---

## 파일 구조 (주요)

```
src/
├── app/
│   ├── (auth)/           # 로그인·회원가입
│   ├── (onboarding)/     # 프로필·목표 입력
│   └── (tabs)/
│       ├── index.tsx     # 홈 대시보드 + AI 일일 피드백
│       ├── add-log.tsx   # 기록 추가·목록·수정·삭제
│       ├── stats.tsx     # 통계·차트 + AI 주간 피드백
│       └── settings.tsx  # 설정 (프로필·목표·로그아웃)
├── components/
│   ├── SkeletonCard.tsx
│   ├── ErrorBanner.tsx
│   └── EmptyState.tsx
├── stores/
│   ├── authStore.ts
│   ├── profileStore.ts   # clearError() 추가
│   ├── goalStore.ts      # clearError() 추가
│   ├── mealStore.ts
│   ├── exerciseStore.ts
│   ├── weightStore.ts
│   ├── summaryStore.ts
│   ├── healthStore.ts
│   ├── aiStore.ts
│   └── feedbackStore.ts  # 주간 피드백 액션 추가
├── __tests__/
│   ├── utils/calculations.test.ts
│   ├── logic/
│   │   ├── estimate-calories.test.ts
│   │   ├── daily-feedback.test.ts
│   │   └── weekly-feedback.test.ts
│   └── stores/
│       ├── aiStore.test.ts
│       └── feedbackStore.test.ts
└── types/
    └── database.ts       # 9개 테이블 TypeScript 타입

supabase/functions/
├── _shared/
│   ├── estimate-calories.logic.ts  # 순수 함수 (Jest 테스트 가능)
│   ├── daily-feedback.logic.ts
│   └── weekly-feedback.logic.ts
├── estimate-calories/    # 배포 완료
├── generate-daily-feedback/   # 배포 완료
└── generate-weekly-feedback/  # 구현 완료, 배포 대기
```

---

## 남은 작업

| 우선순위 | 내용 | 비고 |
|---------|------|------|
| 즉시 | **Edge Function 배포** | `supabase functions deploy generate-weekly-feedback` |
| 높음 | **수동 테스트** | `docs/test-checklist.md` · 기기 필요 항목 |
| 낮음 | **배포 준비** | EAS Build, 앱 아이콘, App Store 제출 |
| 추후 | 백그라운드 Health 동기화, Android Health Connect | |

> 상세 잔여 작업: `docs/remaining-tasks.md`

---

## 환경 & 외부 서비스

| 항목 | 내용 |
|------|------|
| Expo SDK | 53 |
| React Native | 0.79.6 |
| Supabase 프로젝트 | `ymhvepzhtorrdanvgluf` |
| OpenAI 모델 | gpt-4o-mini |
| OpenAI API Key | Supabase Secrets에 등록됨 (`OPENAI_API_KEY`) |
| HealthKit | iOS 전용, 네이티브 빌드(`npx expo run:ios`) 필요 |
| 테스트 | `npm test` (Jest 51개, ~0.7초) |
