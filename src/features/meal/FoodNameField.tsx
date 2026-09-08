import { useEffect, useRef, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { MealFormData } from '@/schemas/meal'
import type { FoodRow } from '@/types/database'
import { useFoodStore } from '@/stores/foodStore'
import type { useCalorieEstimate } from '@/features/ai-log/useCalorieEstimate'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

interface Props {
  form: UseFormReturn<MealFormData>
  /** 추정 노트/상태 동기화용 (추가 폼에서만 전달) */
  ai?: ReturnType<typeof useCalorieEstimate>
}

/**
 * 음식 이름 입력란 + 저장된 음식 자동완성.
 * 입력하면 라이브러리를 접두어 검색해 아래에 후보를 보여주고, 고르면 칼로리·매크로를
 * AI 호출 없이 바로 채운다. 새 음식은 그대로 타이핑해 'AI 칼로리 추정'을 쓰면 된다.
 */
export function FoodNameField({ form, ai }: Props) {
  const suggestions = useFoodStore((s) => s.suggestions)
  const search = useFoodStore((s) => s.search)
  const clearSuggestions = useFoodStore((s) => s.clearSuggestions)
  const [open, setOpen] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 언마운트 시 남은 후보를 비운다(다른 폼에 새어 나가지 않게).
  useEffect(() => () => clearSuggestions(), [clearSuggestions])

  const runSearch = (value: string) => {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      void search(value)
    }, 200)
  }

  const pick = (food: FoodRow) => {
    form.setValue('food_name', food.display_name, { shouldValidate: true })
    form.setValue('calories', food.calories, { shouldValidate: true })
    form.setValue('protein_g', food.protein_g ?? undefined)
    form.setValue('carbs_g', food.carbs_g ?? undefined)
    form.setValue('fat_g', food.fat_g ?? undefined)
    ai?.applySaved(food)
    setOpen(false)
    clearSuggestions()
  }

  return (
    <FormField
      control={form.control}
      name="food_name"
      render={({ field }) => (
        <FormItem className="relative">
          <FormLabel>음식 이름 *</FormLabel>
          <FormControl>
            <Input
              placeholder="예: 비빔밥"
              autoComplete="off"
              {...field}
              value={field.value ?? ''}
              onChange={(e) => {
                field.onChange(e)
                runSearch(e.target.value)
                setOpen(true)
              }}
              onFocus={() => {
                if (suggestions.length > 0) setOpen(true)
              }}
              onBlur={(e) => {
                field.onBlur()
                // 항목 클릭(onMouseDown)이 먼저 처리되도록 살짝 늦춰 닫는다.
                e.persist?.()
                setTimeout(() => setOpen(false), 100)
              }}
            />
          </FormControl>

          {open && suggestions.length > 0 && (
            <ul className="absolute top-full z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
              {suggestions.map((food) => (
                <li key={food.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                    // blur 로 닫히기 전에 선택되도록 mousedown 에서 처리한다.
                    onMouseDown={(e) => {
                      e.preventDefault()
                      pick(food)
                    }}
                  >
                    <span className="truncate">{food.display_name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {food.calories.toLocaleString()} kcal
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <FormMessage />
        </FormItem>
      )}
    />
  )
}
