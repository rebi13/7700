import { useCallback, useEffect, useState } from 'react'
import { useMealStore } from '@/stores/mealStore'
import { useExerciseStore } from '@/stores/exerciseStore'
import { useWeightStore } from '@/stores/weightStore'
import { useSummaryStore } from '@/stores/summaryStore'
import { MealForm } from '@/features/meal/MealForm'
import { MealList } from '@/features/meal/MealList'
import { MealEditSheet } from '@/features/meal/MealEditSheet'
import { ExerciseForm } from '@/features/exercise/ExerciseForm'
import { ExerciseList } from '@/features/exercise/ExerciseList'
import { ExerciseEditSheet } from '@/features/exercise/ExerciseEditSheet'
import { WeightForm } from '@/features/weight/WeightForm'
import { WeightList } from '@/features/weight/WeightList'
import { WeightEditSheet } from '@/features/weight/WeightEditSheet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { confirmAction } from '@/lib/dom'
import { todayISO } from '@/utils/date'
import type { ExerciseLogRow, MealLogRow, WeightLogRow } from '@/types/database'

type TabType = 'meal' | 'exercise' | 'weight'

const TABS: { value: TabType; label: string }[] = [
  { value: 'meal', label: '식사' },
  { value: 'exercise', label: '운동' },
  { value: 'weight', label: '체중' },
]

export function AddLogPage() {
  const [activeTab, setActiveTab] = useState<TabType>('meal')
  const [selectedDate, setSelectedDate] = useState(todayISO())

  const fetchMealLogs = useMealStore((st) => st.fetchLogs)
  const fetchExerciseLogs = useExerciseStore((st) => st.fetchLogs)
  const fetchWeightLogs = useWeightStore((st) => st.fetchLogs)
  const deleteMealLog = useMealStore((st) => st.deleteLog)
  const deleteExerciseLog = useExerciseStore((st) => st.deleteLog)
  const deleteWeightLog = useWeightStore((st) => st.deleteLog)
  const { calculateAndSave } = useSummaryStore()

  const [editingMeal, setEditingMeal] = useState<MealLogRow | null>(null)
  const [editingExercise, setEditingExercise] = useState<ExerciseLogRow | null>(null)
  const [editingWeight, setEditingWeight] = useState<WeightLogRow | null>(null)

  useEffect(() => {
    if (activeTab === 'meal') fetchMealLogs(selectedDate)
    else if (activeTab === 'exercise') fetchExerciseLogs(selectedDate)
    else fetchWeightLogs(selectedDate)
  }, [activeTab, selectedDate, fetchMealLogs, fetchExerciseLogs, fetchWeightLogs])

  const handleDelete = useCallback(
    async (id: string, type: TabType) => {
      if (!confirmAction('삭제', '이 기록을 삭제하시겠습니까?')) return

      if (type === 'meal') {
        await deleteMealLog(id)
        await calculateAndSave(selectedDate)
      } else if (type === 'exercise') {
        await deleteExerciseLog(id)
        await calculateAndSave(selectedDate)
      } else {
        await deleteWeightLog(id)
      }
    },
    [
      deleteMealLog,
      deleteExerciseLog,
      deleteWeightLog,
      calculateAndSave,
      selectedDate,
    ]
  )

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-xl font-bold">기록 추가</h1>

      <div className="flex flex-col gap-2">
        <Label htmlFor="log-date">날짜</Label>
        <Input
          id="log-date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-auto"
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
        <TabsList className="w-full">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex-1">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="meal" className="mt-4">
          {/* key 로 날짜가 바뀔 때 폼 상태를 초기화한다 */}
          <MealForm key={selectedDate} date={selectedDate} />
        </TabsContent>
        <TabsContent value="exercise" className="mt-4">
          <ExerciseForm key={selectedDate} date={selectedDate} />
        </TabsContent>
        <TabsContent value="weight" className="mt-4">
          <WeightForm key={selectedDate} date={selectedDate} />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            기록 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTab === 'meal' && (
            <MealList
              onEdit={setEditingMeal}
              onDelete={(id) => handleDelete(id, 'meal')}
            />
          )}
          {activeTab === 'exercise' && (
            <ExerciseList
              onEdit={setEditingExercise}
              onDelete={(id) => handleDelete(id, 'exercise')}
            />
          )}
          {activeTab === 'weight' && (
            <WeightList
              onEdit={setEditingWeight}
              onDelete={(id) => handleDelete(id, 'weight')}
            />
          )}
        </CardContent>
      </Card>

      <MealEditSheet
        item={editingMeal}
        date={selectedDate}
        onClose={() => setEditingMeal(null)}
      />
      <ExerciseEditSheet
        item={editingExercise}
        date={selectedDate}
        onClose={() => setEditingExercise(null)}
      />
      <WeightEditSheet
        item={editingWeight}
        date={selectedDate}
        onClose={() => setEditingWeight(null)}
      />
    </div>
  )
}
