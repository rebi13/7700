# Phase 10 — 설정 화면

## 목표

프로필·목표를 앱 내에서 수정하고, 로그아웃할 수 있는 설정 탭을 추가한다.

---

## 새 파일 / 변경 파일

| 파일 | 작업 |
|------|------|
| `src/app/(tabs)/settings.tsx` | 신규 — 설정 탭 메인 화면 |
| `src/app/(tabs)/_layout.tsx` | settings 탭 추가 (gear 아이콘) |

스토어·스키마는 모두 기존 것을 재사용하며 새로 만드는 파일 없음.

---

## 화면 구성

```
설정

┌─ 프로필 ──────────────────────────┐
│ 키            175 cm              │
│ 현재 체중      70.5 kg             │
│ 생년월일       1990-01-01          │
│ 성별           남성                │
│ 활동 수준      보통                 │
│                        [수정 →]   │
└────────────────────────────────────┘

┌─ 목표 ────────────────────────────┐
│ 목표 체중      65 kg               │
│ 목표일         2026-12-31          │
│ 남은 일수      188일               │
│ 일일 필요 적자  520 kcal            │
│                        [수정 →]   │
└────────────────────────────────────┘

┌─ 계정 ────────────────────────────┐
│ [로그아웃]                         │
└────────────────────────────────────┘
```

"수정 →" 탭 → Modal 시트가 올라옴 (각 섹션별 별도 모달).

---

## 모달 1: 프로필 수정

**필드**

| 필드 | 타입 | 스키마 |
|------|------|--------|
| 키 (cm) | number-pad | 100–250 |
| 현재 체중 (kg) | decimal-pad | 30–300 |
| 생년월일 | DateTimePicker(date) | 과거 날짜 |
| 성별 | chip (남/여/기타) | enum |
| 활동 수준 | chip 5종 | enum |

**저장 동작**

```
updateProfile(data) 호출
→ 체중이 변경된 경우 weightStore.addLog({ weight_date: today, weight_kg: ... }) 도 호출
→ summaryStore.calculateAndSave(today)
```

스키마: 기존 `onboarding.ts`의 `profileSchema` 그대로 재사용.

---

## 모달 2: 목표 수정

**필드**

| 필드 | 타입 | 스키마 |
|------|------|--------|
| 목표 체중 (kg) | decimal-pad | 30–300 |
| 목표일 | DateTimePicker(date) | 오늘 이후 |

**저장 동작**

```
goalStore.updateGoal({ target_weight_kg, target_date }) 호출
(기존 활성 목표를 업데이트. 새 목표 생성 없음)
```

스키마: 기존 `onboarding.ts`의 `goalSchema` 재사용.

---

## 로그아웃

```
Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
  { text: '취소', style: 'cancel' },
  { text: '로그아웃', style: 'destructive', onPress: () => authStore.signOut() }
])
```

`signOut()` 완료 시 `_layout.tsx`의 auth guard가 자동으로 sign-in 화면으로 리다이렉트.

---

## 탭 추가

`_layout.tsx`에 settings 탭 추가:

```tsx
<Tabs.Screen
  name="settings"
  options={{
    tabBarLabel: '설정',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="settings-outline" size={size} color={color} />
    ),
  }}
/>
```

탭 순서: 홈 / 기록 / 통계 / **설정**

---

## 데이터 로드

`useFocusEffect`로 화면 진입 시 항상 최신 데이터 로드:

```ts
useFocusEffect(useCallback(() => {
  fetchProfile()
  fetchActiveGoal()
}, []))
```

---

## 범위 외 (추후)

- 계정 탈퇴
- 데이터 전체 삭제
- 알림 설정
