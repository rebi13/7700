# Phase 6 — 통계 & 차트

## 목표

체중 추이와 칼로리 적자 현황을 차트로 시각화하는 통계 탭을 구현한다.

---

## 라이브러리

**`react-native-gifted-charts`** 선택.

- `react-native-svg`를 peer dependency로 사용 (Expo 기본 지원)
- Expo managed workflow와 호환, 별도 네이티브 설정 불필요
- LineChart / BarChart 모두 지원

```bash
npx expo install react-native-svg
npm install react-native-gifted-charts
```

---

## 새 파일 / 변경 파일

| 파일 | 작업 |
|------|------|
| `src/app/(tabs)/stats.tsx` | 신규 — 통계 화면 |
| `src/app/(tabs)/_layout.tsx` | 탭 아이콘 추가 (홈·기록·통계) |
| `src/stores/summaryStore.ts` | `recentSummaries` + `fetchRecentSummaries` 추가 |

---

## summaryStore 확장

```ts
interface SummaryState {
  // 기존
  todaySummary: DailySummaryRow | null
  isLoading: boolean
  error: string | null
  fetchSummary: (date: string) => Promise<void>
  calculateAndSave: (date: string) => Promise<void>

  // 신규
  recentSummaries: DailySummaryRow[]
  fetchRecentSummaries: (days?: number) => Promise<void>
}
```

`fetchRecentSummaries(days = 30)`:
1. `summary_date >= today - days` 조건으로 `daily_summaries` 조회
2. `ascending: true` 정렬
3. `recentSummaries` 상태 업데이트

---

## 차트 구성 (stats.tsx)

### 1. 체중 추이 (LineChart)
- 데이터: `weightStore.recentLogs` (최근 30일, `fetchRecentLogs(30)`)
- x축: 날짜 (MM/DD), y축: 체중 (kg)
- 데이터 없을 경우: "체중 기록이 없습니다" 안내 텍스트

### 2. 일별 칼로리 적자/초과 (BarChart)
- 데이터: `recentSummaries` 최근 7일의 `calorie_delta`
- 양수(적자): 초록색 `#10b981`, 음수(초과): 빨간색 `#ef4444`
- x축: 날짜 (MM/DD), y축: kcal

### 3. 누적 칼로리 적자 (LineChart)
- 데이터: `recentSummaries`의 `cumulative_delta`
- 기간: 목표 시작일 이후 또는 최근 30일
- 0 기준선 표시

---

## 탭 아이콘

`@expo/vector-icons`의 `Ionicons` 사용 (Expo 기본 포함).

```tsx
// _layout.tsx
import { Ionicons } from '@expo/vector-icons'

<Tabs.Screen
  name="index"
  options={{
    tabBarLabel: '홈',
    tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
  }}
/>
<Tabs.Screen
  name="add-log"
  options={{
    tabBarLabel: '기록',
    tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} />,
  }}
/>
<Tabs.Screen
  name="stats"
  options={{
    tabBarLabel: '통계',
    tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />,
  }}
/>
```

---

## 화면 구조 (stats.tsx)

```
SafeAreaView
└── ScrollView
    ├── 헤더: "통계"
    ├── [체중 추이] 카드
    │   ├── 제목 + 기간 선택 (7일 / 30일)
    │   └── LineChart
    ├── [일별 칼로리] 카드
    │   ├── 제목 "최근 7일 칼로리 적자/초과"
    │   └── BarChart
    └── [누적 적자] 카드
        ├── 제목 "누적 칼로리 적자"
        └── LineChart
```

---

## 데이터 흐름

```
stats.tsx 마운트
  └── useFocusEffect
        ├── weightStore.fetchRecentLogs(30)
        └── summaryStore.fetchRecentSummaries(30)
```

---

## 범위 외 (추후)

- 영양소(단백질/탄수화물/지방) 파이 차트 — Phase 9
- 운동 종류별 통계 — Phase 9
