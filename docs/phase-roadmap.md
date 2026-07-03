# 7700 MVP 개발 로드맵

전체 구현 계획을 Phase별로 정리한 문서입니다.

---

## ✅ Phase 0: 프로젝트 기초 설정 (완료)

**기간:** 1-2일차

**완료 항목:**
- [x] Expo 프로젝트 생성 (TypeScript 템플릿)
- [x] 필수 패키지 설치
  - @supabase/supabase-js, AsyncStorage, url-polyfill
  - zustand, react-hook-form, zod
  - expo-router
- [x] src 폴더 구조 생성
- [x] 환경 변수 설정 (.env)
- [x] TypeScript path alias 설정 (@/*)
- [x] Expo 서버 실행 검증

**커밋:** `Initial setup: Phase 0 complete`

---

## ✅ Phase 1: Backend 인프라 구축 (완료)

**기간:** 3-5일차

**목표:** Supabase 데이터베이스 스키마 및 보안 정책 설정

### 작업 목록

- [ ] **1.1** Supabase SQL Editor에서 테이블 생성 (9개)
  - profiles, goals, meal_logs, exercise_logs, weight_logs
  - daily_summaries, llm_parse_logs, llm_feedbacks, health_workout_sync_logs

- [ ] **1.2** 인덱스 생성 (성능 최적화)
  - meal_logs, exercise_logs, weight_logs, daily_summaries, goals

- [ ] **1.3** RLS 정책 설정 (모든 테이블)
  - SELECT, INSERT, UPDATE, DELETE 정책

- [ ] **1.4** Supabase Auth 활성화
  - Email/Password 인증 활성화
  - 이메일 확인 비활성화 (MVP)

- [ ] **1.5** TypeScript 타입 정의
  - `src/types/database.ts` 작성
  - 모든 테이블의 Row, Insert, Update 타입

**가이드:** `docs/phase1-supabase-setup.md` 참조

**검증:**
- Supabase Dashboard에서 9개 테이블 확인
- RLS 정책 적용 확인
- 테스트 계정으로 데이터 INSERT 시도

---

## ✅ Phase 2: 인증 & 라우팅 (완료)

**기간:** 6-8일차

**목표:** 사용자 인증 시스템 및 앱 네비게이션 구현

### 작업 목록

- [ ] **2.1** Supabase 클라이언트 설정
  - `src/lib/supabase.ts` 구현
  - AsyncStorage 연동
  - 세션 자동 새로고침 설정

- [ ] **2.2** Auth Store (Zustand)
  - `src/stores/authStore.ts` 구현
  - signUp, signIn, signOut 함수
  - 세션 상태 관리

- [ ] **2.3** Auth 스키마 (Zod)
  - `src/schemas/auth.ts` 구현
  - 이메일/비밀번호 검증

- [ ] **2.4** 로그인/회원가입 화면
  - `src/app/(auth)/sign-in.tsx`
  - `src/app/(auth)/sign-up.tsx`
  - React Hook Form 적용

- [ ] **2.5** Expo Router 구조 설정
  - `src/app/_layout.tsx` (Root layout)
  - `src/app/(tabs)/_layout.tsx` (Tab navigator)
  - 화면 폴더 구조 생성

- [ ] **2.6** Auth Guard
  - 세션 체크
  - 리다이렉션 로직 (sign-in ↔ onboarding ↔ tabs)

**검증:**
- 회원가입 → 로그인 → 로그아웃 플로우 동작
- 앱 재시작 시 세션 유지 확인
- Auth guard 리다이렉션 동작

---

## ✅ Phase 3: 온보딩 플로우 (완료)

**기간:** 9-11일차

**목표:** 사용자 프로필 및 목표 설정

### 작업 목록

- [ ] **3.1** 계산 유틸리티
  - `src/utils/calculations.ts` 구현
  - calculateBMR (Mifflin-St Jeor 공식)
  - calculateTDEE
  - calculateAge, calculateDailyDeficit 등

- [ ] **3.2** 날짜 유틸리티
  - `src/utils/date.ts` 구현
  - 날짜 포맷팅, 계산 함수

- [ ] **3.3** Profile Store
  - `src/stores/profileStore.ts` 구현
  - fetchProfile, updateProfile
  - BMR, TDEE 자동 계산

- [ ] **3.4** Goal Store
  - `src/stores/goalStore.ts` 구현
  - fetchActiveGoal, createGoal, updateGoal
  - 남은 일수, 필요 적자 계산

- [ ] **3.5** 온보딩 스키마 (Zod)
  - `src/schemas/onboarding.ts` 구현
  - 프로필, 목표 검증 규칙

- [ ] **3.6** 프로필 입력 화면
  - `src/app/(onboarding)/index.tsx`
  - 키, 체중, 생년월일, 성별, 활동 수준 입력

- [ ] **3.7** 목표 설정 화면
  - `src/app/(onboarding)/goal.tsx`
  - 목표 체중, 목표일 입력
  - 자동 계산 표시 (감량량, 일일 적자)

**검증:**
- 온보딩 완료 후 profiles, goals 테이블 저장 확인
- BMR/TDEE 계산 정확도 검증
- 완료 후 홈 화면 이동 확인

---

## ✅ Phase 4: 핵심 로깅 - 수동 입력 (완료)

**기간:** 12-16일차

**목표:** 식사, 운동, 체중 기록 CRUD 구현

### 작업 목록

**4.1 식사 기록**
- [ ] Meal Store (`src/stores/mealStore.ts`)
- [ ] Meal 스키마 (`src/schemas/meal.ts`)
- [ ] MealForm 컴포넌트
- [ ] MealList 컴포넌트

**4.2 운동 기록**
- [ ] Exercise Store (`src/stores/exerciseStore.ts`)
- [ ] Exercise 스키마 (`src/schemas/exercise.ts`)
- [ ] ExerciseForm 컴포넌트
- [ ] ExerciseList 컴포넌트

**4.3 체중 기록**
- [ ] Weight Store (`src/stores/weightStore.ts`)
- [ ] Weight 스키마 (`src/schemas/weight.ts`)
- [ ] WeightForm 컴포넌트
- [ ] WeightList 컴포넌트
- [ ] 7일 평균 계산 함수

**4.4 기록 추가 화면**
- [ ] `src/app/(tabs)/add-log.tsx`
- [ ] Tab 선택 (식사/운동/체중)
- [ ] 날짜 선택
- [ ] 폼 표시 및 저장

**검증:**
- 각 타입별 추가/수정/삭제 동작
- 데이터베이스 저장 확인
- 날짜별 필터링
- 빈 상태 처리

---

## ✅ Phase 5: 대시보드 & 계산 (완료)

**기간:** 17-20일차

**목표:** 일일 칼로리 계산 및 진행 상황 표시

### 작업 목록

- [ ] **5.1** Summary Store
  - `src/stores/summaryStore.ts` 구현
  - calculateDailySummary 함수
  - 누적 적자 계산
  - daily_summaries 테이블 upsert

- [ ] **5.2** 대시보드 화면
  - `src/app/(tabs)/index.tsx` 구현
  - 오늘 칼로리 카드
  - 적자/초과 카드
  - 누적 진행 카드
  - 목표 진행 카드
  - 빠른 작업 버튼

- [ ] **5.3** 대시보드 컴포넌트
  - CalorieCard, DeficitCard, ProgressCard 등

**검증:**
- 여러 날짜 데이터 입력 후 계산 정확도 확인
- 누적 적자 계산 검증
- 예상 vs 실제 감량량 비교
- 목표 진행률 정확도

---

## ✅ Phase 6: 통계 & 차트 (완료)

**기간:** 21-24일차

**목표:** 시각적 데이터 분석 제공

### 작업 목록

- [ ] **6.1** 차트 라이브러리 설치
  - react-native-gifted-charts 설치

- [ ] **6.2** Stats Store
  - `src/stores/statsStore.ts` 구현
  - 날짜 범위별 데이터 fetch
  - 7일 평균 계산
  - 주간/월간 집계

- [ ] **6.3** 차트 컴포넌트
  - WeightChart (체중 + 7일 평균)
  - DeficitChart (일일 적자/초과)
  - CumulativeDeficitChart (누적 적자)

- [ ] **6.4** 통계 화면
  - `src/app/(tabs)/stats.tsx` 구현
  - 차트 표시
  - 날짜 범위 선택
  - 요약 카드

**검증:**
- 차트 렌더링 확인
- 데이터 정확도
- 날짜 범위 선택 동작
- 빈 데이터 처리

---

## ✅ Phase 7: Supabase Edge Functions (완료)

**기간:** 25-27일차

**목표:** LLM 통합을 위한 백엔드 준비

### 작업 목록

- [ ] **7.1** Supabase CLI 설치 및 설정
  - supabase login
  - supabase init
  - supabase link

- [ ] **7.2** Edge Functions 생성
  - parse-health-log
  - generate-daily-feedback
  - generate-weekly-feedback

- [ ] **7.3** OpenAI API Key 설정
  - Supabase Secret 등록
  - `supabase secrets set OPENAI_API_KEY=...`

- [ ] **7.4** parse-health-log 구현
  - JSON Schema 정의
  - OpenAI Structured Outputs 사용
  - 한국어 음식/운동 파싱

- [ ] **7.5** 로컬 테스트
  - `supabase functions serve`
  - curl로 테스트

- [ ] **7.6** 배포
  - `supabase functions deploy`

**검증:**
- 다양한 자연어 입력 테스트
- JSON schema 준수 확인
- 에러 핸들링
- 응답 속도 (5초 이내)

---

## ✅ Phase 8: AI 칼로리 추정 (완료)

**기간:** 28-31일차

**목표:** LLM 기반 간편 기록 입력

### 작업 목록

- [ ] **8.1** AI 라이브러리
  - `src/lib/ai.ts` 구현
  - parseHealthLog 함수

- [ ] **8.2** AI Input Store
  - `src/stores/aiInputStore.ts` 구현
  - 입력, 파싱 결과, 로딩 상태

- [ ] **8.3** AI 입력 화면
  - `src/app/ai-input.tsx` 구현
  - 텍스트 입력
  - 예시 표시
  - 분석하기 버튼

- [ ] **8.4** 확인 화면
  - 파싱 결과 표시 (식사/운동/체중)
  - 수정 가능한 폼
  - Confidence 표시
  - 모두 저장 버튼

- [ ] **8.5** 저장 로직
  - meal_logs, exercise_logs, weight_logs 삽입
  - llm_parse_logs 저장
  - 일일 요약 재계산

**검증:**
- 다양한 입력 테스트
- 수정 기능 동작
- 저장 후 대시보드 반영
- 에러 처리

---

## ✅ Phase 9: LLM 피드백 시스템 (완료)

**기간:** 32-35일차

**목표:** AI 기반 일일/주간 피드백 생성

### 작업 목록

- [ ] **9.1** generate-daily-feedback Function
  - Edge Function 구현
  - 일일 데이터 조회
  - 프롬프트 작성
  - 피드백 생성

- [ ] **9.2** generate-weekly-feedback Function
  - Edge Function 구현
  - 주간 데이터 조회 및 분석
  - 패턴 감지
  - 피드백 생성

- [ ] **9.3** Feedback Store
  - `src/stores/feedbackStore.ts` 구현
  - generateDailyFeedback
  - generateWeeklyFeedback
  - fetchFeedback

- [ ] **9.4** 피드백 UI
  - 대시보드에 오늘의 피드백 카드
  - 통계 화면에 주간 피드백
  - 생성 버튼

**검증:**
- 다양한 시나리오 테스트
- 피드백 품질 평가
- 빈 데이터 처리

---

## ✅ Phase 10: Apple Health 통합 (완료)

**기간:** 36-38일차

**목표:** Apple Health에서 운동 기록 가져오기

### 작업 목록

- [ ] **10.1** react-native-health 설치
  - `npx expo install react-native-health`
  - Development Build 필요 여부 확인

- [ ] **10.2** Health Store
  - `src/stores/healthStore.ts` 구현
  - initHealthKit
  - getRecentWorkouts
  - 권한 요청

- [ ] **10.3** 운동 가져오기 화면
  - `src/features/health/ImportWorkouts.tsx`
  - 최근 운동 목록 표시
  - 체크박스 선택
  - 가져오기 버튼

- [ ] **10.4** 중복 방지 로직
  - health_workout_sync_logs 체크
  - exercise_logs 삽입
  - 동기화 로그 저장

- [ ] **10.5** 설정 화면 통합
  - "Apple Health에서 가져오기" 버튼

**검증:**
- 실제 iPhone에서 테스트
- 권한 요청 동작
- 운동 가져오기 성공
- 중복 방지 동작
- 대시보드 반영

---

## ✅ Phase 11: 목표 & 프로필 관리 (완료)

**기간:** 39-40일차

**목표:** 사용자가 목표와 프로필을 수정할 수 있도록

### 작업 목록

- [ ] **11.1** 목표 수정 화면
  - `src/features/goal/EditGoal.tsx`
  - 목표 체중, 목표일 수정
  - 자동 재계산
  - 새 목표 만들기 옵션

- [ ] **11.2** 프로필 수정 화면
  - `src/features/profile/EditProfile.tsx`
  - 현재 체중 수정 (weight_log 자동 추가)
  - 활동 수준 수정 (TDEE 재계산)

- [ ] **11.3** 설정 화면
  - `src/app/(tabs)/settings.tsx`
  - 프로필 섹션
  - 목표 섹션
  - 계정 섹션 (로그아웃, 탈퇴)
  - 데이터 섹션 (데이터 삭제)
  - 정보 섹션 (버전, 개인정보처리방침)

**검증:**
- 목표 수정 후 재계산 확인
- 활동 수준 변경 시 TDEE 업데이트
- 로그아웃 동작
- 데이터 삭제 동작

---

## ✅ Phase 12: UX 개선 (완료)

**기간:** 41-44일차

**목표:** 사용자 경험 향상

### 작업 목록

- [x] 로딩 스켈레톤 추가 (`SkeletonCard` — 홈·통계·설정 화면)
- [x] 에러 핸들링 강화 (`ErrorBanner` — 인라인 에러 + 닫기)
- [x] 빈 상태 처리 (`EmptyState` — 메시지 + 서브텍스트)
- [ ] 날짜 피커 UX 개선 (Post-MVP)
- [x] 폼 자동 포커스, 키보드 dismiss (기록·설정 화면 포커스 체인)
- [ ] 접근성 개선 (레이블, 색상 대비, 터치 영역) (Post-MVP)

---

## ⏭️ Phase 13: 엣지 케이스 처리 (MVP 범위 외)

**기간:** 45-46일차

**목표:** 예외 상황 대응

### 작업 목록

- [ ] 미래 날짜 입력 처리
- [ ] 과거 1년 이상 데이터 처리
- [ ] 비정상적인 값 검증
- [ ] 하루 여러 번 체중 측정 처리
- [ ] 네트워크 오프라인 상태 처리
- [ ] 동시 편집 충돌 해결

---

## ⚠️ Phase 14: 테스트 (자동화 완료 · 수동 진행 중)

**기간:** 47-49일차

**목표:** 종합 테스트

### 자동화 테스트 (`npm test` — Jest 51개 ✅)

- [x] BMR·TDEE·적자 계산 유닛 테스트 (8개)
- [x] AI 칼로리 추정 로직 테스트 (7개)
- [x] 일일 피드백 로직 테스트 (9개)
- [x] 주간 피드백 로직 테스트 (12개)
- [x] aiStore Supabase mock 테스트 (4개)
- [x] feedbackStore 일별·주별 테스트 (11개)

### 수동 테스트 체크리스트 (기기 필요)

- [ ] 회원가입/로그인/로그아웃
- [ ] 온보딩 완료
- [ ] 식사/운동/체중 CRUD + 수정·삭제
- [ ] 대시보드 계산 정확도
- [ ] 차트 렌더링
- [ ] AI 칼로리 추정 버튼 동작
- [ ] 일일·주간 AI 피드백 생성
- [ ] Apple Health 가져오기
- [ ] 목표/프로필 수정 → 홈 화면 반영
- [ ] RLS 정책 (타 사용자 데이터 접근 불가)

### 성능 벤치마크

- [ ] 대시보드 로드 < 1초
- [ ] 차트 렌더링 < 2초
- [ ] AI 파싱 < 5초
- [ ] 앱 시작 < 2초

---

## 📌 Phase 15: 배포 준비

**기간:** 50-52일차

**목표:** 프로덕션 배포

### 작업 목록

**15.1 환경 설정**
- [ ] Production Supabase 설정
- [ ] Production OpenAI API Key
- [ ] 디버그 로그 제거

**15.2 앱 설정**
- [ ] 앱 아이콘 디자인 및 적용
- [ ] 스플래시 화면
- [ ] Bundle ID 설정
- [ ] Version 1.0.0

**15.3 iOS 빌드**
- [ ] EAS CLI 설치
- [ ] `eas build:configure`
- [ ] `eas build --platform ios`
- [ ] TestFlight 테스트

**15.4 App Store 준비**
- [ ] 스크린샷 (필수 크기)
- [ ] 앱 설명 (한국어)
- [ ] 개인정보 처리방침 작성
- [ ] 지원 URL

**15.5 문서화**
- [ ] README
- [ ] 환경 변수 가이드
- [ ] Supabase 설정 가이드
- [ ] Edge Functions 배포 가이드

---

## 🚀 Post-MVP 기능

### 우선순위

1. **푸시 알림** - 일일 기록 리마인더
2. **식단 사진 분석** - LLM Vision API
3. **자동 Health 동기화** - 백그라운드 fetch
4. **데이터 내보내기** - CSV, PDF
5. **다크 모드**
6. **음식 DB 통합** - 영양 정보 API
7. **바코드 스캔**
8. **위젯** - iOS 홈 화면
9. **Watch 앱**
10. **소셜 기능** - 진행 상황 공유

---

## 📊 진행 상황

- **Phase 0**: ✅ 완료 — 프로젝트 초기 설정
- **Phase 1**: ✅ 완료 — Supabase 스키마 9개 테이블, RLS, 타입
- **Phase 2**: ✅ 완료 — 이메일 인증, Expo Router, Auth Guard
- **Phase 3**: ✅ 완료 — 온보딩, BMR/TDEE 계산
- **Phase 4**: ✅ 완료 — 식사·운동·체중 수동 CRUD
- **Phase 5**: ✅ 완료 — 대시보드, 일일 요약 계산
- **Phase 6**: ✅ 완료 — 통계 3종 차트
- **Phase 7**: ✅ 완료 — estimate-calories Edge Function 배포
- **Phase 8**: ✅ 완료 — AI 칼로리 추정 (원래 계획과 다르게 구현)
- **Phase 9**: ✅ 완료 — 일일·주간 AI 피드백 (HealthKit도 포함)
- **Phase 10**: ✅ 완료 — Apple HealthKit 운동·체중 동기화
- **Phase 11**: ✅ 완료 — 설정 화면, 기록 목록·수정·삭제
- **Phase 12**: ✅ 완료 — SkeletonCard·ErrorBanner·키보드 UX
- **Phase 13**: ⏭️ MVP 범위 외 — 배포 후 검토
- **Phase 14**: ⚠️ 자동화 51개 완료 · 수동 테스트 진행 중
- **Phase 15**: 📋 대기 중 — Edge Function 배포 후 시작

**실제 구현 기간:** 2026-06-23 ~ 2026-07-03 (11일)
**다음 단계:** `docs/remaining-tasks.md` 참조
