import { useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { LineChart, BarChart } from 'react-native-gifted-charts'
import { useWeightStore } from '@/stores/weightStore'
import { useSummaryStore } from '@/stores/summaryStore'

type PointerItem = { value: number; label?: string }

const formatKcal = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))

export default function StatsScreen() {
  const { width } = useWindowDimensions()
  const chartWidth = width - 80

  const { logs: weightLogs, fetchRecentLogs, isLoading: weightLoading } = useWeightStore()
  const { recentSummaries, fetchRecentSummaries, isLoading: summaryLoading } = useSummaryStore()

  useFocusEffect(
    useCallback(() => {
      fetchRecentLogs(30)
      fetchRecentSummaries(30)
    }, [fetchRecentLogs, fetchRecentSummaries])
  )

  // 체중: 날짜 오름차순, x축 레이블 최대 6개
  const sortedWeightLogs = [...weightLogs].sort((a, b) =>
    a.weight_date.localeCompare(b.weight_date)
  )
  const wStep = Math.max(1, Math.ceil(sortedWeightLogs.length / 6))
  const weightData = sortedWeightLogs.map((log, i) => ({
    value: log.weight_kg,
    label: i % wStep === 0 ? log.weight_date.slice(5).replace('-', '/') : '',
    dataPointText: log.weight_kg.toFixed(1),
  }))

  // 일별 칼로리 적자/초과: 최근 7일
  const last7 = recentSummaries.slice(-7)
  const deltaData = last7.map((summary) => ({
    value: Math.abs(summary.calorie_delta),
    label: summary.summary_date.slice(5).replace('-', '/'),
    frontColor: summary.calorie_delta >= 0 ? '#10b981' : '#ef4444',
    topLabelComponent: () => (
      <Text style={[s.barLabel, { color: summary.calorie_delta >= 0 ? '#10b981' : '#ef4444' }]}>
        {summary.calorie_delta >= 0 ? '-' : '+'}{formatKcal(Math.abs(summary.calorie_delta))}
      </Text>
    ),
  }))

  // 누적 칼로리 적자: x축 레이블 최대 6개
  const cStep = Math.max(1, Math.ceil(recentSummaries.length / 6))
  const cumulativeData = recentSummaries.map((summary, i) => ({
    value: summary.cumulative_delta,
    label: i % cStep === 0 ? summary.summary_date.slice(5).replace('-', '/') : '',
  }))

  const barW = Math.min(36, Math.floor((chartWidth / Math.max(last7.length, 1)) - 12))

  const weightPointerConfig = {
    pointerStripHeight: 150,
    pointerStripColor: '#e2e8f0',
    pointerStripWidth: 1,
    pointerColor: '#3b82f6',
    radius: 6,
    pointerLabelWidth: 90,
    pointerLabelHeight: 36,
    autoAdjustPointerLabelPosition: true,
    pointerLabelComponent: (items: PointerItem[]) => (
      <View style={s.tooltip}>
        <Text style={s.tooltipVal}>{items[0].value.toFixed(1)} kg</Text>
      </View>
    ),
  }

  const cumulativePointerConfig = {
    pointerStripHeight: 150,
    pointerStripColor: '#e2e8f0',
    pointerStripWidth: 1,
    pointerColor: '#6366f1',
    radius: 6,
    pointerLabelWidth: 110,
    pointerLabelHeight: 36,
    autoAdjustPointerLabelPosition: true,
    pointerLabelComponent: (items: PointerItem[]) => (
      <View style={[s.tooltip, { borderColor: '#6366f1' }]}>
        <Text style={[s.tooltipVal, { color: '#6366f1' }]}>
          {items[0].value.toLocaleString()} kcal
        </Text>
      </View>
    ),
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>통계</Text>

        {(weightLoading || summaryLoading) && (
          <ActivityIndicator color="#3b82f6" style={s.loader} />
        )}

        {/* 체중 추이 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>체중 추이 (최근 30일)</Text>
          {weightData.length < 2 ? (
            <Text style={s.empty}>
              {weightData.length === 0 ? '체중 기록이 없습니다' : '데이터가 더 필요합니다'}
            </Text>
          ) : (
            <LineChart
              data={weightData}
              width={chartWidth}
              height={180}
              color="#3b82f6"
              thickness={2}
              curved
              hideDataPoints={weightData.length > 14}
              dataPointsColor="#3b82f6"
              dataPointsRadius={4}
              xAxisLabelTextStyle={s.axisLabel}
              yAxisTextStyle={s.axisLabel}
              noOfSections={4}
              pointerConfig={weightPointerConfig}
            />
          )}
        </View>

        {/* 일별 칼로리 적자/초과 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>일별 칼로리 적자/초과 (최근 7일)</Text>
          <View style={s.legend}>
            <View style={[s.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={s.legendText}>적자</Text>
            <View style={[s.legendDot, { backgroundColor: '#ef4444', marginLeft: 12 }]} />
            <Text style={s.legendText}>초과</Text>
          </View>
          {deltaData.length === 0 ? (
            <Text style={s.empty}>칼로리 기록이 없습니다</Text>
          ) : (
            <BarChart
              data={deltaData}
              width={chartWidth}
              height={180}
              barWidth={barW}
              spacing={12}
              xAxisLabelTextStyle={s.axisLabel}
              yAxisTextStyle={s.axisLabel}
              noOfSections={4}
              roundedTop
            />
          )}
        </View>

        {/* 누적 칼로리 적자 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>누적 칼로리 적자 (최근 30일)</Text>
          {cumulativeData.length < 2 ? (
            <Text style={s.empty}>데이터가 충분하지 않습니다</Text>
          ) : (
            <LineChart
              data={cumulativeData}
              width={chartWidth}
              height={180}
              color="#6366f1"
              thickness={2}
              curved
              hideDataPoints
              xAxisLabelTextStyle={s.axisLabel}
              yAxisTextStyle={s.axisLabel}
              noOfSections={4}
              pointerConfig={cumulativePointerConfig}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 20 },
  loader: { marginVertical: 16 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 12 },
  empty: { fontSize: 14, color: '#bbb', textAlign: 'center', paddingVertical: 32 },

  legend: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#888', marginLeft: 4 },

  axisLabel: { fontSize: 10, color: '#aaa' },

  barLabel: { fontSize: 9, fontWeight: '600', marginBottom: 2 },

  tooltip: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#3b82f6',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tooltipVal: { fontSize: 13, fontWeight: '700', color: '#3b82f6', textAlign: 'center' },
})
