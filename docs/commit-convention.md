# 커밋 컨벤션

## 형식

```
타입(스코프): 한국어 제목

본문 (선택사항)
```

- **제목**: 50자 이내, 마침표 없음, 명령형 (동사로 끝냄 — "구현", "추가", "수정", "삭제")
- **본문**: 필요 시 작성, 줄당 72자 이내, "무엇을" 보다 "왜"를 설명

---

## 타입

| 타입 | 설명 |
|------|------|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 추가/수정 |
| `style` | 코드 스타일 변경 (기능 변화 없음) |
| `refactor` | 리팩토링 (기능/버그 변화 없음) |
| `chore` | 빌드, 패키지, 설정 변경 |
| `test` | 테스트 추가/수정 |

---

## 스코프 (선택)

기능 단위를 나타냄. 해당하는 것이 없으면 생략.

`auth` · `onboarding` · `meal` · `exercise` · `weight` · `dashboard` · `stats` · `ai` · `feedback` · `health` · `db` · `router`

---

## 예시

```
feat(auth): 로그인/회원가입 화면 구현

feat(db): 9개 테이블 TypeScript 타입 정의

fix(auth): 앱 재시작 시 세션 복원 안 되는 버그 수정

docs: Phase 2 인증 & 라우팅 가이드 문서 추가

chore: expo-router 누락 의존성 패키지 추가

feat(onboarding): 프로필 입력 화면 및 BMR/TDEE 계산 구현
```

---

## 규칙

- 커밋은 **하나의 논리적 변경** 단위로 작성
- 타입과 제목 사이 콜론 뒤 공백 1개
- 제목 첫 글자 소문자 (타입 제외)
- Co-Author 태그는 항상 포함:
  ```
  Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
  ```
