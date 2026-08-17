import { useCallback, useRef, useState } from 'react'
import { useAiStore, type EstimateResult } from '@/stores/aiStore'
import { notify } from '@/lib/dom'

export interface AiNote {
  text: string
  confidence: EstimateResult['confidence']
}

/**
 * AI 칼로리 추정 호출과 "추정 근거" 노트의 수명을 함께 관리한다.
 * 사용자가 추정된 칼로리 값을 직접 수정하면 노트는 더 이상 유효하지 않으므로 지운다.
 */
export function useCalorieEstimate() {
  const { estimateCalories, isEstimating } = useAiStore()
  const [note, setNote] = useState<AiNote | null>(null)
  const estimatedCalories = useRef<number | null>(null)

  const estimate = useCallback(
    async (foodName: string, mealType?: string): Promise<EstimateResult | null> => {
      if (!foodName) return null

      const result = await estimateCalories(foodName, mealType)
      if (!result) {
        notify('AI 추정 실패', 'AI 추정에 실패했습니다. 직접 입력해 주세요.')
        return null
      }

      estimatedCalories.current = result.calories
      setNote({ text: result.note, confidence: result.confidence })
      return result
    },
    [estimateCalories]
  )

  /** 칼로리 입력이 추정값에서 벗어나면 노트를 무효화한다 */
  const syncCalories = useCallback((value: string) => {
    if (estimatedCalories.current === null) return
    if (Number(value) !== estimatedCalories.current) {
      setNote(null)
      estimatedCalories.current = null
    }
  }, [])

  const reset = useCallback(() => {
    setNote(null)
    estimatedCalories.current = null
  }, [])

  return { note, isEstimating, estimate, syncCalories, reset }
}
