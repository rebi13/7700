# 잔여 작업

> 마지막 업데이트: 2026-07-03

---

## 즉시 실행 가능 (기기 불필요)

### Edge Function 배포

```bash
supabase functions deploy generate-weekly-feedback
```

`generate-weekly-feedback` 구현 완료, 배포만 남아 있음.
배포 후 통계 화면 "이번 주 AI 피드백" 카드가 실제 데이터를 반환함.

---

## 수동 테스트 필요 (실기기)

자동화 테스트 범위 밖이며 iOS 기기에서 직접 확인 필요.

### AI 기능 (OpenAI 크레딧 필요)

- [ ] 기록 탭 > "AI 칼로리 추정" 버튼 — 신뢰도 색상(높음·보통·낮음) 포함
- [ ] 홈 화면 "오늘의 AI 피드백" 탭 진입 시 자동 로드
- [ ] 홈 화면 "다시 생성" 버튼 재생성 확인
- [ ] 통계 화면 "이번 주 AI 피드백" 카드 (Edge Function 배포 후)

### Apple HealthKit (네이티브 빌드 필요)

```bash
npx expo run:ios
```

- [ ] HealthKit 권한 요청 팝업 표시
- [ ] 기록 탭 > "Apple Health 동기화" 버튼 동작
- [ ] 운동 데이터 가져오기 + 중복 방지 동작 확인
- [ ] 체중 데이터 가져오기 (날짜별 최신값)

### UX 회귀 테스트

- [ ] 홈 로딩 중 SkeletonCard 3개 표시
- [ ] 기록 탭 폼 포커스 체인 (음식명→칼로리→단백질→탄수화물→지방→메모)
- [ ] 저장 후 키보드 자동 닫힘
- [ ] 탭 전환 시 키보드 자동 닫힘
- [ ] 설정 화면 프로필·목표 로딩 중 SkeletonCard 표시
- [ ] 설정 화면 모달 내 포커스 체인 동작

### 전체 회귀 테스트

- [ ] 회원가입 → 온보딩 → 홈 화면 플로우
- [ ] 식사·운동·체중 추가·수정·삭제
- [ ] 대시보드 칼로리 계산 정확도
- [ ] 통계 차트 3종 렌더링
- [ ] 설정 > 프로필·목표 수정 → 홈 화면 반영 확인

---

## 배포 준비

### 사전 체크
- [ ] `generate-weekly-feedback` 배포 완료 (위 즉시 항목)
- [ ] 수동 테스트 항목 통과

### 앱 설정

- [ ] 앱 아이콘 디자인 및 적용 (`app.json` → `icon`)
- [ ] 스플래시 화면 설정
- [ ] Bundle ID 확정 (예: `com.yourname.7700`)
- [ ] 앱 이름·버전 확정

### EAS Build

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile preview   # TestFlight용
```

- [ ] EAS 계정 생성 및 로그인
- [ ] `eas.json` 설정
- [ ] iOS 빌드 성공
- [ ] TestFlight 업로드 및 내부 테스트

### App Store 제출

- [ ] Apple Developer 계정 등록
- [ ] 스크린샷 (iPhone 6.7" · 6.1" 필수)
- [ ] 앱 설명 작성 (한국어)
- [ ] 개인정보 처리방침 URL (제출 필수 항목)
- [ ] 지원 URL

---

## Post-MVP (배포 후 검토)

| 기능 | 난이도 | 비고 |
|------|--------|------|
| 백그라운드 Health 동기화 | 중 | iOS Background fetch |
| Android Health Connect | 고 | 별도 네이티브 모듈 |
| 푸시 알림 (일일 리마인더) | 중 | Expo Notifications |
| 날짜 피커 UX 개선 | 저 | TextInput → DateTimePicker |
| 접근성 개선 | 중 | VoiceOver 레이블, 색상 대비 |
| 식단 사진 분석 | 고 | LLM Vision API |
| 바코드 스캔 | 고 | 식품 DB 연동 |
| 다크 모드 | 중 | |
