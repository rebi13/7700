# 7700

> 칼로리 추적 및 AI 피드백 웹 애플리케이션

**7700**은 개인 칼로리 관리 및 다이어트 목표 달성을 위한 웹 애플리케이션입니다.

## 주요 기능

- **식사/운동/체중 기록**: 일일 칼로리 섭취 및 소모 추적
- **AI 칼로리 추정**: 음식명 입력 시 자동 칼로리 계산 (OpenAI gpt-4o-mini)
- **일일/주간 AI 피드백**: 식단 분석 및 개선 제안
- **통계 차트**: 체중 변화, 칼로리 적자/초과, 누적 추이 시각화
- **목표 관리**: 목표 체중 설정 및 진행 상황 추적

## 시작하기

### 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 입력하세요:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Supabase 프로젝트 설정은 [개발 가이드](docs/개발-가이드.md#-supabase-설정)를 참고하세요.

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:8081 접속

### 테스트 실행

```bash
# 모든 테스트 실행
npm test

# Watch 모드로 실행
npm test:watch
```

## 기술 스택

### 프론트엔드
- **Vite** (v8) + **React** 19.0 + **TypeScript** 5.6
- **TanStack Router** (코드 기반 라우팅)
- **Tailwind CSS** v4 + **shadcn/ui**
- **Zustand** (상태 관리)
- **React Hook Form** + **Zod** (폼 검증)
- **Recharts** (차트)

### 백엔드
- **Supabase** (PostgreSQL, Auth, Edge Functions)
- **OpenAI API** (gpt-4o-mini)

## 문서

- [개발 가이드](docs/개발-가이드.md) - 기술 스택, 데이터베이스 스키마, 개발 가이드
- [제품 개요](docs/제품-개요.md) - 제품 철학 및 상세 기능 명세
- [커밋 컨벤션](docs/commit-convention.md) - Git 커밋 메시지 작성 규칙

## 프로젝트 구조

```
7700/
├── src/
│   ├── router.tsx             # TanStack Router 라우트 트리
│   ├── index.css              # Tailwind v4 + 테마 토큰
│   ├── routes/                # 레이아웃 및 여러 도메인을 조합하는 화면
│   ├── features/              # 도메인별 화면·폼·차트
│   │   ├── auth/  onboarding/  goal/  dashboard/
│   │   └── meal/  exercise/  weight/  ai-log/  stats/
│   ├── components/
│   │   └── ui/                # shadcn/ui 생성 컴포넌트
│   ├── lib/                   # Supabase 클라이언트, 유틸
│   ├── schemas/               # Zod 검증 스키마
│   ├── stores/                # Zustand 스토어
│   ├── types/                 # TypeScript 타입
│   └── utils/                 # 유틸리티 (계산, 날짜)
├── public/                    # 정적 파일
├── supabase/
│   └── functions/             # Edge Functions
│       ├── estimate-calories/
│       ├── generate-daily-feedback/
│       └── generate-weekly-feedback/
└── docs/                      # 개발 문서
```

## 주요 계산 로직

### BMR (기초 대사량)
Mifflin-St Jeor 공식 사용:
- 남성: `10 × 체중(kg) + 6.25 × 키(cm) - 5 × 나이 + 5`
- 여성: `10 × 체중(kg) + 6.25 × 키(cm) - 5 × 나이 - 161`

### TDEE (총 에너지 소비량)
BMR × 활동 수준 계수:
- 거의 운동 안 함: 1.2
- 주 1-3일 가벼운 운동: 1.375
- 주 3-5일 보통 운동: 1.55
- 주 6-7일 강도 높은 운동: 1.725
- 매일 매우 강도 높은 운동: 1.9

### 예상 체중 변화
누적 칼로리 적자/초과 ÷ 7700kcal = 체중 변화(kg)

## 배포

### Vercel (권장)
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm run build
# dist 폴더를 Netlify에 업로드 (SPA 폴백 리라이트 필요)
```

## 개발 히스토리

- **개발 기간**: 2026-06-23 ~ 2026-07-11 (19일)
- **웹 전환**: 2026-08-08
- **React Native 의존성 완전 제거**: 2026-08-17 (Vite + TanStack Router + Tailwind/shadcn 이관)
- **자동화 테스트**: Jest 51개 통과
- **네이티브 버전**: `native` 브랜치에 백업

## 라이선스

MIT

---

**개발자**: rebi13
**버전**: 1.0.0 (웹 전용)
