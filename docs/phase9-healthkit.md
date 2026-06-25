# Phase 9 — Apple HealthKit 연동

## 목표

Apple Health 앱의 운동 기록과 체중 데이터를 자동으로 가져와  
수동 입력 부담을 줄이고, 중복 없이 DB에 동기화한다.

---

## 라이브러리

**`react-native-health`** 사용.

```bash
npx expo install react-native-health
```

`app.json`에 권한 설명 추가 필요:
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSHealthShareUsageDescription": "운동 및 체중 데이터를 가져와 칼로리 계산에 활용합니다.",
        "NSHealthUpdateUsageDescription": "칼로리 목표 달성 데이터를 Apple Health에 기록합니다."
      }
    }
  }
}
```

네이티브 재빌드(`npx expo run:ios`) 필요.

---

## 동기화 범위

| HealthKit 데이터 | 용도 | 저장 테이블 |
|---|---|---|
| 운동 (Workouts) | 소모 칼로리 자동 입력 | `exercise_logs` + `health_workout_sync_logs` |
| 체중 (Body Mass) | 체중 자동 입력 | `weight_logs` |

---

## 중복 방지

`health_workout_sync_logs` 테이블의 `health_workout_id`로 이미 동기화된 운동을 추적.  
동기화 전 해당 ID 존재 여부를 확인해 중복 삽입 방지.

---

## 새 파일 / 변경 파일

| 파일 | 작업 |
|------|------|
| `src/stores/healthStore.ts` | 신규 — HealthKit 권한 요청 및 동기화 로직 |
| `src/app/(tabs)/add-log.tsx` | 기록 화면 상단에 "Health 동기화" 버튼 추가 |
| `app.json` | iOS infoPlist 권한 설명 추가 |

---

## healthStore.ts

```ts
interface HealthState {
  isSyncing: boolean
  lastSyncedAt: string | null
  error: string | null
  requestPermissions: () => Promise<boolean>
  syncWorkouts: (days?: number) => Promise<{ added: number }>
  syncWeight: (days?: number) => Promise<{ added: number }>
}
```

### requestPermissions

```ts
import AppleHealthKit, { HealthKitPermissions } from 'react-native-health'

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Workout,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.BodyMass,
    ],
    write: [],
  },
}

requestPermissions: () =>
  new Promise((resolve) => {
    AppleHealthKit.initHealthKit(PERMISSIONS, (err) => resolve(!err))
  })
```

### syncWorkouts(days = 7)

1. `AppleHealthKit.getSamples` 또는 `getWorkouts`로 최근 N일 운동 조회
2. `health_workout_sync_logs`에서 이미 동기화된 ID 목록 조회
3. 신규 운동만 `exercise_logs`에 삽입
4. `health_workout_sync_logs`에 동기화 기록 저장
5. `calculateAndSave(date)`로 해당 날짜 요약 업데이트

### syncWeight(days = 7)

1. `AppleHealthKit.getWeightSamples`로 최근 N일 체중 조회
2. 날짜별로 가장 최근 측정값만 사용
3. 이미 해당 날짜 체중 기록이 있으면 건너뜀
4. `weight_logs`에 삽입

---

## UI (add-log.tsx 상단)

```
┌─────────────────────────────────────────┐
│ 기록 추가                                 │
│                                          │
│ [  🍎 Apple Health 동기화  ]  (버튼)     │
│  마지막 동기화: 오늘 오전 9:30            │
└─────────────────────────────────────────┘
```

- 버튼 탭 → 권한 없으면 `requestPermissions()` 호출
- 동기화 완료 후 `"운동 N건, 체중 N건 가져왔습니다"` Alert

---

## 권한 흐름

```
앱 첫 실행 또는 동기화 버튼 탭
  └── requestPermissions()
        ├── 허용 → syncWorkouts() + syncWeight()
        └── 거부 → Alert "설정 > 건강에서 권한을 허용해 주세요"
```

---

## 범위 외 (추후)

- 백그라운드 자동 동기화 (Background Tasks) — Phase 12
- HealthKit에 칼로리 데이터 쓰기 (write) — Phase 12
- Android Health Connect 연동 — Phase 13
