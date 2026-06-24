export type Gender = 'male' | 'female' | 'other'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'late_night'
export type MeasuredTiming = 'morning' | 'afternoon' | 'evening' | 'after_workout' | 'other'
export type FeedbackType = 'daily' | 'weekly'

// ─── profiles ────────────────────────────────────────────────────────────────

export interface ProfileRow {
  id: string
  user_id: string
  height_cm: number
  current_weight_kg: number
  birth_date: string
  gender: Gender | null
  activity_level: ActivityLevel | null
  created_at: string
  updated_at: string
}

export interface ProfileInsert {
  id?: string
  user_id: string
  height_cm: number
  current_weight_kg: number
  birth_date: string
  gender?: Gender | null
  activity_level?: ActivityLevel | null
  created_at?: string
  updated_at?: string
}

export interface ProfileUpdate {
  height_cm?: number
  current_weight_kg?: number
  birth_date?: string
  gender?: Gender | null
  activity_level?: ActivityLevel | null
  updated_at?: string
}

// ─── goals ───────────────────────────────────────────────────────────────────

export interface GoalRow {
  id: string
  user_id: string
  start_weight_kg: number
  target_weight_kg: number
  start_date: string
  target_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GoalInsert {
  id?: string
  user_id: string
  start_weight_kg: number
  target_weight_kg: number
  start_date?: string
  target_date: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface GoalUpdate {
  start_weight_kg?: number
  target_weight_kg?: number
  start_date?: string
  target_date?: string
  is_active?: boolean
  updated_at?: string
}

// ─── meal_logs ───────────────────────────────────────────────────────────────

export interface MealLogRow {
  id: string
  user_id: string
  meal_date: string
  meal_type: MealType | null
  food_name: string
  calories: number
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  memo: string | null
  created_at: string
}

export interface MealLogInsert {
  id?: string
  user_id: string
  meal_date: string
  meal_type?: MealType | null
  food_name: string
  calories: number
  protein_g?: number | null
  carbs_g?: number | null
  fat_g?: number | null
  memo?: string | null
  created_at?: string
}

export interface MealLogUpdate {
  meal_date?: string
  meal_type?: MealType | null
  food_name?: string
  calories?: number
  protein_g?: number | null
  carbs_g?: number | null
  fat_g?: number | null
  memo?: string | null
}

// ─── exercise_logs ───────────────────────────────────────────────────────────

export interface ExerciseLogRow {
  id: string
  user_id: string
  exercise_date: string
  exercise_name: string
  duration_minutes: number | null
  calories_burned: number
  memo: string | null
  created_at: string
}

export interface ExerciseLogInsert {
  id?: string
  user_id: string
  exercise_date: string
  exercise_name: string
  duration_minutes?: number | null
  calories_burned: number
  memo?: string | null
  created_at?: string
}

export interface ExerciseLogUpdate {
  exercise_date?: string
  exercise_name?: string
  duration_minutes?: number | null
  calories_burned?: number
  memo?: string | null
}

// ─── weight_logs ─────────────────────────────────────────────────────────────

export interface WeightLogRow {
  id: string
  user_id: string
  weight_date: string
  weight_kg: number
  measured_timing: MeasuredTiming | null
  memo: string | null
  created_at: string
}

export interface WeightLogInsert {
  id?: string
  user_id: string
  weight_date: string
  weight_kg: number
  measured_timing?: MeasuredTiming | null
  memo?: string | null
  created_at?: string
}

export interface WeightLogUpdate {
  weight_date?: string
  weight_kg?: number
  measured_timing?: MeasuredTiming | null
  memo?: string | null
}

// ─── daily_summaries ─────────────────────────────────────────────────────────

export interface DailySummaryRow {
  id: string
  user_id: string
  summary_date: string
  total_intake_calories: number
  total_exercise_calories: number
  net_calories: number
  calorie_delta: number
  cumulative_delta: number
  estimated_weight_change_kg: number | null
  created_at: string
}

export interface DailySummaryInsert {
  id?: string
  user_id: string
  summary_date: string
  total_intake_calories?: number
  total_exercise_calories?: number
  net_calories?: number
  calorie_delta?: number
  cumulative_delta?: number
  estimated_weight_change_kg?: number | null
  created_at?: string
}

export interface DailySummaryUpdate {
  total_intake_calories?: number
  total_exercise_calories?: number
  net_calories?: number
  calorie_delta?: number
  cumulative_delta?: number
  estimated_weight_change_kg?: number | null
}

// ─── llm_parse_logs ──────────────────────────────────────────────────────────

export interface LlmParseLogRow {
  id: string
  user_id: string
  raw_input: string
  parsed_result: Record<string, unknown>
  created_at: string
}

export interface LlmParseLogInsert {
  id?: string
  user_id: string
  raw_input: string
  parsed_result: Record<string, unknown>
  created_at?: string
}

// ─── llm_feedbacks ───────────────────────────────────────────────────────────

export interface LlmFeedbackRow {
  id: string
  user_id: string
  feedback_type: FeedbackType | null
  target_date: string
  feedback: string
  created_at: string
}

export interface LlmFeedbackInsert {
  id?: string
  user_id: string
  feedback_type?: FeedbackType | null
  target_date: string
  feedback: string
  created_at?: string
}

// ─── health_workout_sync_logs ────────────────────────────────────────────────

export interface HealthWorkoutSyncLogRow {
  id: string
  user_id: string
  health_workout_id: string
  workout_type: string | null
  calories_burned: number | null
  synced_at: string
}

export interface HealthWorkoutSyncLogInsert {
  id?: string
  user_id: string
  health_workout_id: string
  workout_type?: string | null
  calories_burned?: number | null
  synced_at?: string
}

// ─── Database convenience type ────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      goals: {
        Row: GoalRow
        Insert: GoalInsert
        Update: GoalUpdate
      }
      meal_logs: {
        Row: MealLogRow
        Insert: MealLogInsert
        Update: MealLogUpdate
      }
      exercise_logs: {
        Row: ExerciseLogRow
        Insert: ExerciseLogInsert
        Update: ExerciseLogUpdate
      }
      weight_logs: {
        Row: WeightLogRow
        Insert: WeightLogInsert
        Update: WeightLogUpdate
      }
      daily_summaries: {
        Row: DailySummaryRow
        Insert: DailySummaryInsert
        Update: DailySummaryUpdate
      }
      llm_parse_logs: {
        Row: LlmParseLogRow
        Insert: LlmParseLogInsert
        Update: undefined
      }
      llm_feedbacks: {
        Row: LlmFeedbackRow
        Insert: LlmFeedbackInsert
        Update: undefined
      }
      health_workout_sync_logs: {
        Row: HealthWorkoutSyncLogRow
        Insert: HealthWorkoutSyncLogInsert
        Update: undefined
      }
    }
  }
}
