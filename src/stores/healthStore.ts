import { create } from 'zustand'
import { Platform } from 'react-native'
import AppleHealthKit, {
  type HealthKitPermissions,
  type HealthValue,
  type HKWorkoutQueriedSampleType,
  HealthUnit,
} from 'react-native-health'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useSummaryStore } from '@/stores/summaryStore'

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

interface HealthState {
  isSyncing: boolean
  lastSyncedAt: string | null
  error: string | null
  requestPermissions: () => Promise<boolean>
  syncWorkouts: (days?: number) => Promise<{ added: number }>
  syncWeight: (days?: number) => Promise<{ added: number }>
  syncAll: (days?: number) => Promise<{ workouts: number; weights: number }>
}

export const useHealthStore = create<HealthState>((set, get) => ({
  isSyncing: false,
  lastSyncedAt: null,
  error: null,

  requestPermissions: () =>
    new Promise((resolve) => {
      if (Platform.OS !== 'ios') { resolve(false); return }
      AppleHealthKit.initHealthKit(PERMISSIONS, (err) => resolve(!err))
    }),

  syncWorkouts: async (days = 7) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId || Platform.OS !== 'ios') return { added: 0 }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const workouts = await new Promise<HKWorkoutQueriedSampleType[]>((resolve) => {
      AppleHealthKit.getAnchoredWorkouts(
        { startDate: startDate.toISOString() },
        (err, results) => resolve(err?.message ? [] : (results?.data ?? []))
      )
    })

    if (workouts.length === 0) return { added: 0 }

    const workoutIds = workouts.map((w) => w.id)
    const { data: synced } = await supabase
      .from('health_workout_sync_logs')
      .select('health_workout_id')
      .eq('user_id', userId)
      .in('health_workout_id', workoutIds)
    const syncedIds = new Set((synced ?? []).map((r) => r.health_workout_id))

    const newWorkouts = workouts.filter((w) => !syncedIds.has(w.id))
    if (newWorkouts.length === 0) return { added: 0 }

    const affectedDates = new Set<string>()
    let added = 0

    for (const w of newWorkouts) {
      const calories = Math.round(w.calories ?? 0)
      if (calories <= 0) continue

      const date = w.start.slice(0, 10)

      await supabase.from('exercise_logs').insert({
        user_id: userId,
        exercise_date: date,
        exercise_name: w.activityName ?? '운동',
        calories_burned: calories,
        duration_minutes: w.duration ? Math.round(w.duration / 60) : null,
        memo: 'Apple Health에서 가져온 기록',
      })

      await supabase.from('health_workout_sync_logs').insert({
        user_id: userId,
        health_workout_id: w.id,
        workout_type: w.activityName ?? null,
        calories_burned: calories,
      })

      affectedDates.add(date)
      added++
    }

    const calculateAndSave = useSummaryStore.getState().calculateAndSave
    for (const date of affectedDates) {
      await calculateAndSave(date)
    }

    return { added }
  },

  syncWeight: async (days = 7) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId || Platform.OS !== 'ios') return { added: 0 }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const samples = await new Promise<HealthValue[]>((resolve) => {
      AppleHealthKit.getWeightSamples(
        { startDate: startDate.toISOString(), unit: HealthUnit.gram },
        (err, results) => resolve(err ? [] : results)
      )
    })

    if (samples.length === 0) return { added: 0 }

    // Keep only the latest sample per day; convert gram → kg
    const latestByDate = new Map<string, number>()
    for (const s of samples) {
      const date = s.startDate.slice(0, 10)
      latestByDate.set(date, s.value / 1000)
    }

    const dates = [...latestByDate.keys()]
    const { data: existing } = await supabase
      .from('weight_logs')
      .select('weight_date')
      .eq('user_id', userId)
      .in('weight_date', dates)
    const existingDates = new Set((existing ?? []).map((r) => r.weight_date))

    let added = 0
    for (const [date, weight_kg] of latestByDate) {
      if (existingDates.has(date)) continue
      await supabase.from('weight_logs').insert({
        user_id: userId,
        weight_date: date,
        weight_kg: Math.round(weight_kg * 10) / 10,
        memo: 'Apple Health에서 가져온 기록',
      })
      added++
    }

    return { added }
  },

  syncAll: async (days = 7) => {
    set({ isSyncing: true, error: null })
    try {
      const [w, wt] = await Promise.all([
        get().syncWorkouts(days),
        get().syncWeight(days),
      ])
      set({ isSyncing: false, lastSyncedAt: new Date().toISOString() })
      return { workouts: w.added, weights: wt.added }
    } catch (e) {
      set({ isSyncing: false, error: (e as Error).message })
      return { workouts: 0, weights: 0 }
    }
  },
}))
