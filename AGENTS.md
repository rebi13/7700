# 7700

`main` 은 **순수 웹** 브랜치입니다. React Native / Expo 의존성은 전부 제거되었고,
다시 추가하지 마세요. 네이티브 버전은 `native` 브랜치에 있습니다.

## 스택

- Vite 8 + React 19 + TypeScript 5.6
- TanStack Router (코드 기반 라우트 트리 — `src/router.tsx`)
- Tailwind CSS v4 (CSS-first 설정 — `src/index.css`, `tailwind.config.js` 없음)
- shadcn/ui (`src/components/ui/`, 설정은 `components.json`)
- Zustand · React Hook Form + Zod · Recharts · Supabase

## 규칙

- UI 는 shadcn/ui 컴포넌트를 먼저 찾아 쓰고, 없으면 `npx shadcn@latest add <component>` 로 추가합니다.
- 스타일은 Tailwind 유틸리티 클래스로 작성합니다. CSS Modules 나 인라인 style 객체는 쓰지 않습니다.
- 색은 테마 토큰(`bg-background`, `text-muted-foreground`, `text-deficit`, `text-surplus` 등)을 씁니다.
  하드코딩된 hex 값을 넣지 마세요.
- 화면·폼·차트는 도메인별로 `src/features/<domain>/` 에 둡니다.
  여러 도메인을 조합하는 화면과 레이아웃만 `src/routes/` 에 둡니다.
- 알림은 `toast` (`src/lib/toast.ts`), 확인/취소는 `confirmAction` (`src/components/ConfirmDialog.tsx`) 을 씁니다.
  `window.alert` · `window.confirm` 은 스레드를 막고 앱 디자인과 겉돌므로 쓰지 않습니다.
- 환경 변수는 `VITE_` 접두사를 쓰고 `import.meta.env` 로 읽습니다.
- 커밋 규칙은 `docs/commit-convention.md` 를 따릅니다.

## 검증

```bash
npm run typecheck
npm test
npm run build
```

테스트는 두 프로젝트로 나뉩니다.

- `logic` (node) — `src/__tests__/**/*.test.ts` · 순수 로직과 스토어
- `ui` (jsdom) — `src/__tests__/**/*.test.tsx` · Testing Library 컴포넌트 테스트

한쪽만 돌리려면 `npx jest --selectProjects ui` 를 씁니다.
확장자로 환경이 갈리므로 컴포넌트 테스트는 반드시 `.test.tsx` 로 만듭니다.
스토어를 쓰는 컴포넌트는 `jest.mock('@/lib/supabase', ...)` 로 supabase 를 막습니다
(`import.meta.env` 를 읽어 CJS 로 도는 Jest 에서 로드되지 않습니다).
