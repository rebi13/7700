import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

export interface ChipOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  options: readonly ChipOption<T>[]
  value: T | null | undefined
  onChange: (value: T | null) => void
  /** true 면 선택된 칩을 다시 눌러 해제할 수 있다 (RN 의 측정 시간대 토글 동작) */
  deselectable?: boolean
  className?: string
  'aria-label'?: string
}

/**
 * RN 의 TouchableOpacity 칩 목록을 대체하는 단일 선택 그룹.
 * 키보드 방향키 이동과 선택 상태 aria 는 Radix ToggleGroup 이 처리한다.
 */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  deselectable = false,
  className,
  'aria-label': ariaLabel,
}: Props<T>) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={2}
      aria-label={ariaLabel}
      value={value ?? ''}
      onValueChange={(next) => {
        // Radix 는 해제 시 빈 문자열을 넘긴다.
        if (next) onChange(next as T)
        else if (deselectable) onChange(null)
      }}
      className={cn('flex w-full flex-wrap justify-start', className)}
    >
      {options.map((opt) => (
        <ToggleGroupItem
          key={opt.value}
          value={opt.value}
          className="rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
