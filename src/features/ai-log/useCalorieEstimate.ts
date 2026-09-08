import { useCallback, useRef, useState } from 'react'
import { useAiStore, type EstimateResult } from '@/stores/aiStore'
import { useFoodStore } from '@/stores/foodStore'
import { toast } from '@/lib/toast'
import type { FoodRow } from '@/types/database'

export interface AiNote {
  text: string
  confidence: EstimateResult['confidence']
  /** ai=방금 AI 로 추정, saved=음식 라이브러리에 저장돼 있던 값 */
  source: 'ai' | 'saved'
}

/**
 * 칼로리 추정을 캐시 우선으로 처리하고 "추정 근거" 노트의 수명을 관리한다.
 * 저장된 음식이면 AI 없이 라이브러리 값으로 즉시 채우고, 처음 보는 음식만 AI 를 호출한 뒤
 * 라이브러리에 씨앗으로 남긴다. 사용자가 칼로리를 직접 수정하면 노트를 무효화한다.
 */
export function useCalorieEstimate() {
  const { estimateCalories, isEstimating } = useAiStore()
  const [note, setNote] = useState<AiNote | null>(null)
  const estimatedCalories = useRef<number | null>(null)

  const estimate = useCallback(
    async (foodName: string, mealType?: string): Promise<EstimateResult | null> => {
      if (!foodName) return null

      // 1) 캐시 우선 — 저장된 음식이면 AI 를 호출하지 않는다.
      const cached = await useFoodStore.getState().lookup(foodName)
      if (cached) {
        estimatedCalories.current = cached.calories
        setNote({
          text: cached.note ?? '',
          confidence: cached.confidence ?? 'medium',
          source: 'saved',
        })
        return {
          calories: cached.calories,
          protein_g: cached.protein_g,
          carbs_g: cached.carbs_g,
          fat_g: cached.fat_g,
          confidence: cached.confidence ?? 'medium',
          note: cached.note ?? '',
        }
      }

      // 2) 미스 → AI 호출
      const result = await estimateCalories(foodName, mealType)
      if (!result) {
        // 스토어가 이미 오류 코드를 한국어 안내로 옮겨두므로 그대로 보여준다.
        const { error } = useAiStore.getState()
        toast.error(error ?? 'AI 추정에 실패했습니다. 직접 입력해 주세요.')
        return null
      }

      estimatedCalories.current = result.calories
      setNote({ text: result.note, confidence: result.confidence, source: 'ai' })

      // 새 AI 추정을 라이브러리에 씨앗으로 저장하되, 기존(사용자 교정) 값은 덮지 않는다.
      void useFoodStore.getState().upsertFromEstimate({
        displayName: foodName,
        calories: result.calories,
        protein_g: result.protein_g,
        carbs_g: result.carbs_g,
        fat_g: result.fat_g,
        source: 'ai',
        confidence: result.confidence,
        note: result.note,
        ignoreDuplicates: true,
      })
      return result
    },
    [estimateCalories]
  )

  /** 자동완성에서 저장된 음식을 고르면 채움 상태를 맞춘다 */
  const applySaved = useCallback((food: FoodRow) => {
    estimatedCalories.current = food.calories
    setNote({
      text: food.note ?? '',
      confidence: food.confidence ?? 'medium',
      source: 'saved',
    })
  }, [])

  /** 칼로리 입력이 추정/캐시 값에서 벗어나면 노트를 무효화한다 */
  const syncCalories = useCallback((value: string) => {
    if (estimatedCalories.current === null) return
    if (Number(value) !== estimatedCalories.current) {
      setNote(null)
      estimatedCalories.current = null
    }
  }, [])

  /** 마지막 추정/캐시 값을 사용자가 그대로 뒀으면 true (저장 시 source 판단용) */
  const isPristineEstimate = useCallback((currentCalories: number) => {
    return (
      estimatedCalories.current !== null &&
      estimatedCalories.current === currentCalories
    )
  }, [])

  const reset = useCallback(() => {
    setNote(null)
    estimatedCalories.current = null
  }, [])

  return {
    note,
    isEstimating,
    estimate,
    applySaved,
    syncCalories,
    isPristineEstimate,
    reset,
  }
}
