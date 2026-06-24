# Phase 2: 인증 & 라우팅 구현 가이드

이 문서는 7700 앱의 Supabase 인증 시스템과 Expo Router 네비게이션 구조를 구현하는 방법을 안내합니다.

---

## 📋 목차

1. [파일 구조](#1-파일-구조)
2. [Supabase 클라이언트 설정](#2-supabase-클라이언트-설정)
3. [Auth 스키마 (Zod)](#3-auth-스키마-zod)
4. [Auth Store (Zustand)](#4-auth-store-zustand)
5. [Expo Router 구조 설정](#5-expo-router-구조-설정)
6. [로그인 / 회원가입 화면](#6-로그인--회원가입-화면)
7. [Auth Guard](#7-auth-guard)
8. [검증](#8-검증)

---

## 1. 파일 구조

Phase 2 완료 후 생성되는 파일 목록:

```
src/
├── lib/
│   └── supabase.ts              ← 2.1 Supabase 클라이언트
├── schemas/
│   └── auth.ts                  ← 2.3 Zod 검증 스키마
├── stores/
│   └── authStore.ts             ← 2.2 Auth 상태 관리
└── app/
    ├── _layout.tsx              ← 2.5 Root layout (Auth Guard 포함)
    ├── (auth)/
    │   ├── _layout.tsx          ← Auth 그룹 레이아웃
    │   ├── sign-in.tsx          ← 2.4 로그인 화면
    │   └── sign-up.tsx          ← 2.4 회원가입 화면
    └── (tabs)/
        ├── _layout.tsx          ← Tab navigator
        └── index.tsx            ← 홈 (임시 placeholder)
```

---

## 2. Supabase 클라이언트 설정

**파일:** `src/lib/supabase.ts`

- `@supabase/supabase-js`의 `createClient` 사용
- `AsyncStorage`를 스토리지로 연동 (세션 영속화)
- `react-native-url-polyfill/auto` import (RN 환경 URL 패치)
- `autoRefreshToken: true`, `persistSession: true` 설정
- 환경 변수: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

```ts
// 완성 형태 예시
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

---

## 3. Auth 스키마 (Zod)

**파일:** `src/schemas/auth.ts`

### signInSchema
| 필드 | 규칙 |
|------|------|
| email | 유효한 이메일 형식 |
| password | 최소 6자 |

### signUpSchema
| 필드 | 규칙 |
|------|------|
| email | 유효한 이메일 형식 |
| password | 최소 6자 |
| confirmPassword | password와 일치 (.refine) |

---

## 4. Auth Store (Zustand)

**파일:** `src/stores/authStore.ts`

### 상태 (State)
| 필드 | 타입 | 설명 |
|------|------|------|
| session | `Session \| null` | 현재 Supabase 세션 |
| user | `User \| null` | 현재 사용자 |
| isLoading | `boolean` | 인증 작업 중 여부 |
| error | `string \| null` | 에러 메시지 |

### 액션 (Actions)
| 함수 | 설명 |
|------|------|
| `initialize()` | 앱 시작 시 세션 복원, `onAuthStateChange` 리스너 등록 |
| `signUp(email, password)` | 회원가입 후 자동 로그인 |
| `signIn(email, password)` | 이메일/비밀번호 로그인 |
| `signOut()` | 로그아웃 및 세션 초기화 |
| `clearError()` | 에러 초기화 |

### 세션 변경 구독
`supabase.auth.onAuthStateChange`로 외부 세션 변경(토큰 만료, 다른 탭 로그아웃 등)을 자동 반영.

---

## 5. Expo Router 구조 설정

### 5.1 Root Layout — `src/app/_layout.tsx`

- `useEffect`에서 `authStore.initialize()` 호출 (세션 복원)
- `<Stack>` 렌더링
- Auth Guard 로직 포함 (아래 2.6 참조)

### 5.2 Auth 그룹 — `src/app/(auth)/_layout.tsx`

- 비인증 화면 전용 레이아웃
- 헤더 숨김 처리

### 5.3 Tab 그룹 — `src/app/(tabs)/_layout.tsx`

- `<Tabs>` 컴포넌트
- Phase 2에서는 홈 탭 1개만 (placeholder)
- 이후 Phase에서 탭 추가

### 5.4 홈 placeholder — `src/app/(tabs)/index.tsx`

- 로그인 사용자 이메일 표시
- 로그아웃 버튼
- Phase 5에서 대시보드로 교체

---

## 6. 로그인 / 회원가입 화면

### 6.1 로그인 — `src/app/(auth)/sign-in.tsx`

- `react-hook-form` + `zodResolver(signInSchema)`
- 이메일, 비밀번호 입력 필드
- "로그인" 버튼 → `authStore.signIn()` 호출
- 에러 메시지 표시
- "회원가입" 링크 → `/(auth)/sign-up`으로 이동

### 6.2 회원가입 — `src/app/(auth)/sign-up.tsx`

- `react-hook-form` + `zodResolver(signUpSchema)`
- 이메일, 비밀번호, 비밀번호 확인 입력 필드
- "가입하기" 버튼 → `authStore.signUp()` 호출
- 에러 메시지 표시
- "로그인" 링크 → `/(auth)/sign-in`으로 이동

> **스타일**: Phase 2는 기능 검증이 목적이므로 최소한의 스타일 적용. UX 개선은 Phase 12에서 진행.

---

## 7. Auth Guard

**위치:** `src/app/_layout.tsx` 내부 (`useEffect` + `useRouter`)

### 리다이렉션 로직

```
앱 시작
  └─ initialize() 실행 (세션 복원)
       ├─ 세션 있음 → /(tabs) 이동
       └─ 세션 없음 → /(auth)/sign-in 이동

로그인 성공
  └─ onAuthStateChange 발생 → /(tabs) 이동

로그아웃
  └─ onAuthStateChange 발생 → /(auth)/sign-in 이동
```

### 구현 방식

`useSegments` + `useRouter` (Expo Router)로 현재 경로를 감지하여 조건부 리다이렉션.

```ts
// 핵심 로직
const inAuthGroup = segments[0] === '(auth)'

if (!session && !inAuthGroup) {
  router.replace('/(auth)/sign-in')
} else if (session && inAuthGroup) {
  router.replace('/(tabs)')
}
```

---

## 8. 검증

### 체크리스트

- [ ] 회원가입 → `auth.users` 테이블에 사용자 생성 확인 (Supabase Dashboard)
- [ ] 로그인 → 홈 탭으로 이동
- [ ] 로그아웃 → 로그인 화면으로 이동
- [ ] 앱 재시작 → 로그인 상태 유지 (AsyncStorage 세션 복원)
- [ ] 잘못된 이메일 형식 → Zod 에러 표시
- [ ] 비밀번호 불일치 → Zod 에러 표시
- [ ] 존재하지 않는 계정 로그인 → Supabase 에러 표시
- [ ] Auth Guard: 비로그인 상태에서 `/(tabs)` 직접 접근 시 로그인 화면으로 리다이렉션

---

## 참고

- [Expo Router 공식 문서](https://docs.expo.dev/router/introduction/)
- [Supabase Auth with React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- 전체 로드맵: `docs/phase-roadmap.md`
